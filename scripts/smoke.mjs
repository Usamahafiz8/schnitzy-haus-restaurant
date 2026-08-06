/**
 * End-to-end smoke test against a running server.
 *
 *   pnpm build && pnpm start &
 *   node scripts/smoke.mjs
 *
 * Exercises the paths that involve money and state: sign-in, pricing, coupon
 * claiming, order creation, loyalty accrual, status transitions, and RBAC.
 */
const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

let failures = 0;
let checks = 0;

function check(name, condition, detail = "") {
  checks++;
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name} ${detail}`);
  }
}

/** Minimal cookie jar — enough for NextAuth's CSRF + session pair. */
function makeJar() {
  const jar = new Map();

  return {
    header: () =>
      [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; "),
    absorb: (response) => {
      const raw = response.headers.getSetCookie?.() ?? [];
      for (const cookie of raw) {
        const [pair] = cookie.split(";");
        const index = pair.indexOf("=");
        if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1));
      }
    },
  };
}

async function request(jar, path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      cookie: jar.header(),
      ...options.headers,
    },
  });
  jar.absorb(response);
  return response;
}

async function json(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 200) };
  }
}

async function signIn(email, password) {
  const jar = makeJar();

  const csrfResponse = await request(jar, "/api/auth/csrf");
  const { csrfToken } = await json(csrfResponse);

  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${BASE}/`,
    json: "true",
  });

  await request(jar, "/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const session = await json(await request(jar, "/api/auth/session"));
  return { jar, session };
}

async function main() {
  console.log(`\nSmoke testing ${BASE}\n`);

  // --- public ---------------------------------------------------------------
  console.log("Public endpoints");
  const anon = makeJar();

  const restaurant = await json(await request(anon, "/api/restaurant"));
  check("restaurant loads", restaurant.data?.name === "Schnitzy Haus", restaurant.data?.name);

  const menu = await json(await request(anon, "/api/menu?pageSize=100"));
  check("menu has items", menu.data?.total > 0, `total=${menu.data?.total}`);

  const guarded = await request(anon, "/api/loyalty");
  check("loyalty requires auth", guarded.status === 401, `got ${guarded.status}`);

  const adminGuard = await request(anon, "/api/admin/dashboard");
  check("admin API requires auth", adminGuard.status === 401, `got ${adminGuard.status}`);

  // --- customer -------------------------------------------------------------
  // A throwaway account per run keeps the suite repeatable: one-use-per-customer
  // coupons and points balances would otherwise only pass the first time.
  console.log("\nCustomer flow");
  const testEmail = `smoke-${Date.now().toString(36)}@example.test`;
  const testPassword = "SmokeTest123";

  const registration = await request(anon, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Smoke",
      lastName: "Tester",
      email: testEmail,
      phone: "+49 170 0000000",
      password: testPassword,
      confirmPassword: testPassword,
    }),
  });
  check("registration succeeds", registration.status === 201, `got ${registration.status}`);

  const { jar: customer, session } = await signIn(testEmail, testPassword);
  check("customer signs in", session.user?.email === testEmail, JSON.stringify(session).slice(0, 120));

  const welcome = await json(await request(customer, "/api/loyalty/points"));
  check("signup bonus awarded", welcome.data?.points === 100, `got ${welcome.data?.points}`);

  const loyaltyBefore = await json(await request(customer, "/api/loyalty"));
  check("loyalty summary loads", typeof loyaltyBefore.data?.points === "number", JSON.stringify(loyaltyBefore).slice(0, 120));

  const customerAdminGuard = await request(customer, "/api/admin/dashboard");
  check("customer blocked from admin API", customerAdminGuard.status === 403, `got ${customerAdminGuard.status}`);

  // Build a cart above the WILLKOMMEN10 minimum (€20) so the coupon applies.
  const available = menu.data.items.filter((item) => item.isAvailable);
  const items = [];
  let cartSubtotal = 0;
  for (const item of available) {
    if (cartSubtotal >= 25) break;
    items.push(item);
    cartSubtotal += item.discountPrice ?? item.price;
  }
  check("found orderable items over the coupon minimum", cartSubtotal >= 20, `subtotal=${cartSubtotal}`);

  const orderResponse = await request(customer, "/api/orders", {
    method: "POST",
    body: JSON.stringify({
      items: items.map((item) => ({ itemId: item.id, quantity: 1 })),
      orderType: "PICKUP",
      paymentMethod: "CASH",
      customerName: "Smoke Tester",
      customerEmail: testEmail,
      customerPhone: "+49 170 0000000",
      couponCode: "WILLKOMMEN10",
    }),
  });
  const order = await json(orderResponse);
  check("order created", orderResponse.status === 201, `${orderResponse.status} ${JSON.stringify(order).slice(0, 160)}`);
  check("order number issued", /^SH-\d{8}-\d{4}$/.test(order.data?.orderNumber ?? ""), order.data?.orderNumber);

  // Server prices from the live menu, and the coupon must have applied.
  // WILLKOMMEN10 is 10% capped at €10.
  const discount = Math.min(Math.round(cartSubtotal * 0.1 * 100) / 100, 10);
  const expectedTotal = Math.round((cartSubtotal - discount) * 100) / 100;
  check(
    "server-side pricing applied the coupon",
    Math.abs((order.data?.totalAmount ?? 0) - expectedTotal) < 0.02,
    `got ${order.data?.totalAmount}, expected ~${expectedTotal}`,
  );
  check("cash order auto-confirmed", order.data?.status === "CONFIRMED", order.data?.status);

  const detail = await json(await request(customer, `/api/orders/${order.data.id}`));
  check("order detail readable by owner", detail.data?.id === order.data.id);

  // A second customer must not be able to read it.
  const { jar: otherCustomer } = await signIn("sam@example.com", "Password123");
  const foreign = await request(otherCustomer, `/api/orders/${order.data.id}`);
  check("other customer blocked from order", foreign.status === 403, `got ${foreign.status}`);

  // Same coupon twice should be refused (perUserLimit = 1).
  const reuse = await request(customer, "/api/orders", {
    method: "POST",
    body: JSON.stringify({
      items: items.map((item) => ({ itemId: item.id, quantity: 1 })),
      orderType: "PICKUP",
      paymentMethod: "CASH",
      customerName: "Smoke Tester",
      customerEmail: testEmail,
      customerPhone: "+49 170 0000000",
      couponCode: "WILLKOMMEN10",
    }),
  });
  check("per-user coupon limit enforced", reuse.status === 400, `got ${reuse.status}`);

  // --- staff ----------------------------------------------------------------
  console.log("\nStaff flow");
  const { jar: admin, session: adminSession } = await signIn(
    "admin@schnitzyhaus.de",
    "Password123",
  );
  check("admin signs in", adminSession.user?.role === "ADMIN", adminSession.user?.role);

  const dashboard = await json(await request(admin, "/api/admin/dashboard"));
  check("dashboard stats load", typeof dashboard.data?.stats?.todayOrders === "number");

  const analytics = await json(await request(admin, "/api/admin/analytics"));
  check("analytics load", Array.isArray(analytics.data?.series), JSON.stringify(analytics).slice(0, 120));
  check("best sellers computed", Array.isArray(analytics.data?.topItems));

  // Walk the order forward through the legal transitions.
  for (const status of ["PREPARING", "READY", "DELIVERED"]) {
    const move = await request(admin, `/api/orders/${order.data.id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    check(`status -> ${status}`, move.status === 200, `got ${move.status}`);
  }

  // And confirm an illegal one is rejected.
  const illegal = await request(admin, `/api/orders/${order.data.id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: "PREPARING" }),
  });
  check("illegal transition rejected", illegal.status === 409, `got ${illegal.status}`);

  const csv = await request(admin, "/api/admin/reports/sales");
  check("CSV report exports", csv.status === 200 && csv.headers.get("content-type")?.includes("csv"));

  // --- booking --------------------------------------------------------------
  console.log("\nBooking flow");
  const date = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);
  const availability = await json(
    await request(customer, `/api/bookings/availability?date=${date}&guests=2`),
  );
  const slot = availability.data?.slots?.find((s) => s.available);
  check("availability returns a free slot", Boolean(slot), JSON.stringify(availability).slice(0, 120));

  if (slot) {
    const booking = await request(customer, "/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        numberOfGuests: 2,
        bookingDate: date,
        bookingTime: slot.time,
        customerName: "Smoke Tester",
        customerEmail: testEmail,
        customerPhone: "+49 170 0000000",
      }),
    });
    const bookingBody = await json(booking);
    check("booking created", booking.status === 201, `${booking.status} ${JSON.stringify(bookingBody).slice(0, 160)}`);
    check("table assigned", Boolean(bookingBody.data?.tableNumber), bookingBody.data?.tableNumber);

    // An impossible party size must be refused.
    const tooBig = await request(customer, "/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        numberOfGuests: 50,
        bookingDate: date,
        bookingTime: slot.time,
        customerName: "Smoke Tester",
        customerEmail: testEmail,
        customerPhone: "+49 170 0000000",
      }),
    });
    check("oversized party refused", tooBig.status === 400, `got ${tooBig.status}`);
  }

  // --- validation -----------------------------------------------------------
  console.log("\nValidation");
  const bad = await request(customer, "/api/orders", {
    method: "POST",
    body: JSON.stringify({ items: [], orderType: "PICKUP" }),
  });
  check("empty cart rejected with 422", bad.status === 422, `got ${bad.status}`);

  const badEmail = await request(anon, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "A",
      lastName: "B",
      email: "not-an-email",
      password: "short",
      confirmPassword: "short",
    }),
  });
  check("registration validates input", badEmail.status === 422, `got ${badEmail.status}`);

  // --- i18n -----------------------------------------------------------------
  console.log("\nInternationalisation");
  const german = await fetch(`${BASE}/menu`, {
    headers: { cookie: "schnitzy_locale=de" },
  });
  const germanHtml = await german.text();
  check("German locale renders", germanHtml.includes("Speisekarte"), "missing 'Speisekarte'");
  check("html lang is de", germanHtml.includes('lang="de"'));

  const english = await fetch(`${BASE}/menu`);
  const englishHtml = await english.text();
  check("English locale renders", englishHtml.includes("Menu"));

  // --- summary --------------------------------------------------------------
  console.log(
    `\n${failures === 0 ? "PASS" : "FAIL"} — ${checks - failures}/${checks} checks passed\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("\nSmoke test crashed:", error);
  process.exit(1);
});

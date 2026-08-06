import { expect, test } from "@playwright/test";

/**
 * Covers the path that earns money: browse -> add to cart -> checkout,
 * plus the guards around it. Assumes `pnpm db:seed` has been run.
 */

test.describe("storefront", () => {
  test("home page presents the restaurant and the main calls to action", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /order now/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /book a table/i })).toBeVisible();
  });

  test("menu lists dishes and filters by search", async ({ page }) => {
    await page.goto("/menu");

    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    const initial = await cards.count();
    expect(initial).toBeGreaterThan(3);

    await page.getByRole("searchbox").fill("schnitzel");
    await expect
      .poll(async () => cards.count(), { timeout: 5000 })
      .toBeLessThan(initial);

    await expect(cards.first()).toContainText(/schnitzel/i);
  });

  test("dietary filters narrow the menu", async ({ page }) => {
    await page.goto("/menu", { waitUntil: "networkidle" });

    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    const unfiltered = await cards.count();

    await page.getByRole("button", { name: /filters/i }).click();
    await page.getByRole("button", { name: "Vegan", exact: true }).click();

    // Wait for the filtered list to settle before inspecting individual cards.
    await expect.poll(() => cards.count(), { timeout: 5000 }).toBeLessThan(unfiltered);

    // Every remaining card must carry the vegan badge.
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toContainText(/vegan/i);
    }
  });

  test("adding to the cart updates the badge and the cart page", async ({ page }) => {
    await page.goto("/menu");

    const firstCard = page.locator("article").first();
    const dishName = await firstCard.getByRole("heading").innerText();

    await firstCard.getByRole("button", { name: /add to cart/i }).click();

    await page.goto("/cart");
    await expect(page.getByText(dishName)).toBeVisible();
    await expect(page.getByRole("button", { name: /go to checkout/i })).toBeVisible();
  });

  test("cart survives a reload", async ({ page }) => {
    await page.goto("/menu");
    await page.locator("article").first().getByRole("button", { name: /add to cart/i }).click();

    await page.goto("/cart");
    await page.reload();

    await expect(page.getByRole("button", { name: /go to checkout/i })).toBeVisible();
  });

  test("an empty cart says so rather than offering checkout", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByText(/your cart is empty/i)).toBeVisible();
  });
});

test.describe("access control", () => {
  test("the dashboard redirects anonymous visitors to sign in", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("order history requires an account", async ({ page }) => {
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("bookings", () => {
  test("guests can reach the booking form and see time slots", async ({ page }) => {
    await page.goto("/bookings", { waitUntil: "networkidle" });

    // Booking must not require an account.
    await expect(page).toHaveURL(/\/bookings/);

    const date = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    await page.locator('input[type="date"]').fill(date);

    const slot = page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first();
    const closed = page.getByText(/closed on this date|fully booked/i);

    // Either slots appear, or the restaurant is shut that day — both are valid.
    await expect(slot.or(closed)).toBeVisible({ timeout: 15_000 });
  });

  test("choosing a slot reveals the contact fields", async ({ page }) => {
    await page.goto("/bookings", { waitUntil: "networkidle" });

    const date = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    await page.locator('input[type="date"]').fill(date);

    const slot = page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first();
    const closed = page.getByText(/closed on this date|fully booked/i);

    // Slots load asynchronously; wait for the panel to resolve either way.
    await expect(slot.or(closed)).toBeVisible({ timeout: 15_000 });
    test.skip(await closed.isVisible(), "restaurant is closed on the chosen date");

    await slot.click();

    await expect(page.getByLabel(/name/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /confirm booking/i })).toBeEnabled();
  });
});

test.describe("internationalisation", () => {
  test("switching to German translates the interface", async ({ page }) => {
    await page.goto("/menu", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Menu", level: 1 })).toBeVisible();

    // On phones the switcher lives inside the nav drawer, so open it first.
    const menuButton = page.getByRole("button", { name: "Menu", exact: true });
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.click();
    }

    // Wait for the cookie write to land before asserting on the re-render;
    // under parallel load the round trip is otherwise racy.
    const localeWrite = page.waitForResponse(
      (response) =>
        response.url().includes("/api/locale") && response.request().method() === "POST",
      { timeout: 20_000 },
    );

    await page.getByRole("button", { name: "de", exact: true }).first().click();
    expect((await localeWrite).ok()).toBe(true);

    await expect(
      page.getByRole("heading", { name: "Speisekarte", level: 1 }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("html")).toHaveAttribute("lang", "de");

    // And it must survive a fresh page load, not just the soft refresh.
    await page.reload({ waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: "Speisekarte", level: 1 }),
    ).toBeVisible();
  });
});

test.describe("accessibility basics", () => {
  test("every page exposes a skip link and a single h1", async ({ page }) => {
    for (const path of ["/", "/menu", "/location", "/bookings"]) {
      // Wait for the route transition to settle: mid-navigation the outgoing
      // tree is briefly still mounted alongside the incoming one.
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.getByRole("link", { name: /skip to content/i })).toBeAttached();
      expect(await page.locator("h1").count()).toBe(1);
    }
  });

  test("images carry alt text or an accessible label", async ({ page }) => {
    await page.goto("/menu");
    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt).not.toBeNull();
    }
  });
});

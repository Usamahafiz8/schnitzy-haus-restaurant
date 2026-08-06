import { expect, test, type Page } from "@playwright/test";

/**
 * Covers the path that earns money: browse -> add to cart -> checkout, plus the
 * guards around it. Assumes `pnpm db:seed` has been run.
 *
 * German is the site's default, so tests pin the locale cookie explicitly
 * rather than depending on that default staying put.
 */

async function useLocale(page: Page, locale: "de" | "en") {
  await page.context().addCookies([
    {
      name: "schnitzy_locale",
      value: locale,
      url: page.url().startsWith("http") ? new URL(page.url()).origin : "http://localhost:3000",
    },
  ]);
}

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([
    { name: "schnitzy_locale", value: "de", url: baseURL ?? "http://localhost:3000" },
  ]);
});

test.describe("storefront", () => {
  test("home page presents the brand and the main calls to action", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/premium/i);
    // Hero CTA (German) and the header CTA (English, per the brand's styling).
    await expect(page.getByRole("link", { name: /jetzt bestellen/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /order now/i }).first()).toBeVisible();
  });

  test("landing page shows the four highlighted dishes in menu order", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const tiles = page.locator("article");
    await expect(tiles).toHaveCount(4);
    await expect(tiles.first()).toContainText(/schnitzel burger/i);
    // Prices render in German format.
    await expect(tiles.first()).toContainText("€");
  });

  test("delivery partners are listed", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    for (const partner of ["Lieferando", "Uber Eats", "Wolt"]) {
      await expect(page.getByRole("img", { name: partner })).toBeVisible();
    }
  });

  test("menu lists dishes and filters by search", async ({ page }) => {
    await page.goto("/menu", { waitUntil: "networkidle" });

    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    const initial = await cards.count();
    expect(initial).toBeGreaterThan(3);

    await page.getByRole("searchbox").fill("burger");
    await expect.poll(() => cards.count(), { timeout: 5000 }).toBeLessThan(initial);
    await expect(cards.first()).toContainText(/burger/i);
  });

  test("dietary filters narrow the menu", async ({ page }) => {
    await page.goto("/menu", { waitUntil: "networkidle" });

    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    const unfiltered = await cards.count();

    await page.getByRole("button", { name: /^filter$/i }).click();
    await page.getByRole("button", { name: "Vegan", exact: true }).click();

    await expect.poll(() => cards.count(), { timeout: 5000 }).toBeLessThan(unfiltered);

    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toContainText(/vegan/i);
    }
  });

  test("adding to the cart updates the cart page", async ({ page }) => {
    await page.goto("/menu", { waitUntil: "networkidle" });

    const firstCard = page.locator("article").first();
    const dishName = await firstCard.getByRole("heading").innerText();

    await firstCard.getByRole("button", { name: /in den warenkorb/i }).click();

    await page.goto("/cart", { waitUntil: "networkidle" });
    await expect(page.getByText(new RegExp(dishName, "i")).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /zur kasse/i })).toBeVisible();
  });

  test("cart survives a reload", async ({ page }) => {
    await page.goto("/menu", { waitUntil: "networkidle" });
    await page
      .locator("article")
      .first()
      .getByRole("button", { name: /in den warenkorb/i })
      .click();

    await page.goto("/cart", { waitUntil: "networkidle" });
    await page.reload({ waitUntil: "networkidle" });

    await expect(page.getByRole("button", { name: /zur kasse/i })).toBeVisible();
  });

  test("an empty cart says so rather than offering checkout", async ({ page }) => {
    await page.goto("/cart", { waitUntil: "networkidle" });
    await expect(page.getByText(/warenkorb ist leer/i)).toBeVisible();
  });
});

test.describe("secondary pages", () => {
  test("every page in the nav resolves", async ({ page }) => {
    for (const path of ["/about", "/contact", "/locations"]) {
      const response = await page.goto(path, { waitUntil: "networkidle" });
      expect(response?.status(), `${path} should be 200`).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("every legal page in the footer resolves", async ({ page }) => {
    const legal = [
      "/impressum",
      "/datenschutz",
      "/agb",
      "/widerrufsrecht",
      "/lieferung-zahlung",
    ];

    for (const path of legal) {
      const response = await page.goto(path, { waitUntil: "networkidle" });
      expect(response?.status(), `${path} should be 200`).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("the footer carries the Frankfurt address", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const footer = page.locator("footer");
    await expect(footer).toContainText("Berger Straße 123");
    await expect(footer).toContainText("60316 Frankfurt am Main");
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
    await expect(page).toHaveURL(/\/bookings/);

    const date = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    await page.locator('input[type="date"]').fill(date);

    const slot = page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first();
    const closed = page.getByText(/geschlossen|ausgebucht/i);

    await expect(slot.or(closed)).toBeVisible({ timeout: 15_000 });
  });

  test("choosing a slot reveals the contact fields", async ({ page }) => {
    await page.goto("/bookings", { waitUntil: "networkidle" });

    const date = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    await page.locator('input[type="date"]').fill(date);

    const slot = page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first();
    const closed = page.getByText(/geschlossen|ausgebucht/i);

    await expect(slot.or(closed)).toBeVisible({ timeout: 15_000 });
    test.skip(await closed.isVisible(), "restaurant is closed on the chosen date");

    await slot.click();
    await expect(
      page.getByRole("button", { name: /reservierung bestätigen/i }),
    ).toBeEnabled();
  });
});

test.describe("internationalisation", () => {
  test("German is the default", async ({ page }) => {
    await page.goto("/menu", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Speisekarte", level: 1 })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
  });

  test("switching to English translates the interface", async ({ page }) => {
    await useLocale(page, "de");
    await page.goto("/menu", { waitUntil: "networkidle" });

    // The switcher sits in the footer on every viewport.
    const toggle = page.locator("footer").getByRole("button", { name: "en", exact: true });
    await toggle.scrollIntoViewIfNeeded();

    const localeWrite = page.waitForResponse(
      (r) => r.url().includes("/api/locale") && r.request().method() === "POST",
      { timeout: 20_000 },
    );

    await toggle.click();
    expect((await localeWrite).ok()).toBe(true);

    await expect(page.getByRole("heading", { name: "Menu", level: 1 })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // And it must survive a fresh page load, not just the soft refresh.
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Menu", level: 1 })).toBeVisible();
  });
});

test.describe("accessibility basics", () => {
  test("every page exposes a skip link and a single h1", async ({ page }) => {
    for (const path of ["/", "/menu", "/about", "/contact", "/locations", "/bookings"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.getByRole("link", { name: /skip to content/i })).toBeAttached();
      expect(await page.locator("h1").count(), `${path} should have one h1`).toBe(1);
    }
  });

  test("images carry alt text or an accessible label", async ({ page }) => {
    await page.goto("/menu", { waitUntil: "networkidle" });
    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      expect(await images.nth(i).getAttribute("alt")).not.toBeNull();
    }
  });
});

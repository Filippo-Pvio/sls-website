import { test, expect } from "playwright/test";
import { mkdir } from "node:fs/promises";

const routes = ["/", "/verkaufen/", "/immobilien/", "/ueber-uns/", "/kontakt/"];

test("property detail follows the agreed section order and leaves inquiries disabled", async ({ page }) => {
  const property = {
    id: "3528391", title: "Testimmobilie", zip: "46348", city: "Raesfeld", type: "Wohnung",
    price: 233000, rooms: 2, area: 75, status: "Vermarktung", inquiryEnabled: false,
    description: "Objektbeschreibung", features: "Ausstattungstext", otherNote: "Sonstiges",
    location: "Lagebeschreibung", amenities: ["Balkon"],
    objectFacts: [{ label: "Objekttyp", value: "Wohnung" }],
    energy: { kind: "Verbrauchsausweis", value: 84.4, fuel: "Gas", buildingYear: 2002, rating: "C" },
    floorplanImages: [{ title: "Erdgeschoss", preview: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" }],
    tour: "https://tour.example.org/1", tourEmbed: false
  };
  await page.route("**/api/propstack-test-properties**", route => route.fulfill({ json: { items: [property] } }));
  await page.goto("/immobilien-test/?objekt=3528391", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pp-detail-main > .pp-panel").first()).toBeVisible();
  const headings = await page.locator(".pp-detail-main > .pp-panel > h2, .pp-detail-main > .pp-panel > .pp-section-lead > h2").allTextContents();
  expect(headings).toEqual([
    "Kaufpreis & Provision", "Eckdaten", "Energieausweis", "Objektdaten", "Objektbeschreibung",
    "Ausstattung", "Merkmale", "Weitere Informationen", "Grundrisse", "Virtueller Rundgang",
    "Lagebeschreibung", "Lage auf der Karte", "Finanzierungsrechner"
  ]);
  await expect(page.locator("#pp-inquiry button[type=submit]")).toBeDisabled();
});

for (const [index, route] of routes.entries()) {
  test(`${route} loads without browser or layout errors`, async ({ page }, testInfo) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response.status()).toBeLessThan(400);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("nav")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
    for (const image of await page.locator("img:visible").all()) expect(await image.evaluate((img) => img.complete && img.naturalWidth > 0)).toBeTruthy();
    await mkdir("qa-artifacts/screenshots", { recursive: true });
    await page.screenshot({ path: `qa-artifacts/screenshots/${testInfo.project.name}-${String(index + 1).padStart(2, "0")}-${route === "/" ? "start" : route.replaceAll("/", "")}.png`, fullPage: true });
  });
}

test("mobile navigation opens, closes and survives viewport changes", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile-only interaction");
  await page.goto("/");
  const toggle = page.locator(".menu-toggle");
  const nav = page.locator("#site-nav");

  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(nav).toHaveAttribute("aria-hidden", "true");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toHaveAttribute("aria-label", "Menü schließen");
  await expect(nav).toHaveClass(/is-open/);
  await expect(nav).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("body")).toHaveClass(/menu-open/);

  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(nav).not.toHaveClass(/is-open/);
  await expect(toggle).toBeFocused();

  await toggle.click();
  await page.setViewportSize({ width: 1100, height: 900 });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(nav).not.toHaveAttribute("aria-hidden");
  await expect(nav).not.toHaveAttribute("inert");
});

test("contact form is operable but does not claim delivery", async ({ page }) => {
  await page.goto("/kontakt/");
  await page.selectOption("#request", { label: "Immobilie bewerten" });
  await page.fill("#name", "QA Test");
  await page.fill("#phone", "02369 7428020");
  await page.fill("#email", "qa@example.com");
  await page.check("#privacy");
  await page.click('button[type="submit"]');
  await expect(page.locator("[data-form-status]")).toBeVisible();
  await expect(page.locator("[data-form-status]")).toContainText("nichts versendet");
});

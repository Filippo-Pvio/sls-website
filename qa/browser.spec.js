import { test, expect } from "playwright/test";
import { mkdir } from "node:fs/promises";

const routes = ["/", "/verkaufen/", "/immobilien/", "/ueber-uns/", "/kontakt/"];

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

test("mobile navigation opens", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile-only interaction");
  await page.goto("/");
  const toggle = page.locator(".menu-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#site-nav")).toHaveClass(/is-open/);
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

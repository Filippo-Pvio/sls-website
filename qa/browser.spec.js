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

test("contact form adapts to the topic and records callback preference", async ({ page }) => {
  let submitted;
  await page.route("**/api/propstack-contact-request", async route => {
    if (route.request().method() === "GET") return route.fulfill({json:{token:"fixture-token",availableTopics:["sale","search","valuation","general"],callbackAvailable:true}});
    submitted = route.request().postDataJSON();
    await route.fulfill({json:{ok:true}});
  });
  await page.goto("/kontakt/");
  await page.locator('input[name="topic"][value="valuation"]').check({force:true});
  await expect(page.locator("#contact-form-title")).toContainText("Wert Ihrer Immobilie");
  await page.locator('[name="firstName"]').fill("Anna");
  await page.locator('[name="lastName"]').fill("Muster");
  await page.locator('[name="email"]').fill("qa@example.org");
  await expect(page.locator("#contact-callback")).toBeHidden();
  await page.locator('[name="method"][value="callback"]').check();
  await expect(page.locator("#contact-callback")).toBeVisible();
  await page.locator('[name="phone"]').fill("02369 7428020");
  await page.locator('[name="window"]').selectOption("late");
  await page.locator('[name="privacy"]').check();
  await page.locator('#contact-form [type="submit"]').click();
  await expect(page.locator("#contact-status")).toContainText("Rückrufwunsch");
  expect(submitted).toMatchObject({topic:"valuation",method:"callback",window:"late",privacy:true});
  await expect(page.locator('#contact-form [type="submit"]')).toBeDisabled();
});

test("contact email option omits callback fields and general message is required", async ({ page }) => {
  let submitted;
  await page.route("**/api/propstack-contact-request", async route => {
    if (route.request().method() === "GET") return route.fulfill({json:{token:"fixture-token",availableTopics:["sale","search","valuation","general"],callbackAvailable:true}});
    submitted=route.request().postDataJSON();await route.fulfill({json:{ok:true}});
  });
  await page.goto("/kontakt/");
  await page.locator('input[name="topic"][value="general"]').check({force:true});
  await expect(page.locator('[name="message"]')).toHaveAttribute("required", "");
  await expect(page.locator("#contact-place-label")).toBeHidden();
  await page.locator('[name="firstName"]').fill("Anna");
  await page.locator('[name="lastName"]').fill("Muster");
  await page.locator('[name="email"]').fill("qa@example.org");
  await page.locator('[name="message"]').fill("Bitte beantworten Sie meine Frage per E-Mail.");
  await page.locator('[name="privacy"]').check();
  await page.locator('#contact-form [type="submit"]').click();
  await expect(page.locator("#contact-status")).toContainText("per E-Mail");
  expect(submitted.phone).toBeUndefined();expect(submitted.window).toBeUndefined();
});

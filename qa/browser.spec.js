import { test, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";

const routes = ["/", "/verkaufen/", "/immobilien/", "/ueber-uns/", "/kontakt/"];

for (const [index, route] of routes.entries()) {
  test(`${route} loads without browser or layout errors`, async ({ page }, testInfo) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response.status()).toBeLessThan(400);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator(".footer-legal nav")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
    for (const image of await page.locator("img:visible[src]").all()) expect(await image.evaluate((img) => img.complete && img.naturalWidth > 0)).toBeTruthy();
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
  await page.route("**/api/propstack-contact-request**", async route => {
    if(new URL(route.request().url()).searchParams.has("formSecurity"))return route.fulfill({json:{securityToken:"synthetic-security-token"}});
    if (route.request().method() === "GET") return route.fulfill({json:{token:"fixture-token",availableTopics:["sale","search","valuation","general"],callbackAvailable:true}});
    submitted = route.request().postDataJSON();
    await route.fulfill({json:{ok:true}});
  });
  await page.goto("/kontakt/");
  await page.locator('select[name="topic"]').selectOption("valuation");
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
  await page.route("**/api/propstack-contact-request**", async route => {
    if(new URL(route.request().url()).searchParams.has("formSecurity"))return route.fulfill({json:{securityToken:"synthetic-security-token"}});
    if (route.request().method() === "GET") return route.fulfill({json:{token:"fixture-token",availableTopics:["sale","search","valuation","general"],callbackAvailable:true}});
    submitted=route.request().postDataJSON();await route.fulfill({json:{ok:true}});
  });
  await page.goto("/kontakt/");
  await page.locator('select[name="topic"]').selectOption("general");
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

test('secure PDF flow asks for email code before completing the request',async({page})=>{
 const requests=[];
 await page.route('**/api/sales-check-report**',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{securityToken:'synthetic-security-token'}});
  const body=route.request().postDataJSON();requests.push(body);
  return route.fulfill({json:body.verificationCode?{ok:true}:{ok:true,status:'email_confirmation_required',verificationRef:'synthetic-verification-reference',message:'Bitte geben Sie den Bestätigungscode aus Ihrer E-Mail ein.'}});
 });
 await page.goto('/verkaufscheck/');
 for(let i=0;i<45;i++){
  if(await page.locator('[data-sales-report-form]').count())break;
  const title=page.locator('[data-wizard-title]'),previous=await title.textContent();
  await page.locator('[data-wizard-options] button').first().click();
  if(await page.locator('[data-wizard-next]').isVisible())await page.locator('[data-wizard-next]').click();
  else await expect(title).not.toHaveText(previous);
 }
 const form=page.locator('[data-sales-report-form]');await expect(form).toBeVisible();
 await form.locator('[name=firstName]').fill('Anna');await form.locator('[name=lastName]').fill('Muster');await form.locator('[name=email]').fill('synthetic@example.org');await form.locator('[name=consent]').check();await form.locator('[type=submit]').click();
 await expect(form.locator('[name=verificationCode]')).toBeVisible();expect(requests).toHaveLength(1);expect(requests[0].privacy).toBe(true);expect(requests[0].securityToken).toBe('synthetic-security-token');
 await form.locator('[name=verificationCode]').fill('123456');await form.locator('[type=submit]').click();
 await expect(form.locator('[data-sales-report-status]')).toContainText('angenommen');expect(requests).toHaveLength(2);expect(requests[1].verificationRef).toBe('synthetic-verification-reference');expect(requests[1].verificationCode).toBe('123456');
});

test('external calculators make no provider request before activation',async({page})=>{
 const external=[];page.on('request',request=>{if(/pricehubble|justhome/.test(new URL(request.url()).hostname))external.push(request.url());});
 await page.goto('/immobilienbewertung/');await expect(page.getByRole('button',{name:'Bewertungsrechner laden'})).toBeVisible();expect(external).toEqual([]);
 await page.goto('/finanzierung/');await expect(page.getByRole('button',{name:'Finanzierungsrechner laden'})).toBeVisible();expect(external).toEqual([]);
});


test('property embeds wait for activation and load under the deployed CSP',async({page})=>{
 const config=JSON.parse(await readFile('vercel.json','utf8'));
 const csp=config.headers.flatMap(group=>group.headers).find(header=>header.key==='Content-Security-Policy').value;
 const providers=[];
 await page.route('**/immobilien-test/?objekt=17',async route=>{const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),'content-security-policy':csp}});});
 await page.route('**/api/propstack-properties**',route=>route.fulfill({json:{items:[{id:'17',title:'Testimmobilie',city:'Lünen',zip:'44534',images:['/assets/images/hero.webp'],tour:'https://tour.sls.de/syF2',tourEmbed:true,broker:{},inquiryEnabled:false}]}}));
 await page.route(/https:\/\/(tour\.sls\.de|www\.google\.com|calculator\.justhome\.com)\//,route=>{providers.push(new URL(route.request().url()).hostname);return route.fulfill({contentType:'text/html',body:'<h1>Externer Inhalt geladen</h1>'});});
 await page.goto('/immobilien-test/?objekt=17');
 await expect(page.getByRole('button',{name:'Rundgang starten',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Karte anzeigen',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Finanzierungsrechner laden',exact:true})).toBeVisible();
 expect(providers).toEqual([]);
 await expect(page.locator('.pp-tour-frame')).toBeHidden();
 await expect(page.locator('.pp-map-frame')).toBeHidden();
 await expect(page.locator('.pp-financing iframe')).toBeHidden();
 for(const [label,selector,host] of [['Rundgang starten','.pp-tour-frame','tour.sls.de'],['Karte anzeigen','.pp-map-frame','www.google.com'],['Finanzierungsrechner laden','.pp-financing iframe','calculator.justhome.com']]){
  await page.getByRole('button',{name:label,exact:true}).click();
  await expect(page.frameLocator(selector).getByRole('heading',{name:'Externer Inhalt geladen'})).toBeVisible();
  expect(providers).toContain(host);
 }
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});

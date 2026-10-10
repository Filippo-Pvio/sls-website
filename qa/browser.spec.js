import { test, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";

const routes = ["/", "/verkaufen/", "/immobilien/", "/ueber-uns/", "/kontakt/"];

test('profile video galleries show interviews above a growing row and support navigation', async ({ page }, testInfo) => {
  await page.route('https://www.instagram.com/reel/*/embed/', route => route.fulfill({ contentType: 'text/html', body: '<h1>Instagram-Reel</h1>' }));
  await page.route('https://www.youtube-nocookie.com/embed/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>YouTube-Video</h1>' }));
  for (const slug of ['filippo-livera', 'mischa-stratmann', 'dennis-sahlmen']) {
    await page.goto(`/team/${slug}/`);
    const interview = page.locator('.profile-interview-feature');
    const gallery = page.locator('[data-profile-video-gallery]');
    expect(await interview.evaluate(el => el.compareDocumentPosition(document.querySelector('[data-profile-video-gallery]')) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
    expect(await interview.evaluate(el => el.parentElement === document.querySelector('[data-profile-video-gallery]').parentElement)).toBeTruthy();
    await expect(interview).toContainText('Im Gespräch mit STILPUNKTE');
    await expect(interview).toContainText('Interview lesen');
    await expect(gallery).toHaveCount(1);
  }
  await page.goto('/team/mischa-stratmann/');
  const gallery = page.locator('[data-profile-video-gallery]');
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery.locator('.profile-video-card')).toHaveCount(3);
  await expect(gallery.locator('.profile-video-card[hidden]')).toHaveCount(0);
  const track = gallery.locator('[data-video-track]');
  const metrics = await track.evaluate(el => ({ width: el.clientWidth, card: el.firstElementChild.clientWidth, max: el.scrollWidth-el.clientWidth, right: el.getBoundingClientRect().right }));
  expect(metrics.right).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  if (testInfo.project.name.includes('desktop')) expect(metrics.width / metrics.card).toBeGreaterThan(2);
  if (testInfo.project.name.includes('mobile')) {
    expect(metrics.card).toBeLessThan(metrics.width);
    expect(metrics.card).toBeGreaterThan(metrics.width * .8);
  }
  if (metrics.max > 2) {
    await gallery.locator('[data-video-next]').click();
    await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(Math.min(20, metrics.max - 1));
    await track.focus();
    await page.keyboard.press('End');
    await expect(gallery.locator('[data-video-next]')).toBeDisabled();
    await page.keyboard.press('Home');
    await expect(gallery.locator('[data-video-prev]')).toBeDisabled();
  }
  await gallery.locator('[data-video-id]').first().click();
  await expect(gallery.locator('iframe[src*="youtube-nocookie"]')).toHaveCount(1);
  await page.locator('.profile-final').scrollIntoViewIfNeeded();
  await expect(gallery.locator('iframe')).toHaveCount(0);
});

test('profile video galleries support native mobile swiping and vertical page scrolling', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Touch-only interaction');
  await page.route('https://www.instagram.com/reel/*/embed/', route => route.fulfill({ contentType: 'text/html', body: '<h1>Instagram-Reel</h1>' }));
  await page.goto('/team/mischa-stratmann/');
  const gallery = page.locator('[data-profile-video-gallery]');
  const copy = gallery.locator('.profile-media-copy').first();
  await copy.scrollIntoViewIfNeeded();
  const bounds = await copy.boundingBox();
  const session = await page.context().newCDPSession(page);
  const y = bounds.y + bounds.height - 25, x = bounds.x + bounds.width - 35;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 8; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - step * 25, y }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => gallery.locator('[data-video-track]').evaluate(el => el.scrollLeft)).toBeGreaterThan(100);
  const before = await page.evaluate(() => scrollY);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 8, y: 650 }] });
  for (let step = 1; step <= 8; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 8, y: 650 - step * 35 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100);
});

test('profile video galleries load single reels and adapt automatically when another video is added', async ({ page }) => {
  const errors=[];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://www.instagram.com/reel/*/embed/', route => route.fulfill({ contentType: 'text/html', body: '<h1>Instagram-Reel</h1>' }));
  for (const [slug,id] of [['sophia-peter','DeO1bzzoqUZ'],['nico-hryn','Db-cAAqsIXN'],['tanja-wawrosch','DcvKnD9IxIc']]) {
    await page.goto(`/team/${slug}/`);
    const gallery=page.locator('[data-profile-video-gallery]');
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery.locator('iframe')).toHaveAttribute('src',`https://www.instagram.com/reel/${id}/embed/`);
    await expect(gallery.locator('[data-video-controls]')).toBeHidden();
  }
  // Exercise a future second video without adding another employee-specific script.
  await page.route('**/team/sophia-peter/', async route => {
    const response=await route.fetch();
    const html=await response.text();
    const card=html.match(/<article class="profile-video-card"[^>]*data-video-provider="instagram"[\s\S]*?<\/article>/)[0];
    await route.fulfill({response,body:html.replace(card,card+card.replaceAll('DeO1bzzoqUZ','DZhMEJLs8i2'))});
  });
  await page.goto('/team/sophia-peter/');
  const gallery=page.locator('[data-profile-video-gallery]');
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery).toHaveClass(/has-multiple-videos/);
  await expect(gallery.locator('[data-video-controls]')).toBeVisible();
  await expect(gallery.locator('.profile-video-card')).toHaveCount(2);
  for (const slug of ['uwe-braun','maximilian-werner','dennis-sahlmen']) {
    await page.goto(`/team/${slug}/`);
    await expect(page.locator('[data-profile-video-gallery] .profile-video-card')).toHaveCount(1);
    await expect(page.locator('[data-video-controls]')).toBeHidden();
  }
  expect(errors).toEqual([]);
});

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


// Mock provider responses so automatic loading never submits real customer data.
const mockValuationScript="window.FisherWidget={init(options){document.querySelector(options.iframe).src='https://fisher.pricehubble.com/?qa=1';}}";
async function mockEmbedProviders(page){
 await page.route('https://fisher.pricehubble.com/widget.js',route=>route.fulfill({contentType:'application/javascript',body:mockValuationScript}));
 await page.route(/https:\/\/(tour\.sls\.de|www\.google\.com|calculator\.justhome\.com|budget-check\.justhome\.com|fisher\.pricehubble\.com)\//,route=>route.request().url().endsWith('/widget.js')?route.fallback():route.fulfill({contentType:'text/html',body:'<h1>Externer Inhalt geladen</h1>'}));
}

test('external calculators load without an activation click',async({page})=>{
 await mockEmbedProviders(page);
 for(const [path,selector] of [['/immobilienbewertung/','#fisher-widget'],['/finanzierung/','#finance-calculator-frame'],['/kaufen/','#buy-budget-frame']]){
  await page.goto(path);
  await expect(page.frameLocator(selector).getByRole('heading',{name:'Externer Inhalt geladen'})).toBeVisible();
  await expect(page.getByRole('button',{name:/Rechner laden|rechner laden/})).toHaveCount(0);
 }
});

test('property embeds load automatically under the deployed CSP',async({page})=>{
 const config=JSON.parse(await readFile('vercel.json','utf8'));
 const csp=config.headers.flatMap(group=>group.headers).find(header=>header.key==='Content-Security-Policy').value;
 await page.route('**/immobilien-test/?objekt=17',async route=>{const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),'content-security-policy':csp}});});
 await page.route('**/api/propstack-properties**',route=>route.fulfill({json:{items:[{id:'17',title:'Testimmobilie',city:'Lünen',zip:'44534',images:['/assets/images/hero.webp'],tour:'https://tour.sls.de/syF2',tourEmbed:true,broker:{},inquiryEnabled:false}]}}));
 await mockEmbedProviders(page);
 await page.goto('/immobilien-test/?objekt=17');
 for(const selector of ['.pp-tour-frame','.pp-map-frame','.pp-financing iframe','#pp-fisher-widget']){
  await expect(page.frameLocator(selector).getByRole('heading',{name:'Externer Inhalt geladen'})).toBeVisible();
 }
 await expect(page.getByRole('button',{name:/Rundgang starten|Karte anzeigen|rechner laden/})).toHaveCount(0);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});

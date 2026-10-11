const {createRequire}=require('module');const assert=require('assert/strict');const root=require('path').resolve(__dirname,'..');const {chromium,expect}=createRequire(root+'/package.json')('@playwright/test');
const base=process.env.CONSENT_TEST_BASE||'http://127.0.0.1:4173';const gated=/instagram\.com|youtube(?:-nocookie)?\.com|ytimg\.com|google\.com|googleapis\.com|gstatic\.com|openstreetmap\.org|pricehubble\.com|justhome\.com|immobilienscout24\.de|immowelt\.de|tour\.sls\.de/;
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});
for(const width of [1440,390,320]){
 const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();const requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const url=route.request().url();const u=new URL(url);if(u.origin===base){if(u.pathname.startsWith('/api/'))return route.fulfill({json:{available:false,items:[],references:[]}});return route.continue();}if(gated.test(u.hostname)){requests.push(url);if(url.includes('pricehubble.com/widget.js'))return route.fulfill({contentType:'text/javascript',body:"window.FisherWidget={init(o){document.querySelector(o.iframe).src='https://fisher.pricehubble.com/test-frame'}}"});return route.fulfill({contentType:'text/html',body:'<h1>Externer Testinhalt</h1>'});}return route.abort();});
 await page.goto(base+'/');await page.getByRole('dialog').waitFor({state:'visible'});assert.equal(requests.length,0);assert.ok(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth));for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement.closest('.privacy-dialog')!==null));}await page.screenshot({path:'/private/tmp/sls-consent-banner-'+width+'.png'});
 await page.getByRole('button',{name:'Nur notwendige',exact:true}).click();
 // Rejected media must stay inside its own surface, never cover the hero.
 const reel=page.locator('.home-reach-reel-media');const notice=reel.locator('.privacy-placeholder');
 const bounds=await reel.boundingBox(),noticeBounds=await notice.boundingBox();
 assert.ok(bounds.height>400);assert.ok(noticeBounds.y>=bounds.y-1&&noticeBounds.y+noticeBounds.height<=bounds.y+bounds.height+1);
 assert.ok(noticeBounds.x>=bounds.x-1&&noticeBounds.x+noticeBounds.width<=bounds.x+bounds.width+1);
 assert.equal(await notice.locator('p').evaluate(el=>getComputedStyle(el).color),'rgb(38, 53, 60)');
 assert.ok(await page.locator('.hero').evaluate(el=>{const r=el.getBoundingClientRect();const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return el.contains(top)}));
 await page.screenshot({path:'/private/tmp/sls-consent-rejected-hero-'+width+'.png'});
 await notice.scrollIntoViewIfNeeded();await page.screenshot({path:'/private/tmp/sls-consent-rejected-reel-'+width+'.png'});
 const reviewCards=page.locator('.review-platform-card');
 for(const card of await reviewCards.all()){
  const widget=card.locator('.review-widget-frame'),placeholder=card.locator('.privacy-placeholder'),button=placeholder.getByRole('button');
  const surface=await widget.boundingBox(),box=await placeholder.boundingBox(),control=await button.boundingBox();
  assert.ok(box.y>=surface.y-1&&box.y+box.height<=surface.y+surface.height+1);
  assert.ok(control.y>=box.y&&control.y+control.height<=box.y+box.height);
 }
 await page.locator('.review-platform-grid').scrollIntoViewIfNeeded();await page.screenshot({path:'/private/tmp/sls-consent-rejected-reviews-'+width+'.png'});
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(200);assert.equal(requests.length,0);assert.ok(await page.locator('.privacy-placeholder').count());assert.deepEqual(await page.evaluate(()=>Object.keys(sessionStorage)),[]);
 await page.goto(base+'/verkaufen/');await page.locator('.sell-video-play').click();await page.locator('.sell-video-media .privacy-placeholder').waitFor({state:'visible'});assert.equal(requests.length,0);
 await page.goto(base+'/buero-dorsten/');assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(requests.length,0);
 await page.getByRole('button',{name:'Datenschutzeinstellungen',exact:true}).first().click();if(!await page.locator('[data-privacy-details]').evaluate(el=>el.open))await page.getByText('Auswahl und Anbieter ansehen',{exact:true}).click();await page.getByRole('checkbox',{name:'Karten',exact:true}).check();await page.getByRole('button',{name:'Auswahl speichern',exact:true}).click();await page.locator('.office-map iframe[src]').waitFor({state:'visible'});assert.ok(requests.some(u=>u.includes('google.com/maps')));assert.equal(requests.filter(u=>/instagram|youtube|pricehubble|justhome/.test(u)).length,0);
 await page.goto(base+'/finanzierung/');assert.equal(await page.locator('#finance-calculator-frame').getAttribute('src'),null);
 await page.getByRole('button',{name:'Datenschutzeinstellungen',exact:true}).first().click();await page.getByRole('button',{name:'Alle akzeptieren',exact:true}).click();await page.locator('#finance-calculator-frame[src]').waitFor({state:'visible'});await expect.poll(()=>requests.some(u=>u.includes('calculator.justhome.com'))).toBe(true);
 await page.goto(base+'/immobilienbewertung/');await page.locator('#fisher-widget[src]').waitFor({state:'visible'});assert.ok(requests.some(u=>u.includes('pricehubble.com/widget.js')));
 await page.goto(base+'/team/mischa-stratmann/');await page.locator('[data-profile-video-gallery]').scrollIntoViewIfNeeded();await page.waitForTimeout(300);assert.ok(requests.some(u=>u.includes('instagram.com')));
 await page.getByRole('button',{name:'Datenschutzeinstellungen',exact:true}).last().click();const before=requests.length;await Promise.all([page.waitForEvent('load'),page.getByRole('button',{name:'Nur notwendige',exact:true}).click()]);await page.locator('[data-profile-video-gallery]').scrollIntoViewIfNeeded();await page.waitForTimeout(200);assert.equal(requests.length,before);
 await page.evaluate(()=>{const frame=document.createElement('iframe');window.SLSConsent.frame(frame,'https://www.youtube-nocookie.com/embed/guoSI4VrK8E');document.body.append(frame)});await page.waitForTimeout(100);assert.equal(requests.length,before);assert.ok(await page.locator('.privacy-placeholder').last().evaluate(el=>el.getBoundingClientRect().width<=innerWidth));
 // Expired/future/malformed choices never release a provider.
 for(const patch of [{at:Date.now()-181*86400000},{at:Date.now()+86400000},{version:'old'}]){await page.evaluate(p=>localStorage.setItem('sls-privacy-choice-v1',JSON.stringify({version:window.SLSConsent.version,at:Date.now(),media:true,maps:true,tools:true,comfort:true,...p})),patch);await page.goto(base+'/');await page.getByRole('dialog').waitFor({state:'visible'});assert.equal(requests.length,before);await page.getByRole('button',{name:'Nur notwendige',exact:true}).click();}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({width,initialBlocking:'OK',rejection:'OK',selectiveConsent:'OK',automaticLoading:'OK',widgets:'OK',revoke:'OK',expiry:'OK',errors}));await context.close();
}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});

import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {queryProperties,propertyFilters} from '../lib/property-catalog.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(import.meta.dirname,'..');
const items=Array.from({length:135},(_,i)=>({id:String(i+1),title:`Wohnung ${i+1}`,type:i===134?'Grundstück':'Wohnung',rs_type:i===134?'TRADE_SITE':'APARTMENT',rs_category:i===134?'TRADE_SITE':i%2?'PENTHOUSE':'GROUND_FLOOR',subtype:i===134?'Grundstück':i%2?'Penthouse':'Erdgeschosswohnung',city:i===134?'Borken':i<9?'Dorsten':'Düsseldorf',zip:i===134?'':'40210',price:100000+i*10000,area:80,rooms:3,images:[],broker:{},energy:{}}));
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 const page=await browser.newPage();page.setDefaultTimeout(15000);const errors=[];let requests=[],failNextPage=false,failFilters=false;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='tile.openstreetmap.org')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e5eef0"/></svg>'});
  if(url.hostname!=='sls-preview.test')return route.abort();
  if(url.pathname==='/api/property-map-config')return route.fulfill({json:{key:''}});
  if(url.pathname==='/api/propstack-properties'){
   requests.push(url);const q=Object.fromEntries(url.searchParams),id=q.id||q.summary;
   if(q.filters&&failFilters)return route.fulfill({status:502,json:{error:'Unavailable'}});
   if(q.filters)return route.fulfill({json:{filters:propertyFilters(items)}});
   if(id)return route.fulfill({json:{items:items.filter(p=>p.id===id)}});
   if(q.similarTo)return route.fulfill({json:{items:[]}});
   const found=queryProperties(items,q);if(q.map)return route.fulfill({json:{items:found.map(({id,zip,city,price})=>({id,zip,city,price})),total:found.length}});
   const n=Number(q.page||1),per=Number(q.per||9);if(n===2&&failNextPage)return route.fulfill({status:502,json:{error:'Unavailable'}});
   return route.fulfill({json:{items:found.slice((n-1)*per,n*per),hasMore:n*per<found.length,total:found.length}});
  }
  let file=path.join(root,url.pathname);if(url.pathname.endsWith('/'))file+='index.html';
  if(url.pathname.startsWith('/immobilie/'))file=path.join(root,'immobilien/index.html');
  if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
  return route.fulfill({path:file,contentType:({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]});
 });
 for(const width of [1440,1024,390]){
  await page.setViewportSize({width,height:900});requests=[];await page.goto('https://sls-preview.test/immobilien-test/');
  await page.waitForFunction(()=>document.querySelectorAll('#pp-results .pp-card').length===9);
  assert.equal(requests.filter(u=>!u.searchParams.has('filters')).length,1,'initially only one result batch');
  assert.equal(await page.locator('#pp-count').textContent(),'135 Immobilien');
  assert.equal(requests.filter(u=>u.searchParams.has('map')).length,0,'no map data in list view');
  if(width>850)await page.locator('[data-view="map"]').click();else await page.locator('#pp-mobile-map').click();
  await page.waitForFunction(()=>document.querySelectorAll('#pp-results .pp-card').length===6);
  await page.locator('.pp-map-marker').first().waitFor();
  assert.equal(requests.filter(u=>u.searchParams.has('map')).length,1);
  assert.equal(requests.filter(u=>u.searchParams.has('summary')).length,0,'no eager popup details');
  await page.evaluate(()=>{window.originalCard=document.querySelector('#pp-results .pp-card-shell')});
  await page.locator('#pp-load-sentinel').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelectorAll('#pp-results .pp-card').length>=12);
  assert.ok(await page.evaluate(()=>window.originalCard===document.querySelector('#pp-results .pp-card-shell')),'append preserves existing cards');
  if(width===1440){
   await page.locator('#pp-results .pp-card').nth(7).scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY);
   await page.locator('#pp-results .pp-card').nth(7).click();await page.locator('.pp-detail-header').waitFor();
   await page.goBack();await page.waitForFunction(y=>Math.abs(scrollY-y)<30,before);
  }
  await page.locator('#pp-count').scrollIntoViewIfNeeded();await page.locator('.pp-map-marker').first().click();
  await page.locator('.pp-map-popup strong').filter({hasText:'Wohnung'}).first().waitFor();
  assert.ok(requests.some(u=>u.searchParams.has('summary')));
  if(width<=850){await page.locator('#pp-mobile-filter').click()}
  await page.locator('#pp-form [name="query"]').fill('Wohnung 135');await page.locator('#pp-form button').click();
  await page.waitForFunction(()=>document.querySelector('#pp-count').textContent==='1 Immobilie');
  assert.equal(await page.locator('#pp-results .pp-card-shell').getAttribute('data-property-id'),'135','search reaches unloaded objects');
  if(width<=850)await page.locator('#pp-mobile-filter').click();
  await page.locator('#pp-form [name="query"]').fill('nichts');await page.locator('#pp-form button').click();
  await page.waitForFunction(()=>document.querySelector('#pp-count').textContent==='0 Immobilien');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  console.log(`PASS ${width}px: lazy batches, append, map summaries on demand, full server search, empty state`);
 }
 await page.setViewportSize({width:1440,height:900});failNextPage=true;await page.goto('https://sls-preview.test/immobilien-test/');
 await page.waitForFunction(()=>document.querySelectorAll('#pp-results .pp-card').length===9);await page.locator('#pp-load-sentinel').scrollIntoViewIfNeeded();
 await page.locator('#pp-catalog-retry').waitFor();assert.equal(await page.locator('#pp-results .pp-card').count(),9);
 failNextPage=false;await page.locator('#pp-catalog-retry').click();await page.waitForFunction(()=>document.querySelectorAll('#pp-results .pp-card').length>=18);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.goto('about:blank');await page.goto('https://sls-preview.test/immobilien/');
  await page.waitForFunction(()=>document.querySelectorAll('#pp-results .pp-card').length===9);
  if(width<=850)await page.locator('#pp-mobile-filter').click();
  assert.deepEqual(await page.locator('#pp-form [name=type] option').allTextContents(),['Alle Immobilien','Grundstück','Wohnung']);
  assert.ok(await page.locator('#pp-form [name=subtype]').isDisabled());
  await page.locator('#pp-form [name=type]').selectOption('Wohnung');
  assert.deepEqual(await page.locator('#pp-form [name=subtype] option').allTextContents(),['Alle Unterkategorien','Erdgeschosswohnung','Penthouse']);
  await page.locator('#pp-form [name=subtype]').selectOption('GROUND_FLOOR');
  const city=page.locator('#pp-city');await city.click();
  assert.deepEqual(await page.locator('#pp-city-options [role=option]').allTextContents(),['Borken','Dorsten','Düsseldorf']);
  await city.fill('bork');assert.deepEqual(await page.locator('#pp-city-options [role=option]').allTextContents(),['Borken']);
  await city.press('ArrowDown');await city.press('Enter');assert.equal(await city.inputValue(),'Borken');
  await city.fill('');await city.press('Escape');assert.equal(await city.getAttribute('aria-expanded'),'false');
  await city.click();await page.getByRole('option',{name:'Dorsten',exact:true}).click();assert.equal(await city.inputValue(),'Dorsten');
  await page.locator('#pp-form button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#pp-count').textContent==='5 Immobilien');
  await page.locator('[data-search-profile-open]').first().click();
  await page.locator('.sls-search-profile-dialog[open]').waitFor();
  assert.ok((await page.locator('[data-profile-criteria]').textContent()).includes('Erdgeschosswohnung'));
  await page.locator('[data-profile-close]').click();
  await page.locator('#pp-results .pp-card').first().click();await page.locator('.pp-detail-header').waitFor();
  await page.goBack();await page.waitForFunction(()=>document.querySelector('#pp-count').textContent==='5 Immobilien');
  assert.equal(await page.locator('#pp-form [name=type]').inputValue(),'Wohnung');
  assert.equal(await page.locator('#pp-form [name=subtype]').inputValue(),'GROUND_FLOOR');
  assert.equal(await page.locator('#pp-city').inputValue(),'Dorsten');
  if(width<=850)await page.locator('#pp-mobile-filter').click();
  await page.locator('#pp-form [name=type]').selectOption('Grundstück');
  assert.equal(await page.locator('#pp-form [name=subtype]').inputValue(),'','changing parent clears incompatible subtype');
  await city.fill('Borken');
  await page.screenshot({path:`/tmp/sls-property-filters-${width}.png`});await page.locator('#pp-form button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#pp-count').textContent==='1 Immobilie');
  assert.equal(await page.locator('#pp-results .pp-card-shell').getAttribute('data-property-id'),'135');
  await page.locator('#pp-results [data-favorite]').click();
  assert.ok((await page.locator('#pp-favorites-link').textContent()).includes('1'));
  if(width<=850)await page.locator('#pp-mobile-filter').click();
  await page.locator('#pp-form [name=type]').selectOption('');await city.fill('Freier unbekannter Ort');
  await page.locator('#pp-form button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#pp-count').textContent==='0 Immobilien');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  console.log(`PASS ${width}px: dynamic complete facets, dependent subtype, keyboard/pointer combobox, free text, saved criteria, favorites`);
  await page.evaluate(()=>localStorage.clear());
 }
 await page.setViewportSize({width:1440,height:900});failFilters=true;
 await page.goto('about:blank');await page.goto('https://sls-preview.test/immobilien/');
 await page.waitForFunction(()=>document.querySelectorAll('#pp-results .pp-card').length===9);
 await page.locator('.pp-filter-notice button').waitFor();failFilters=false;
 await page.locator('.pp-filter-notice button').click();
 await page.waitForFunction(()=>document.querySelector('#pp-form [name=type]').options.length===3);
 assert.ok(await page.locator('.pp-filter-notice').isHidden());
 console.log('PASS filter availability retry preserves loaded results');
 assert.deepEqual(errors,[]);console.log('PASS retry preserves results; no JavaScript errors');
}finally{await browser.close()}

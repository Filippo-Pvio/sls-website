import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(import.meta.dirname,'..');
const base={type:'Wohnung',city:'Dorsten',zip:'46286',area:80,rooms:3,images:[],broker:{},energy:{}};
const items=Array.from({length:14},(_,i)=>({...base,id:String(i+1),title:`Wohnung ${i+1}`,price:100000+i*10000,...(i>8?{city:'Düsseldorf',zip:'40210'}:{}),...(i===13?{zip:''}:{})}));
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let failNextPage=false;
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='tile.openstreetmap.org')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e5eef0"/></svg>'});
  if(url.hostname!=='sls-preview.test')return route.abort();
  if(url.pathname==='/api/propstack-properties'){
   const id=url.searchParams.get('id');if(id)return route.fulfill({json:{items:items.filter(p=>p.id===id)}});
   const n=Number(url.searchParams.get('page'));if(n===2&&failNextPage)return route.fulfill({status:502,json:{error:'Unavailable'}});
   return route.fulfill({json:{items:items.slice((n-1)*9,n*9),hasMore:n===1,total:14}});
  }
  let file=path.join(root,url.pathname);if(url.pathname.endsWith('/'))file+='index.html';
  if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
  return route.fulfill({path:file,contentType:({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]});
 });
 for(const width of [1440,1024,390]){
  await page.setViewportSize({width,height:900});await page.goto('https://sls-preview.test/immobilien-test/');
  await page.waitForFunction(()=>document.querySelector('#pp-count').textContent==='14 Immobilien');
  assert.equal(await page.locator('#pp-results .pp-card').count(),9);
  if(width>850)await page.locator('[data-view="map"]').click();else await page.locator('#pp-mobile-map').click();
  await page.waitForFunction(()=>document.querySelector('#pp-map-status').textContent.includes('13 von 14'));
  assert.equal(await page.locator('#pp-results .pp-card').count(),6);
  assert.ok(await page.locator('.pp-map-marker').count()>0);
  await page.locator('#pp-pagination [data-page="2"]').click();assert.equal(await page.locator('#pp-results .pp-card').count(),6);
  assert.equal(await page.locator('#pp-results .pp-card-shell').first().getAttribute('data-property-id'),'7');
  await page.locator('.pp-map-marker').first().click();await page.locator('.pp-map-popup [data-select="1"]').click();
  assert.equal(await page.locator('#pp-results .is-map-selected').getAttribute('data-property-id'),'1');
  if(width<=850){
   await page.locator('#pp-mobile-filter').click();assert.equal(await page.locator('#pp-filter-dialog').isVisible(),true);
   await page.locator('#pp-form [name="price"]').fill('130000');await page.locator('#pp-form button').click();
   assert.equal(await page.locator('#pp-filter-dialog').isVisible(),false);
   assert.equal(await page.locator('#pp-results .pp-card').count(),4);
   await page.locator('#pp-mobile-sort').click();await page.locator('#pp-mobile-sort-select').selectOption('price-desc');
   assert.equal(await page.locator('#pp-results .pp-card-shell').first().getAttribute('data-property-id'),'4');
   await page.locator('#pp-mobile-filter').click();await page.locator('#pp-form [name="price"]').fill('');await page.keyboard.press('Escape');
   await page.locator('#pp-quick-query').fill('40210');await page.locator('#pp-quick-search button').click();
   assert.equal(await page.locator('#pp-results .pp-card').count(),4);
   await page.locator('#pp-quick-query').fill('kein-treffer');await page.locator('#pp-quick-search button').click();
   assert.equal(await page.locator('#pp-results .pp-card').count(),0);
   await page.locator('#pp-quick-query').fill('');await page.locator('#pp-quick-search button').click();
  }else{
   await page.locator('#pp-form [name="city"]').fill('Düsseldorf');await page.locator('#pp-form button').click();
   assert.equal(await page.locator('#pp-results .pp-card').count(),5);
   await page.locator('#pp-form [name="city"]').fill('');await page.locator('#pp-form button').click();
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('#pp-count').scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/sls-search-map-${width}.png`});
  console.log(`PASS ${width}px: full feed, six-card pagination, map selection, search/filter, no overflow`);
 }
 failNextPage=true;await page.goto('https://sls-preview.test/immobilien-test/');await page.locator('#pp-catalog-retry').waitFor();
 assert.match(await page.locator('#pp-count').innerText(),/bisher geladen/);failNextPage=false;await page.locator('#pp-catalog-retry').click();await page.waitForFunction(()=>document.querySelector('#pp-count').textContent==='14 Immobilien');
 assert.deepEqual(errors,[]);console.log('PASS incomplete feed indication and retry; no JavaScript errors');
}finally{await browser.close()}

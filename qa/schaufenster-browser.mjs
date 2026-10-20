// Run against qa/server.mjs. Optional public samples are QA-only, never shipped.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.SLS_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const sample=process.env.SLS_SIGNAGE_SAMPLES?JSON.parse(await readFile(process.env.SLS_SIGNAGE_SAMPLES,'utf8')):[{id:'1',title:'Großzügiges Zuhause mit Garten und viel Platz für Ihre Familie',city:'Dorsten',zip:'46286',price:449000,area:135,rooms:5,type:'Haus',images:[],energy:{kind:'Bedarfsausweis',value:110,fuel:'Gas',buildingYear:1998,rating:'D'}}];
const browser=await chromium.launch({headless:true,channel:process.env.SLS_BROWSER_CHANNEL||undefined});
try{
 for(const viewport of [{width:1920,height:1080},{width:3840,height:2160},{width:1280,height:720}]){
  const page=await browser.newPage({viewport});let mode='ok',version=0;const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const catalog=()=>Array.from({length:140},(_,i)=>({...sample[i%sample.length],id:String(i+1),reference:'SLS-'+(i+1)}));
  await page.route('**/api/propstack-properties/**',async route=>{
   const url=new URL(route.request().url());
   if(mode==='offline')return route.fulfill({status:502,json:{error:'fixture offline'}});
   if(url.searchParams.get('display')==='1'){
    const items=mode==='empty'?[]:catalog().filter(p=>version===0||p.id!=='1').map(p=>({...p,price:version?333000:p.price}));
    return route.fulfill({json:{items,total:items.length}});
   }
   const id=url.searchParams.get('id');const p=catalog().find(p=>p.id===id);
   if(mode==='removed'&&id==='1')return route.fulfill({status:410,json:{code:'PROPERTY_UNAVAILABLE'}});
   return route.fulfill({json:{items:[{...p,price:version?333000:p.price}]}});
  });
  await page.clock.install();await page.goto(base+'/schaufenster/');
  await page.waitForFunction(()=>document.querySelector('#counter').textContent==='1 / 140');
  await page.waitForTimeout(1400);
  assert.equal(await page.locator('dialog').count(),0);
  assert.equal(await page.locator('script[src*="tracking"],script[src*="consent"]').count(),0);
  const overflow=await page.evaluate(()=>Array.from(document.querySelectorAll('.information h1,.price,.facts,.commission,.energy,.reference,.invitation')).filter(e=>{const r=e.getBoundingClientRect(),p=document.querySelector('.information').getBoundingClientRect();return r.bottom>p.bottom+1||r.right>p.right+1||e.scrollHeight>e.clientHeight+2}).map(e=>({tag:e.tagName,class:e.className,scroll:e.scrollHeight,height:e.clientHeight,rect:e.getBoundingClientRect().toJSON(),panel:document.querySelector('.information').getBoundingClientRect().toJSON()})));
  assert.deepEqual(overflow,[],JSON.stringify(viewport));
  await mkdir('output',{recursive:true});await page.screenshot({path:`output/schaufenster-${viewport.width}.png`});
  await page.clock.runFor(21000);assert.match(await page.locator('#counter').textContent(),/^2 \/ 140$/);
  version=1;await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await page.waitForFunction(()=>document.querySelector('#counter').textContent.endsWith('/ 139'));
  await page.waitForFunction(()=>document.querySelector('#price').textContent.includes('333.000'));
  mode='empty';await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await page.waitForFunction(()=>!document.querySelector('#standby').hidden);
  assert.equal(await page.locator('#counter').textContent(),'');
  mode='ok';await page.clock.runFor(31000);await page.waitForFunction(()=>document.querySelector('#standby').hidden);
  mode='offline';await page.clock.fastForward(31*60000);await page.waitForFunction(()=>!document.querySelector('#standby').hidden);
  assert.equal(await page.locator('#property-content').isVisible(),false);
  mode='ok';await page.evaluate(()=>window.dispatchEvent(new Event('online')));await page.waitForFunction(()=>document.querySelector('#standby').hidden);
  assert.deepEqual(errors,[]);console.log(`${viewport.width}×${viewport.height}: layout, 140 offers, rotation, update/removal, empty feed, outage expiry and recovery passed`);
  await page.close();
 }
}finally{await browser.close();}

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/sls-tracking.js',import.meta.url),'utf8');
const consentSource=readFileSync(new URL('../assets/privacy-consent.js',import.meta.url),'utf8');
function harness(initial={},host='sls.de') {
 let choice={...initial};const listeners={},scripts=[],deleted=[];
 const document={head:{append:s=>scripts.push(s)},createElement:()=>({})};
 Object.defineProperty(document,'cookie',{get:()=> '_ga=x; _ga_TEST=y; _clck=c; _clsk=d; _fbp=e; _fbc=f; _gcl_aw=g; necessary=keep',set:v=>deleted.push(v)});
 const window={SLSConsent:{allowed:category=>choice[category]===true},addEventListener:(n,fn)=>(listeners[n]??=[]).push(fn)};
 const context={window,document,location:{hostname:host,origin:'https://'+host,pathname:'/kontakt/',search:'?email=private@example.com',hash:'#private'},Date};
 vm.runInNewContext(source,context);
 return {window,scripts,deleted,run:()=>vm.runInNewContext(source,context),set:next=>{choice={...next};listeners['sls:consent-change'].forEach(f=>f({}));},convert:event=>listeners['sls:conversion'].forEach(f=>f({detail:{event,email:'private@example.com',propertyId:123}}))};
}
const events=h=>h.window.dataLayer.filter(x=>x.event);
const lastState=h=>[...h.window.dataLayer].reverse().find(x=>x[0]==='consent')?.[2];
test('each combination releases only the chosen providers, in one container',()=>{
 for(let mask=0;mask<8;mask++){
  const p={analytics:Boolean(mask&1),clarity:Boolean(mask&2),marketing:Boolean(mask&4)};const h=harness(p);
  assert.equal(h.scripts.length,mask?1:0);
  if(mask)assert.equal(h.scripts[0].src,'https://www.googletagmanager.com/gtm.js?id=GTM-W3LWF7C6');
  const state=lastState(h);
  assert.equal(state.analytics_storage,p.analytics?'granted':'denied');
  for(const key of ['ad_storage','ad_user_data','ad_personalization'])assert.equal(state[key],p.marketing?'granted':'denied');
  for(const category of ['analytics','clarity','marketing'])assert.equal(events(h).filter(e=>e.event===`sls_${category}_ready`).length,p[category]?1:0);
  assert.equal(typeof h.window.clarity,p.clarity?'function':'undefined');
  h.convert('contact_request_success');
  assert.equal(events(h).filter(e=>e.event==='contact_request_success').length,p.analytics?1:0);
 }
});
test('no replay of pre-consent requests, no duplicates when a category is added',()=>{
 const h=harness();h.convert('contact_request_success');h.set({marketing:true});h.set({marketing:true,analytics:true});h.set({marketing:true,analytics:true});h.run();
 assert.equal(h.scripts.length,1);
 assert.equal(events(h).filter(e=>e.event==='sls_analytics_ready').length,1);
 assert.equal(events(h).filter(e=>e.event==='sls_marketing_ready').length,1);
 assert.equal(events(h).filter(e=>e.event==='contact_request_success').length,0);
 h.convert('contact_request_success');h.convert('unknown_event');
 assert.equal(events(h).filter(e=>e.event==='contact_request_success').length,1);
 assert.doesNotMatch(JSON.stringify(events(h)),/private|propertyId|unknown_event/);
});
test('Clarity gets its own explicit analytics consent without advertising consent',()=>{
 const h=harness({clarity:true,marketing:true});const q=h.window.clarity.q;
 assert.equal(q[0][0],'consentv2');assert.equal(q[0][1].analytics_Storage,'granted');assert.equal(q[0][1].ad_Storage,'denied');
 assert.equal(lastState(h).analytics_storage,'denied');
});
test('revocation stops new events and deletes only the revoked provider cookies',()=>{
 for(const category of ['analytics','clarity','marketing']){
  const h=harness({analytics:true,clarity:true,marketing:true});const fb=[];h.window.fbq=(...a)=>fb.push(a);
  h.set({analytics:true,clarity:true,marketing:true,[category]:false});h.convert('contact_request_success');
  assert.equal(h.window.SLSTracking.disabled,true);assert.equal(events(h).filter(e=>e.event==='contact_request_success').length,0);
  assert.ok(h.deleted.length>0);assert.ok(h.deleted.every(x=>!x.startsWith('necessary=')));
  if(category==='marketing')assert.deepEqual(fb,[['consent','revoke']]);
  if(category==='analytics')assert.ok(h.deleted.every(x=>/^_ga/.test(x)));
  if(category==='clarity')assert.ok(h.deleted.every(x=>/^_cl/.test(x)));
  if(category==='marketing')assert.ok(h.deleted.every(x=>/^_fb|^_gcl/.test(x)));
 }
});
test('all six completion names preserve the privacy boundary and target only the chosen container',()=>{
 const h=harness({analytics:true});
 for(const name of ['contact_request_success','buyerfinder_request_success','guide_request_success','search_profile_success','property_inquiry_success','sales_report_success'])h.convert(name);
 assert.equal(events(h).filter(e=>e.event.endsWith('_success')).length,6);
 assert.ok(events(h).filter(e=>e.sls_page_location).every(e=>e.sls_page_location==='https://sls.de/kontakt/'));
 assert.doesNotMatch(JSON.stringify(events(h)),/private|propertyId|GTM-PSH7R4R8/);
});
test('unapproved hosts cannot release any provider, even with all categories accepted',()=>{
 for(const host of ['localhost','www.sls.de','sls.de.evil.example','other.vercel.app']){
  const h=harness({analytics:true,clarity:true,marketing:true},host);h.convert('contact_request_success');assert.equal(h.scripts.length,0);assert.equal(events(h).length,0);
 }
});
test('old choices do not silently authorize newly introduced services',()=>{
 let removed=false;
 const window={addEventListener(){}};const document={readyState:'loading',addEventListener(){}};
 const old={version:'2026-10-17.google.1',at:Date.now(),analytics:true,media:true,maps:true,tools:true,comfort:true};
 vm.runInNewContext(consentSource,{window,document,localStorage:{getItem:()=>JSON.stringify(old),removeItem:()=>{removed=true}},Date,URL});
 assert.equal(removed,true);
 for(const category of ['analytics','clarity','marketing','media'])assert.equal(window.SLSConsent.allowed(category),false);
});

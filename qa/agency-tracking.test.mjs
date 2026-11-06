import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/sls-tracking.js',import.meta.url),'utf8');
const consentSource=readFileSync(new URL('../assets/privacy-consent.js',import.meta.url),'utf8');
function harness(initial={},host='sls.de',page={}) {
 let choice={...initial};const listeners={},scripts=[],deleted=[];
 const document={title:page.title||'Kontakt | SLS Immobilienpartner',referrer:page.referrer||'',head:{append:s=>scripts.push(s)},createElement:()=>({})};
 Object.defineProperty(document,'cookie',{get:()=> '_ga=x; _ga_TEST=y; _clck=c; _clsk=d; _fbp=e; _fbc=f; _gcl_aw=g; necessary=keep',set:v=>deleted.push(v)});
 const window={SLSConsent:{allowed:category=>choice[category]===true},addEventListener:(n,fn)=>(listeners[n]??=[]).push(fn)};
 const context={window,document,location:{hostname:host,origin:'https://'+host,pathname:'/kontakt/',search:'?email=private@example.com',hash:'#private',...page.location},Date,URL,URLSearchParams};
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
  assert.equal(events(h).filter(e=>e.event==='sls_marketing_conversion'&&e.sls_conversion_name==='contact_request_success').length,p.marketing?1:0);
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

test('attribution retains only known campaign keys and valid click identifiers, with real title and safe referrer',()=>{
 const h=harness({analytics:true,marketing:true},'sls.de',{title:'Kontakt | SLS Immobilienpartner',referrer:'https://www.google.com/search?q=private@example.com#secret',location:{search:'?utm_source=google&utm_medium=cpc&utm_campaign=Verkauf+NRW&gclid=Click_123&gbraid=braid-1&wbraid=braid-2&fbclid=Fb_123&email=private@example.com&objekt=123&token=secret&utm_email=private@example.com&utm_content=private%40example.com'}});
 h.convert('contact_request_success');
 for(const e of events(h).filter(e=>e.sls_page_location)){
  const u=new URL(e.sls_page_location);assert.equal(u.searchParams.get('utm_source'),'google');assert.equal(u.searchParams.get('utm_campaign'),'Verkauf NRW');
  for(const key of ['gclid','gbraid','wbraid','fbclid'])assert.ok(u.searchParams.get(key));
  assert.equal(e.sls_page_referrer,'https://www.google.com/');assert.equal(e.sls_page_title,'Kontakt | SLS Immobilienpartner');
 }
 assert.doesNotMatch(JSON.stringify(events(h)),/private|secret|objekt|email/);
});
test('malformed attribution, external referrer queries and unknown events cannot inject payloads',()=>{
 const h=harness({marketing:true},'sls.de',{referrer:'javascript:alert(1)',location:{search:'?gclid=bad%22id&utm_source=ok&utm_source=override&utm_campaign='+ 'x'.repeat(201)}});
 h.convert('unknown_event');h.convert('guide_request_success');
 const e=events(h).find(e=>e.event==='sls_marketing_conversion');assert.equal(e.sls_conversion_name,'guide_request_success');
 assert.equal(e.sls_page_location,'https://sls.de/kontakt/?utm_source=ok');assert.equal(e.sls_page_referrer,'');
 assert.equal(events(h).filter(e=>e.event==='guide_request_success').length,0);
});
test('marketing-only, analytics-only and joint choices route all six outcomes independently',()=>{
 const names=['contact_request_success','buyerfinder_request_success','guide_request_success','search_profile_success','property_inquiry_success','sales_report_success'];
 for(const p of [{analytics:true},{marketing:true},{analytics:true,marketing:true},{}]){
  const h=harness(p);for(const n of names)h.convert(n);
  assert.equal(events(h).filter(e=>e.event.endsWith('_success')).length,p.analytics?6:0);
  assert.equal(events(h).filter(e=>e.event==='sls_marketing_conversion').length,p.marketing?6:0);
 }
});

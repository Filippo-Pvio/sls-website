import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {prepareConsentHtml} from '../lib/consent-html.mjs';
const source=readFileSync(new URL('../assets/sls-tracking.js',import.meta.url),'utf8');
const preview='sls-website-git-feat-consent-tracking-phas-a6ca65-info-91172609.vercel.app';
function harness(host=preview,initial=false){
 let granted=initial;const listeners={},scripts=[],cookies=[];
 const document={head:{append:s=>scripts.push(s)},createElement:()=>({})};
 Object.defineProperty(document,'cookie',{get:()=> '_ga=abc; _ga_TEST=xyz; necessary=keep',set:v=>cookies.push(v)});
 const window={SLSConsent:{allowed:()=>granted},addEventListener:(n,fn)=>(listeners[n]??=[]).push(fn)};
 const context={window,document,location:{hostname:host,origin:'https://'+host,pathname:'/kontakt/',search:'?email=private@example.com',hash:'#secret'},Date};
 vm.runInNewContext(source,context);
 return {window,scripts,cookies,run:()=>vm.runInNewContext(source,context),emit:(name,detail)=>listeners[name]?.forEach(fn=>fn({detail})),consent:value=>{granted=value;listeners['sls:consent-change'].forEach(fn=>fn({}));}};
}
const events=h=>h.window.dataLayer.filter(x=>x.event);
test('Basic mode: no requests or replay for denied visitors; defaults precede update',()=>{
 const h=harness();assert.equal(h.scripts.length,0);
 assert.equal(h.window.dataLayer[0][0],'consent');assert.equal(h.window.dataLayer[0][2].analytics_storage,'denied');
 h.emit('sls:conversion',{event:'contact_request_success'});h.consent(false);assert.equal(events(h).length,0);
 h.consent(true);assert.equal(h.scripts.length,1);assert.match(h.scripts[0].src,/gtm.js\?id=GTM-PSH7R4R8$/);
 assert.equal(events(h).filter(x=>x.event==='contact_request_success').length,0);
 const update=h.window.dataLayer.find(x=>x[1]==='update');
 for(const key of ['ad_storage','ad_user_data','ad_personalization'])assert.equal(update[2][key],'denied');
 assert.equal(update[2].analytics_storage,'granted');
 h.consent(true);h.run();assert.equal(h.scripts.length,1);
});
test('only approved success names, no free text, URL query, fragment or form payload',()=>{
 const h=harness(preview,true);
 for(const event of ['contact_request_success','buyerfinder_request_success','guide_request_success','search_profile_success','property_inquiry_success','sales_report_success']) h.emit('sls:conversion',{event,topic:'person@example.com',guide:'private',email:'private@example.com',propertyId:123});
 h.emit('sls:conversion',{event:'form_submit'});
 assert.equal(events(h).length,8);
 assert.doesNotMatch(JSON.stringify(events(h)),/private|person@|secret|propertyId|form_submit/);
 assert.ok(events(h).filter(x=>x.sls_page_location).every(x=>x.sls_page_location==='https://'+preview+'/kontakt/'));
});
test('revocation blocks events immediately and removes only analytics cookies',()=>{
 const h=harness(preview,true);h.consent(false);h.emit('sls:conversion',{event:'contact_request_success'});
 assert.equal(events(h).length,2);assert.ok(h.cookies.some(x=>x.startsWith('_ga=')));assert.ok(h.cookies.some(x=>x.startsWith('_ga_TEST=')));assert.ok(h.cookies.every(x=>!x.includes('necessary')));
});
test('redirect-only www and unrelated hosts cannot load the new container',()=>{
 for(const host of ['www.sls.de','sls.de.evil.example','slsXde','localhost','other.vercel.app']){const h=harness(host,true);h.consent(true);h.emit('sls:conversion',{event:'contact_request_success'});assert.equal(h.scripts.length,0);assert.equal(events(h).length,0);assert.equal(h.cookies.length,0);}
});
test('tracking listener bootstraps before forms on static and server-rendered pages',()=>{
 for(const raw of ['<head><title>x</title></head>','<head><script src="/assets/privacy-consent.js"></script></head>']){
 const html=prepareConsentHtml(raw);assert.equal((html.match(/src="\/assets\/sls-tracking.js"/g)||[]).length,1);assert.ok(html.indexOf('privacy-consent.js')<html.indexOf('sls-tracking.js'));assert.equal(prepareConsentHtml(html),html);
 }
});
test('container sends only to new GA4 property with safe URLs and consent checks',()=>{
 const cfg=JSON.parse(readFileSync(new URL('../docs/tracking/gtm-relaunch-production.json',import.meta.url)));
 const str=JSON.stringify(cfg);assert.match(str,/G-CPX5L89D4H/);assert.doesNotMatch(str,/G-CT9QN2WGXG|facebook|fbevents|AW-/);
 for(const tag of cfg.containerVersion.tag){assert.equal(tag.consentSettings.consentStatus,'NEEDED');assert.ok(JSON.stringify(tag).includes('analytics_storage'));}
});

test('approved production host requires consent and strips URL data',()=>{
 const h=harness('sls-website-eight.vercel.app');assert.equal(h.scripts.length,0);
 h.consent(true);assert.equal(h.scripts.length,1);
 h.emit('sls:conversion',{event:'contact_request_success',email:'private@example.com'});
 assert.ok(events(h).filter(e=>e.sls_page_location).every(e=>e.sls_page_location==='https://sls-website-eight.vercel.app/kontakt/'));
 assert.doesNotMatch(JSON.stringify(events(h)),/private|secret/);
});
test('release GTM is bounded to exact relaunch hosts and has no forced debug mode',()=>{
 const cfg=JSON.parse(readFileSync(new URL('../docs/tracking/gtm-relaunch-production.json',import.meta.url)));
 assert.doesNotMatch(JSON.stringify(cfg),/debug_mode/);
 for(const trigger of cfg.containerVersion.trigger){
  const filter=trigger.filter[0];assert.equal(filter.type,'MATCH_REGEX');
  const pattern=filter.parameter.find(p=>p.key==='arg1').value, regex=new RegExp(pattern);
  for(const host of [preview,'sls-website-eight.vercel.app'])assert.ok(regex.test(host));
  for(const host of ['sls.de','www.sls.de','sls-website-eightXvercelXapp','sls-website-eight.vercel.app.evil.example','other.vercel.app'])assert.equal(regex.test(host),false);
 }
});

const cutoverHosts=['sls.de','sls-website-git-feat-domain-cutover-20261018-info-91172609.vercel.app'];
test('prepared canonical and branch hosts require consent, minimize data and honor revocation',()=>{
 for(const host of cutoverHosts){
  const h=harness(host);assert.equal(h.scripts.length,0);
  h.emit('sls:conversion',{event:'contact_request_success'});assert.equal(events(h).length,0);
  h.consent(true);assert.equal(h.scripts.length,1);
  h.emit('sls:conversion',{event:'contact_request_success',email:'private@example.com'});
  assert.equal(events(h).filter(e=>e.event==='contact_request_success').length,1);
  assert.ok(events(h).filter(e=>e.sls_page_location).every(e=>e.sls_page_location==='https://'+host+'/kontakt/'));
  assert.doesNotMatch(JSON.stringify(events(h)),/private|secret/);
  h.consent(false);h.emit('sls:conversion',{event:'contact_request_success'});
  assert.equal(events(h).filter(e=>e.event==='contact_request_success').length,1);
  assert.ok(h.cookies.length>0);
 }
});
test('unpublished cutover changes only hostname filters of the live snapshot',()=>{
 const read=name=>JSON.parse(readFileSync(new URL('../docs/tracking/'+name,import.meta.url)));
 const live=read('gtm-relaunch-production.json'),prepared=read('gtm-relaunch-cutover.json');
 for(let i=0;i<prepared.containerVersion.trigger.length;i++){
  const filter=prepared.containerVersion.trigger[i].filter[0];assert.equal(filter.type,'MATCH_REGEX');
  const arg=filter.parameter.find(p=>p.key==='arg1'),regex=new RegExp(arg.value);
  for(const host of [preview,'sls-website-eight.vercel.app',...cutoverHosts])assert.ok(regex.test(host));
  for(const host of ['www.sls.de','slsXde','sls.de.evil.example','other.vercel.app'])assert.equal(regex.test(host),false);
  prepared.containerVersion.trigger[i].filter=live.containerVersion.trigger[i].filter;
 }
 prepared.exportTime=live.exportTime;
 assert.deepEqual(prepared,live);
});

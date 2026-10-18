import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {buildTrackingQa} from '../scripts/build-tracking-qa.mjs';
const code=await readFile(new URL('./tracking-qa-fixture.js',import.meta.url),'utf8');
function fixture(host='sls-website-git-feat-consent-tracking-phas-a6ca65-info-91172609.vercel.app',scenario='success'){
 const external=[];const window={fetch:async(...args)=>{external.push(args);return new Response('{}')},addEventListener(){}};
 const location={hostname:host,pathname:'/tracking-qa/contact/',href:`https://${host}/tracking-qa/contact/?qa=${scenario}`,origin:'https://'+host};
 vm.runInNewContext(code,{window,location,document:{addEventListener(){},querySelector(){}},URL,Response,Date,queueMicrotask});return {window,external};
}
test('fixtures cannot make real API reads or writes, even for unknown endpoints',async()=>{
 const f=fixture();
 for(const method of ['GET','POST'])for(const endpoint of ['/api/propstack-contact-request','/api/unknown'])await f.window.fetch(endpoint,{method,body:'{}'});
 assert.equal(f.external.length,0);
 const unknown=await f.window.fetch('/api/unknown',{method:'POST'});assert.equal(unknown.status,503);
 assert.equal((await f.window.fetch('https://example.org/api',{method:'POST'})).status,503);assert.equal(f.external.length,0);
});
test('only the new GA4 destination is allowed as an external fetch',async()=>{
 const f=fixture();await f.window.fetch('https://region1.google-analytics.com/g/collect?tid=G-CPX5L89D4H',{method:'POST'});assert.equal(f.external.length,1);
 await f.window.fetch('https://region1.google-analytics.com/g/collect?tid=G-CT9QN2WGXG',{method:'POST'});assert.equal(f.external.length,1);
});
test('wrong hosts block requests instead of falling back to real endpoints',async()=>{
 const f=fixture('other.vercel.app');await assert.rejects(f.window.fetch('/api/propstack-contact-request',{method:'POST'}));assert.equal(f.external.length,0);
});
test('failure, review, duplicate and confirmation-only responses are distinct',async()=>{
 assert.equal((await fixture(undefined,'error').window.fetch('/api/propstack-contact-request',{method:'POST'})).status,422);
 assert.equal((await (await fixture(undefined,'review').window.fetch('/api/propstack-guide-request',{method:'POST'})).json()).status,'review_required');
 assert.equal((await (await fixture(undefined,'duplicate').window.fetch('/api/propstack-search-profile',{method:'POST'})).json()).duplicate,true);
 const f=fixture();assert.equal((await (await f.window.fetch('/api/sales-check-report',{method:'POST',body:'{}'})).json()).status,'email_confirmation_required');
 assert.equal((await (await f.window.fetch('/api/sales-check-report',{method:'POST',body:'{"verificationCode":"123456"}'})).json()).ok,true);assert.equal(f.external.length,0);
});
test('QA pages are generated only for the exact preview branch, never production',async()=>{
 const output=await mkdtemp(path.join(tmpdir(),'sls-tracking-qa-'));await mkdir(path.join(output,'assets'));
 try{
  for(const env of [{VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'feat/consent-tracking-phase1-20261016'},{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'main'},{}])assert.equal(await buildTrackingQa({output,env}),false);
  assert.deepEqual(await readdir(output),['assets']);
  assert.equal(await buildTrackingQa({output,env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/consent-tracking-phase1-20261016'}}),true);
  const html=await readFile(path.join(output,'tracking-qa/contact/index.html'),'utf8');assert.ok(html.indexOf('tracking-qa-fixture.js')<html.indexOf('sls-tracking.js'));assert.match(html,/Simulation, keine echten Anfragen/);
  const report=await readFile(path.join(output,'tracking-qa/report/index.html'),'utf8');assert.match(report,/data-sales-wizard[^>]*><div class="sales-report-request">/);
 }finally{await rm(output,{recursive:true,force:true})}
});

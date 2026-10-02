import test from 'node:test';
import assert from 'node:assert/strict';
import {newsletterConfig, resolveNewsletterSender, GUIDE_NEWSLETTER_SETUP} from '../lib/guide-newsletter.mjs';
import checkHandler from '../api/guide-doi-check.js';

test('provided sender and snippet are configured but signup is not silently enabled',()=>{
 assert.deepEqual(GUIDE_NEWSLETTER_SETUP,{senderEmail:'service@sls.de',snippetId:1115618});
 assert.equal(newsletterConfig({}),null);
 assert.deepEqual(newsletterConfig({PROPSTACK_GUIDES_DOI_VERIFIED:'true'}),{senderEmail:'service@sls.de',snippetId:1115618});
 assert.equal(newsletterConfig({PROPSTACK_GUIDES_DOI_VERIFIED:'true',PROPSTACK_GUIDES_DOI_BROKER_ID:'bad'}),null);
});
test('sender resolves only the unique exact email, never another broker',async()=>{
 const call=async()=>[{id:1,email:'info@sls.de'},{id:2,email:' SERVICE@SLS.DE '}];
 assert.equal(await resolveNewsletterSender('fixture','service@sls.de',call),2);
 await assert.rejects(resolveNewsletterSender('fixture','other@sls.de',call),/uniquely resolved/);
 await assert.rejects(resolveNewsletterSender('fixture','service@sls.de',async()=>[{id:2,email:'service@sls.de'},{id:3,email:'service@sls.de'}]),/uniquely resolved/);
});
test('sender resolution paginates and detects a duplicate on a subsequent page',async()=>{
 let calls=0;
 await assert.rejects(resolveNewsletterSender('fixture','service@sls.de',async()=>{
  calls++;
  return calls===1?{data:[{id:1,email:'service@sls.de'}],meta:{total_count:2}}:{data:[{id:2,email:'service@sls.de'}],meta:{total_count:2}};
 }),/uniquely resolved/);
 assert.equal(calls,2);
});
test('temporary DOI check rejects anonymous, invalid and wrong-method requests before any API access',async()=>{
 const before={env:process.env.VERCEL_ENV,branch:process.env.VERCEL_GIT_COMMIT_REF,fetch:global.fetch};
 process.env.VERCEL_ENV='preview';process.env.VERCEL_GIT_COMMIT_REF='feat/propstack-property-preview-current';
 let calls=0;global.fetch=()=>{calls++;throw new Error('Must not call Propstack')};
 try{
  for(const authorization of ['', 'Bearer invalid', 'Bearer '+ 'x'.repeat(101)]){
   const res={setHeader(){},status(code){this.code=code;return this},json(body){this.body=body;return this}};
   await checkHandler({method:'POST',headers:{authorization},body:{action:'send-confirmation-test'}},res);
   assert.equal(res.code,404);
  }
  assert.equal(calls,0);
 }finally{
  for(const [name,value] of [['VERCEL_ENV',before.env],['VERCEL_GIT_COMMIT_REF',before.branch]]){
   if(value===undefined) delete process.env[name];else process.env[name]=value;
  }
  global.fetch=before.fetch;
 }
});

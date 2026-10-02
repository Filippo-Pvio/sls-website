import test from 'node:test';
import assert from 'node:assert/strict';
import {newsletterConfig, resolveNewsletterSender, GUIDE_NEWSLETTER_SETUP} from '../lib/guide-newsletter.mjs';

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

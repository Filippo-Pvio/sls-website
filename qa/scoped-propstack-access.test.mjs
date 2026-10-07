import test from 'node:test';
import assert from 'node:assert/strict';
import {scopedPropstackKey} from '../lib/propstack-access.mjs';
import {handler as contact} from '../api/propstack-contact-request.js';
import {handler as guide} from '../api/propstack-guide-request.js';
import {handler as inquiry} from '../api/propstack-test-inquiry.js';
import {handler as search} from '../api/propstack-search-profile.js';

const scoped=['PROPSTACK_CONTACT_API_KEY','PROPSTACK_GUIDES_API_KEY','PROPSTACK_INQUIRY_API_KEY','PROPSTACK_SEARCH_PROFILE_API_KEY','PROPSTACK_DEMAND_API_KEY'];
const variables=['NODE_ENV','VERCEL_ENV','PROPSTACK_API_KEY',...scoped];
async function environment(run) {
  const prior=variables.map(name=>process.env[name]);
  try { for(const name of variables)delete process.env[name];await run(); }
  finally { variables.forEach((name,i)=>prior[i]===undefined?delete process.env[name]:process.env[name]=prior[i]); }
}
for(const deployed of ['production','preview'])test(`${deployed} requires the exact scoped key, never another scope or the legacy key`,()=>environment(async()=>{
  process.env.NODE_ENV='production';process.env.VERCEL_ENV=deployed;process.env.PROPSTACK_API_KEY='legacy';
  for(const name of scoped)assert.equal(scopedPropstackKey(name),undefined);
  process.env.PROPSTACK_INQUIRY_API_KEY='inquiry-only';
  assert.equal(scopedPropstackKey('PROPSTACK_INQUIRY_API_KEY'),'inquiry-only');
  assert.equal(scopedPropstackKey('PROPSTACK_GUIDES_API_KEY'),undefined);
  assert.equal(scopedPropstackKey('PROPSTACK_CONTACT_API_KEY'),undefined);
  assert.equal(scopedPropstackKey('PROPSTACK_SEARCH_PROFILE_API_KEY'),undefined);
  assert.equal(scopedPropstackKey('PROPSTACK_DEMAND_API_KEY'),undefined);
}));
test('local legacy fixtures remain usable; NODE_ENV production alone still fails closed',()=>environment(async()=>{
  process.env.PROPSTACK_API_KEY='local-only';assert.equal(scopedPropstackKey('PROPSTACK_CONTACT_API_KEY'),'local-only');
  process.env.NODE_ENV='production';assert.equal(scopedPropstackKey('PROPSTACK_CONTACT_API_KEY'),undefined);
}));
test('all four CRM form handlers refuse missing scoped keys before a provider call',()=>environment(async()=>{
  Object.assign(process.env,{NODE_ENV:'production',VERCEL_ENV:'production',PROPSTACK_API_KEY:'legacy'});
  const before=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw Error('Provider must not be called');};
  try {
    for(const [handler,method] of [[contact,'GET'],[guide,'GET'],[inquiry,'POST'],[search,'POST']]) {
      const response={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
      await handler({method,headers:{host:'sls-website-eight.vercel.app','content-type':'application/json'},body:{}},response);
      assert.equal(response.code,503);assert.equal(calls,0);
    }
  } finally { global.fetch=before; }
}));

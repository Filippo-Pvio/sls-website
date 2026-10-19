import test from 'node:test';
import assert from 'node:assert/strict';
import {privacyPolicyUrl, guideHostAllowed} from '../lib/website-origin.mjs';
const production={NODE_ENV:'production',VERCEL_ENV:'production'};
test('published canonical guide hosts are enabled without the retired launch flag',()=>{
 for(const host of ['sls.de','www.sls.de','sls-website-eight.vercel.app']) assert.equal(guideHostAllowed(host,production),true);
});
test('privacy evidence ignores forged origin and forwarded host',()=>{
 assert.equal(privacyPolicyUrl({headers:{host:'sls.de',origin:'https://attacker.example','x-forwarded-host':'attacker.example'}},production),'https://sls.de/datenschutz/');
 for(const host of ['sls.de.attacker.example','sls.de:443','attacker.example','sls.de\nattacker.example','localhost:3000']) {
  assert.equal(privacyPolicyUrl({headers:{host}},production),'https://sls-website-eight.vercel.app/datenschutz/');
  assert.equal(guideHostAllowed(host,{...production,SLS_PUBLIC_DOMAIN_ACTIVE:'true'}),false);
 }
});
test('privacy evidence accepts preview hosts only in preview and localhost only outside production',()=>{
 const req={headers:{host:'sls-feature.vercel.app'}};
 assert.equal(privacyPolicyUrl(req,production),'https://sls-website-eight.vercel.app/datenschutz/');
 assert.equal(privacyPolicyUrl(req,{...production,VERCEL_ENV:'preview'}),'https://sls-feature.vercel.app/datenschutz/');
 assert.equal(privacyPolicyUrl({headers:{host:'localhost:3000'}},{NODE_ENV:'development'}),'http://localhost:3000/datenschutz/');
});

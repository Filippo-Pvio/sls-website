import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {sealNewsletter,openNewsletter,requestNewsletter,applyNewsletter,newsletterClaimScript,newsletterUnlockScript,newsletterRevokeScript} from '../lib/newsletter-doi.mjs';
import {GUIDE_MARKETING_CONSENT_VERSION} from '../lib/guide-consent.mjs';
import handler from '../api/newsletter.js';
const env={KV_REST_API_TOKEN:'test-secret'};
function fixture(){
 const values=new Map(),writes=[],mails=[];
 const client={id:12,email:'own-test@sls.de',newsletter:false,accept_contact:false,accept_storage:false,gdpr_status:0,property_mailing:false};
 const store={hash:s=>createHmac('sha256','test-secret').update(String(s)).digest('hex'),command:async([op,k,v,...rest])=>{
  if(op==='GET')return values.get(k)||null;
  if(op==='SET'){if(rest.includes('NX')&&values.has(k))return null;values.set(k,v);return 'OK';}
  if(op==='EVAL'){
   const n=Number(v),keys=rest.slice(0,n),args=rest.slice(n);
   if(k===newsletterClaimScript){if(values.get(keys[0])!==args[0])return 'obsolete';if(values.has(keys[1]))return values.get(keys[1]);values.set(keys[1],'processing');return 'claimed';}
   if(k===newsletterUnlockScript){if(values.get(keys[0])===args[0])values.delete(keys[0]);return 1;}
   if(k===newsletterRevokeScript){values.set(keys[0],'revoked');return 1;}
  }
  throw Error('Unexpected store operation');
 }};
 const propstack=async(path,key,payload,method)=>{
  assert.equal(key,'fixture-api');
  if(path==='tasks'){writes.push(payload);return {id:writes.length};}
  assert.equal(path,'contacts/12');
  if(method==='PUT'){writes.push(payload);Object.assign(client,payload.client);}
  return {...client};
 };
 const requestId=randomUUID();
 const request=()=>requestNewsletter({key:'fixture-api',contactId:12,email:client.email,requestId,propstack,origin:'https://sls-website-eight.vercel.app',store,env,send:async m=>mails.push(m)});
 const tokens=()=>Object.fromEntries(['confirm','unsubscribe'].map(a=>[a,mails[0].html.match(new RegExp('#'+a+'=([A-Za-z0-9_-]+)'))[1]]));
 const apply=(action,token=tokens()[action],override={})=>applyNewsletter({token,action,apiKey:'fixture-api',propstack,store,env,...override});
 return {client,store,values,writes,mails,request,tokens,apply,requestId,propstack};
}
test('request sends one private confirmation and grants no consent; repeated request cannot resend',async()=>{
 const f=fixture();assert.equal(await f.request(),'confirmation_requested');assert.equal(await f.request(),'confirmation_requested');
 assert.equal(f.mails.length,1);assert.equal(f.writes.length,1);assert.equal(f.client.newsletter,false);
 assert.equal(f.writes[0].task.note_type_id,undefined);assert.match(f.mails[0].html,/sieben Tage/);
 assert.ok(!f.mails[0].html.includes('kontakt_profil')&&!f.mails[0].html.includes('/public/cp/'));
 for(const value of f.values.values())assert.ok(!value.includes(f.client.email)&&!value.includes('contact'));
});
test('explicit confirmation changes newsletter only and records exact scope; replay cannot write again',async()=>{
 const f=fixture();await f.request();const before={...f.client};assert.equal((await f.apply('confirm')).ok,true);
 assert.deepEqual(f.client,{...before,newsletter:true});
 const patch=f.writes.find(w=>w.client);assert.deepEqual(patch.client,{newsletter:true});
 assert.ok(f.writes.some(w=>w.task?.title==='SLS_NEWSLETTER_BESTAETIGT'&&w.task.body.includes(GUIDE_MARKETING_CONSENT_VERSION)));
 const count=f.writes.length;await f.apply('confirm');assert.equal(f.writes.length,count);
});
test('withdrawal before confirmation blocks pending link without granting broader contact rights',async()=>{
 const f=fixture();await f.request();await f.apply('unsubscribe');assert.equal(f.client.newsletter,false);
 await assert.rejects(f.apply('confirm'),e=>e.status===409);assert.equal(f.client.accept_contact,false);
});
test('confirmed newsletter can be withdrawn; replay of old confirmation cannot reactivate it',async()=>{
 const f=fixture();await f.request();await f.apply('confirm');await f.apply('unsubscribe');
 assert.equal(f.client.newsletter,false);assert.equal(f.client.accept_contact,false);
 await assert.rejects(f.apply('confirm'),e=>e.status===409);
});
test('confirmation expires after seven days; unsubscribe remains valid after that period',async()=>{
 const f=fixture();await f.request();const data=openNewsletter(f.tokens().confirm,'confirm',env);
 assert.throws(()=>openNewsletter(f.tokens().confirm,'confirm',env,data.time+604800000),e=>e.status===400);
 assert.equal(openNewsletter(f.tokens().unsubscribe,'unsubscribe',env,data.time+20*365*86400000).contact,12);
});
test('tokens reject tampering, wrong purpose, future issue time and wrong secret',async()=>{
 const f=fixture();await f.request();const token=f.tokens().confirm;
 for(const candidate of ['',token.slice(0,-5)+'AAAAA','a'.repeat(1300)])assert.throws(()=>openNewsletter(candidate,'confirm',env));
 assert.throws(()=>openNewsletter(token,'unsubscribe',env));assert.throws(()=>openNewsletter(token,'confirm',{KV_REST_API_TOKEN:'other'}));
 assert.throws(()=>openNewsletter(token,'confirm',env,0));
 const data=openNewsletter(token,'confirm',env);assert.equal(data.contact,12);
 assert.ok(!Buffer.from(token,'base64url').toString('utf8').includes('own-test@sls.de'));
});
test('changed primary email or archived/deleted contact cannot be activated',async()=>{
 for(const update of [{email:'different@sls.de'},{archived:true},{deleted_at:'2026-10-11'}]){
  const f=fixture();await f.request();Object.assign(f.client,update);await assert.rejects(f.apply('confirm'),e=>e.status===400);
  assert.equal(f.writes.filter(w=>w.client).length,0);
 }
});
test('ambiguous CRM update cannot return success or retry a pending confirmation',async()=>{
 const f=fixture();await f.request();
 const remote=async(...args)=>{if(args[3]==='PUT')throw Error('timeout');return f.propstack(...args);};
 await assert.rejects(f.apply('confirm',undefined,{propstack:remote}));
 await assert.rejects(f.apply('confirm'),e=>e.status===409);assert.equal(f.client.newsletter,false);
});
test('concurrent confirmation and withdrawal are serialized on the same contact',async()=>{
 const f=fixture();await f.request();const results=await Promise.allSettled([f.apply('confirm'),f.apply('unsubscribe')]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected')[0].reason.status,409);
 await f.apply('unsubscribe');assert.equal(f.client.newsletter,false);
});
test('new explicit request replaces an older pending request',async()=>{
 const f=fixture();await f.request();const old=f.tokens().confirm;
 await requestNewsletter({key:'fixture-api',contactId:12,email:f.client.email,requestId:randomUUID(),propstack:f.propstack,origin:'https://sls-website-eight.vercel.app',store:f.store,env,send:async m=>f.mails.push(m)});
 await assert.rejects(f.apply('confirm',old),e=>e.status===409);
});
test('mail timeout is not blindly resent and cannot set newsletter preference',async()=>{
 const f=fixture();let calls=0;
 const request=()=>requestNewsletter({key:'fixture-api',contactId:12,email:f.client.email,requestId:f.requestId,propstack:f.propstack,origin:'https://sls-website-eight.vercel.app',store:f.store,env,send:async()=>{calls++;throw Error('timeout');}});
 await assert.rejects(request());assert.equal(await request(),'needs_check');assert.equal(calls,1);assert.equal(f.client.newsletter,false);
});
test('HTTP endpoint rejects foreign origins, malformed data, bad CSRF and closed public host without CRM writes',async()=>{
 const saved={...process.env},oldFetch=global.fetch;let crmCalls=0;
 Object.assign(process.env,{VERCEL_ENV:'production',NODE_ENV:'production',KV_REST_API_URL:'https://fixture-redis.example',KV_REST_API_TOKEN:'fixture'});delete process.env.SLS_PUBLIC_DOMAIN_ACTIVE;
 global.fetch=async(url)=>{if(String(url).includes('api.propstack'))crmCalls++;return {ok:true,json:async()=>({result:1})};};
 const request=async(body,headers={})=>{const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(b){this.body=b;return this;}};
  await handler({method:'POST',headers:{host:'sls-website-eight.vercel.app',origin:'https://sls-website-eight.vercel.app','content-type':'application/json',...headers},body},res);return res;};
 try{
  assert.equal((await request({}, {origin:'https://evil.example'})).code,403);
  assert.equal((await request(null)).code,400);assert.equal((await request({securityToken:'bad'})).code,400);
  assert.equal((await request({}, {host:'sls.de',origin:'https://sls.de'})).code,403);assert.equal(crmCalls,0);
 }finally{global.fetch=oldFetch;for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);}
});

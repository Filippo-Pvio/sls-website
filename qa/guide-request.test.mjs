import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import handler from '../api/propstack-guide-request.js';

const NOTE='SLS_RATGEBER_VERKAUF_ANGEFORDERT';
const host='sls-guide-test.vercel.app';
const names=['VERCEL_ENV','NODE_ENV','PROPSTACK_API_KEY','PROPSTACK_INQUIRY_API_KEY','PROPSTACK_GUIDES_API_KEY'];
async function fixture(run,options={}) {
 const before=names.map(n=>process.env[n]), oldFetch=global.fetch, oldNow=Date.now;
 let now=oldNow();
 Object.assign(process.env,{VERCEL_ENV:'preview',NODE_ENV:'production',PROPSTACK_API_KEY:'fixture-only'});
 delete process.env.PROPSTACK_INQUIRY_API_KEY;delete process.env.PROPSTACK_GUIDES_API_KEY;
 Date.now=()=>now;
 const email=`${randomUUID()}@example.org`,writes=[],activities=[],contacts=options.newContact?[]:[{id:12,email}];
 const calls=[];
 global.fetch=async(url,init)=>{
  const parsed=new URL(url),path=parsed.pathname.replace('/v1/','');calls.push(path);
  assert.equal(parsed.origin,'https://api.propstack.de');
  if(options.failPath===path) return {ok:false,status:503};
  let data;
  if(path==='activity_types')data={data:options.missingType?[]:[{id:88,name:NOTE,category:options.wrongType?'reminder':'note'}]};
  else if(path==='contacts'&&init.method==='GET')data={data:options.conflict?[{id:12,email:'different@example.org'}]:contacts};
  else if(path==='contacts'&&init.method==='POST'){
   const payload=JSON.parse(init.body);writes.push({path,payload});contacts.push({id:12,email:payload.client.email});data={id:12};
  }
  else if(path==='contacts/12')data=contacts[0];
  else if(path==='activities'){
   assert.equal(parsed.searchParams.get('client_id'),'12');assert.equal(parsed.searchParams.get('category_id'),'88');
   data={data:activities};
  }
  else if(path==='tasks'){
   const payload=JSON.parse(init.body);writes.push({path,payload});
   if(options.timeout){throw new Error('timeout after possible write');}
   if(!options.missingConfirmation)activities.push({category_id:88,created_at:new Date(now).toISOString(),activatable:payload.task});
   data=options.missingConfirmation?{}:{id:42,activity_id:43};
  }
  else throw new Error(`Unexpected ${path}`);
  return {ok:true,json:async()=>data};
 };
 const request=async(method='POST',body={},headers={})=>{
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await handler({method,headers:{host,origin:`https://${host}`,'content-type':'application/json','x-vercel-forwarded-for':email,...headers},body},res);
  return res;
 };
 try{
  const ready=await request('GET');now+=2000;
  const payload={guide:'VERKAUF',email,token:ready.body.token,website:''};
  await run({request,ready,payload,writes,activities,calls,advance:ms=>now+=ms});
 }finally{global.fetch=oldFetch;Date.now=oldNow;names.forEach((n,i)=>before[i]===undefined?delete process.env[n]:process.env[n]=before[i]);}
}

test('records approved guide note for existing contact, exposes no CRM IDs, leaves preferences alone',()=>fixture(async({request,ready,payload,writes})=>{
 assert.equal(ready.code,200);assert.deepEqual(ready.body.availableGuides,['VERKAUF']);
 const res=await request('POST',payload);
 assert.equal(res.code,200);assert.equal(res.body.ok,true);assert.equal(res.body.deliveryReady,false);
 assert.deepEqual(Object.keys(res.body).sort(),['deliveryReady','message','ok']);
 assert.equal(writes.length,1);const task=writes[0].payload.task;
 assert.equal(task.title,NOTE);assert.equal(task.note_type_id,88);assert.deepEqual(task.client_ids,[12]);
 assert.match(task.body,/Keine Newsletter-Anmeldung/);assert.match(task.body,/SLS-Anforderungs-ID:/);
 assert.equal(task.client_source_id,undefined);assert.equal(task.is_reminder,undefined);
}));
test('new contact contains only email',()=>fixture(async({request,payload,writes})=>{
 assert.equal((await request('POST',payload)).code,200);
 assert.deepEqual(writes[0],{path:'contacts',payload:{client:{email:payload.email}}});assert.equal(writes.length,2);
},{newContact:true}));
test('double-click and later retry do not create additional notes',()=>fixture(async({request,payload,writes})=>{
 const results=await Promise.all([request('POST',payload),request('POST',payload)]);
 assert.ok(results.every(r=>r.code===200));assert.equal((await request('POST',payload)).code,200);assert.equal(writes.length,1);
}));
test('a new token within cooldown reuses the recent request',()=>fixture(async({request,payload,writes,advance})=>{
 await request('POST',payload);const ready=await request('GET');advance(2000);
 assert.equal((await request('POST',{...payload,token:ready.body.token})).code,200);assert.equal(writes.length,1);
}));
for(const update of [{guide:'ERBSCHAFT'},{guide:'UNKNOWN'},{email:'invalid'},{email:'a@b.c\nHeader:x'},{website:'spam'},{token:'tampered'}])
 test(`rejects invalid payload ${JSON.stringify(update)}`,()=>fixture(async({request,payload,writes})=>{
  assert.equal((await request('POST',{...payload,...update})).code,400);assert.equal(writes.length,0);
 }));
test('rejects expired token and foreign origin',()=>fixture(async({request,payload,writes,advance})=>{
 assert.equal((await request('POST',payload,{origin:'https://elsewhere.example'})).code,403);
 advance(31*60*1000);assert.equal((await request('POST',payload)).code,400);assert.equal(writes.length,0);
}));
test('missing category fails before any contact writes',()=>fixture(async({ready,writes})=>{
 assert.equal(ready.code,503);assert.equal(writes.length,0);
},{missingType:true}));
test('wrong activity type is never used as the trigger',()=>fixture(async({ready,writes})=>{
 assert.equal(ready.code,503);assert.equal(writes.length,0);
},{wrongType:true}));
test('ambiguous/secondary email cannot alter another contact',()=>fixture(async({request,payload,writes})=>{
 assert.equal((await request('POST',payload)).code,502);assert.equal(writes.length,0);
},{conflict:true}));
test('failed duplicate lookup prevents note creation',()=>fixture(async({request,payload,writes})=>{
 assert.equal((await request('POST',payload)).code,502);assert.equal(writes.length,0);
},{failPath:'activities'}));
for(const failure of ['timeout','missingConfirmation'])test(`${failure}: never claims success or automatically repeats uncertain note write`,()=>fixture(async({request,payload,writes})=>{
 assert.equal((await request('POST',payload)).code,502);
 assert.equal((await request('POST',payload)).code,502);assert.equal(writes.length,1);
},{[failure]:true}));
test('production is not enabled by the preview implementation',()=>fixture(async({request,payload,writes})=>{
 process.env.VERCEL_ENV='production';assert.equal((await request('POST',payload)).code,403);assert.equal(writes.length,0);
}));
test('rate limit caps repeated requests',()=>fixture(async({request,payload})=>{
 for(let i=0;i<8;i++)assert.equal((await request('POST',payload)).code,200);
 assert.equal((await request('POST',payload)).code,429);
}));

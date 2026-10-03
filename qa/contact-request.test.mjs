import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import handler from '../api/propstack-contact-request.js';
import {CONTACT_TOPICS,CALLBACK_TITLE,CONTACT_WINDOWS,CONTACT_PRIVACY_VERSION} from '../lib/contact-request.mjs';
const titles=[...Object.values(CONTACT_TOPICS).map(x=>x.title),CALLBACK_TITLE];
async function fixture(run,options={}) {
 const vars=['NODE_ENV','VERCEL_ENV','PROPSTACK_API_KEY','PROPSTACK_CONTACT_API_KEY','PROPSTACK_INQUIRY_API_KEY'];
 const env=vars.map(x=>process.env[x]),fetchBefore=global.fetch,nowBefore=Date.now;let now=Date.now();
 Object.assign(process.env,{NODE_ENV:'production',VERCEL_ENV:'production',PROPSTACK_API_KEY:'test-only'});delete process.env.PROPSTACK_CONTACT_API_KEY;delete process.env.PROPSTACK_INQUIRY_API_KEY;Date.now=()=>now;
 const email=`${randomUUID()}@example.org`,contacts=options.newContact?[]:[{id:17,first_name:'Anna',last_name:options.conflict?'Andere':'Muster',email}],notes=[],writes=[];
 let failed=false;
 global.fetch=async(url,init)=>{
  const u=new URL(url),path=u.pathname.replace('/v1/','');assert.equal(u.origin,'https://api.propstack.de');let data;
  if(path==='activity_types') data={data:titles.filter(t=>t!==options.missing).map((name,i)=>({id:100+i,name,category:'for_notes'}))};
  else if(path==='contacts'&&init.method==='GET')data={data:contacts};
  else if(path==='contacts'&&init.method==='POST'){const payload=JSON.parse(init.body);writes.push({path,payload});contacts.push({id:17,...payload.client});data=contacts[0];}
  else if(path==='contacts/17')data=contacts[0];
  else if(path==='activities')data={data:notes};
  else if(path==='tasks'){
   const payload=JSON.parse(init.body);writes.push({path,payload});notes.push({category_id:payload.task.note_type_id,activatable:payload.task});
   if(options.callbackTimeout&&payload.task.title===CALLBACK_TITLE&&!failed){failed=true;throw new Error('Timeout after write');}
   data={id:notes.length};
  }else throw new Error(`Unexpected ${path}`);
  return {ok:true,json:async()=>data};
 };
 const request=async(method='POST',body={},extra={})=>{
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await handler({method,headers:{host:'sls-website-eight.vercel.app',origin:'https://sls-website-eight.vercel.app','content-type':'application/json','x-vercel-forwarded-for':email,...extra},body},res);return res;
 };
 try{
  const ready=await request('GET');assert.equal(ready.code,200);now+=2000;
  const payload={topic:'sale',firstName:'Anna',lastName:'Muster',email,phone:'0123456789',method:'email',message:'Test <script>unsafe</script>',privacy:true,privacyVersion:CONTACT_PRIVACY_VERSION,token:ready.body.token};
  await run({payload,ready,request,notes,writes});
 }finally{vars.forEach((x,i)=>env[i]===undefined?delete process.env[x]:process.env[x]=env[i]);global.fetch=fetchBefore;Date.now=nowBefore;}
}
test('email request creates one exact topic note, without callback or contact mutation',()=>fixture(async({request,payload,writes,notes})=>{
 assert.equal((await request('POST',payload)).code,200);assert.equal(writes.length,1);assert.equal(notes[0].activatable.title,'Website Kontakt – Verkaufswunsch');assert.ok(notes[0].activatable.body.includes('&lt;script&gt;'));assert.ok(!notes[0].activatable.body.includes('Rückrufzeitfenster'));
}));
test('callback creates both exact categories with requested time window and phone',()=>fixture(async({request,payload,notes})=>{
 for(const [key,label] of Object.entries(CONTACT_WINDOWS)){
  const ready=await request('GET'); // token age uses fixture clock, use original for a single request.
  assert.ok(ready.body.callbackAvailable);assert.ok(label);
 }
 assert.equal((await request('POST',{...payload,topic:'valuation',method:'callback',window:'late'})).code,200);
 assert.deepEqual(notes.map(x=>x.activatable.title),['Website Kontakt – Bewertungsanfrage',CALLBACK_TITLE]);assert.ok(notes.every(x=>x.activatable.body.includes('16–18 Uhr')&&x.activatable.body.includes(payload.phone)));
}));
test('missing callback category makes no contact or note writes',()=>fixture(async({request,payload,writes,ready})=>{
 assert.equal(ready.body.callbackAvailable,false);assert.equal((await request('POST',{...payload,method:'callback',window:'morning'})).code,503);assert.equal(writes.length,0);
},{missing:CALLBACK_TITLE,newContact:true}));
test('ambiguous identity does not overwrite existing contact or attach notes',()=>fixture(async({request,payload,writes})=>{
 assert.equal((await request('POST',payload)).code,409);assert.equal(writes.length,0);
},{conflict:true}));
test('new contacts retain only supplied identity, no consent or marketing fields',()=>fixture(async({request,payload,writes})=>{
 assert.equal((await request('POST',payload)).code,200);assert.deepEqual(Object.keys(writes[0].payload.client).sort(),['email','first_name','last_name','phone']);
},{newContact:true}));
test('repeated submission does not trigger duplicate notes',()=>fixture(async({request,payload,writes})=>{
 assert.equal((await request('POST',payload)).code,200);assert.equal((await request('POST',payload)).code,200);assert.equal(writes.length,1);
}));
test('retry after unconfirmed callback write reconciles both notes without duplication',()=>fixture(async({request,payload,notes,writes})=>{
 const body={...payload,method:'callback',window:'afternoon'};assert.equal((await request('POST',body)).code,502);assert.equal((await request('POST',body)).code,200);assert.equal(notes.length,2);assert.equal(writes.length,2);
},{callbackTimeout:true}));
test('rejects missing callback phone, arbitrary time, missing consent and cross-origin before writes',()=>fixture(async({request,payload,writes})=>{
 for(const patch of [{method:'callback',phone:'',window:'morning'},{method:'callback',window:'night'},{privacy:false},{topic:'general',message:''}])assert.equal((await request('POST',{...payload,...patch})).code,400);
 assert.equal((await request('POST',payload,{origin:'https://other.example'})).code,403);assert.equal(writes.length,0);
}));

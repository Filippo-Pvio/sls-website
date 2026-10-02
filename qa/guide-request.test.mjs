import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import handler from '../api/propstack-guide-request.js';

const NOTE='SLS_RATGEBER_VERKAUF_ANGEFORDERT';
const host='sls-guide-test.vercel.app';
const names=['VERCEL_ENV','NODE_ENV','PROPSTACK_API_KEY','PROPSTACK_INQUIRY_API_KEY','PROPSTACK_GUIDES_API_KEY','PROPSTACK_GUIDES_DOI_BROKER_ID','PROPSTACK_GUIDES_DOI_SNIPPET_ID','PROPSTACK_GUIDES_DOI_VERIFIED'];
async function fixture(run,options={}) {
 const before=names.map(n=>process.env[n]), oldFetch=global.fetch, oldNow=Date.now;
 let now=oldNow();
 Object.assign(process.env,{VERCEL_ENV:'preview',NODE_ENV:'production',PROPSTACK_API_KEY:'fixture-only'});
 delete process.env.PROPSTACK_INQUIRY_API_KEY;delete process.env.PROPSTACK_GUIDES_API_KEY;
 for(const name of names.slice(5)) delete process.env[name];
 Date.now=()=>now;
 const email=`${randomUUID()}@example.org`,writes=[],activities=[],contacts=options.newContact?[]:[{id:12,email,first_name:options.firstName ?? 'Anna',last_name:options.lastName ?? 'Muster'}];
 const calls=[];
 global.fetch=async(url,init)=>{
  const parsed=new URL(url),path=parsed.pathname.replace('/v1/','');calls.push(path);
  assert.equal(parsed.origin,'https://api.propstack.de');
  if(options.failPath===path) return {ok:false,status:503,text:async()=>'Service unavailable'};
  let data;
  if(path==='activity_types')data={data:options.missingType?[]:[{id:741093,name:NOTE,category:options.wrongType?'reminder':'for_notes'},...(options.marketing?[{id:123,name:'SLS_NEWSLETTER_DOI_ANGEFORDERT',category:'for_notes'}]:[])]};
  else if(path==='contacts'&&init.method==='GET')data={data:options.conflict?[{id:12,email:'different@example.org'}]:contacts};
  else if(path==='contacts'&&init.method==='POST'){
   const payload=JSON.parse(init.body);writes.push({path,payload});contacts.push({id:12,...payload.client});data={id:12};
  }
  else if(path==='contacts/12')data=contacts[0];
  else if(path==='activities'){
   assert.equal(parsed.searchParams.get('client_id'),'12');assert.ok([null,'741093'].includes(parsed.searchParams.get('category_id')));
   data={data:activities};
  }
  else if(path==='messages'){
   writes.push({path,payload:JSON.parse(init.body)});
   if(options.messageTimeout) throw new Error('message result uncertain');
   data={ok:true,id:99};
  }
  else if(path==='tasks'){
   const payload=JSON.parse(init.body);writes.push({path,payload});
   if(options.timeout || (options.newsletterTimeout && payload.task.note_type_id===123)){throw new Error('timeout after possible write');}
   if(!options.missingConfirmation)activities.push({category_id:payload.task.note_type_id ?? null,created_at:new Date(now).toISOString(),activatable:payload.task});
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
  const payload={guide:'VERKAUF',email,firstName:'Anna',lastName:'Muster',token:ready.body.token,website:'',privacyAcknowledged:true,privacyVersion:'2026-10-02-v1'};
  await run({request,ready,payload,writes,activities,calls,contacts,advance:ms=>now+=ms});
 }finally{global.fetch=oldFetch;Date.now=oldNow;names.forEach((n,i)=>before[i]===undefined?delete process.env[n]:process.env[n]=before[i]);}
}

test('records approved guide note for existing contact, exposes no CRM IDs, leaves preferences alone',()=>fixture(async({request,ready,payload,writes})=>{
 assert.equal(ready.code,200);assert.deepEqual(ready.body.availableGuides,['VERKAUF']);
 const res=await request('POST',payload);
 assert.equal(res.code,200);assert.equal(res.body.ok,true);assert.equal(res.body.deliveryReady,true);
 assert.deepEqual(Object.keys(res.body).sort(),['deliveryReady','message','newsletterStatus','ok','status']);
 assert.equal(writes.length,1);const task=writes[0].payload.task;
 assert.equal(task.title,NOTE);assert.equal(task.note_type_id,741093);assert.deepEqual(task.client_ids,[12]);
 assert.match(task.body,/Angegebener Name: Anna Muster/);assert.match(task.body,/kein Nachweis einer bestätigten Newsletter-Anmeldung/);assert.match(task.body,/SLS-Anforderungs-ID:/);
 assert.equal(task.client_source_id,undefined);assert.equal(task.is_reminder,undefined);
}));
test('new contact contains names and email without marketing flags',()=>fixture(async({request,payload,writes})=>{
 assert.equal((await request('POST',payload)).code,200);
 assert.deepEqual(writes[0],{path:'contacts',payload:{client:{email:payload.email,first_name:payload.firstName,last_name:payload.lastName}}});assert.equal(writes.length,2);
},{newContact:true}));
test('double-click and later retry do not create additional notes',()=>fixture(async({request,payload,writes})=>{
 const results=await Promise.all([request('POST',payload),request('POST',payload)]);
 assert.ok(results.every(r=>r.code===200));assert.equal((await request('POST',payload)).code,200);assert.equal(writes.length,1);
}));
test('a new token within cooldown reuses the recent request',()=>fixture(async({request,payload,writes,advance})=>{
 await request('POST',payload);const ready=await request('GET');advance(2000);
 assert.equal((await request('POST',{...payload,token:ready.body.token})).code,200);assert.equal(writes.length,1);
}));
for(const update of [{firstName:''},{lastName:'  '},{firstName:null},{lastName:'x'.repeat(101)},{firstName:'Anna\nInjected'},{guide:'ERBSCHAFT'},{guide:'UNKNOWN'},{email:'invalid'},{email:'a@b.c\nHeader:x'},{website:'spam'},{token:'tampered'}])
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

test('different name records only a review note, preserves contact, and discloses no stored identity',()=>fixture(async({request,payload,writes,contacts})=>{
 const before=structuredClone(contacts);
 const res=await request('POST',{...payload,firstName:'Eva',lastName:'Anders'});
 assert.equal(res.code,200);assert.equal(res.body.status,'review_required');
 assert.match(res.body.message,/nicht eindeutig zuordnen/);
 assert.doesNotMatch(JSON.stringify(res.body),/Anna|Muster|741093|contactId/);
 assert.deepEqual(contacts,before);assert.equal(writes.length,1);
 const task=writes[0].payload.task;
 assert.equal(task.title,'SLS_RATGEBER_VERKAUF_PRUEFUNG');assert.equal(task.note_type_id,undefined);
 assert.deepEqual(task.client_ids,[12]);assert.match(task.body,/KEIN VERSAND FREIGEGEBEN/);
 assert.match(task.body,/Eva Anders/);
}));
test('case, repeated spaces and canonically equivalent Unicode match',()=>fixture(async({request,payload,writes})=>{
 const res=await request('POST',{...payload,firstName:'  anna   maria ',lastName:'MU\u0308LLER'});
 assert.equal(res.body.status,'recorded');assert.equal(writes[0].payload.task.note_type_id,741093);
},{firstName:'Anna Maria',lastName:'Müller'}));
test('missing stored names require review',()=>fixture(async({request,payload,writes})=>{
 assert.equal((await request('POST',payload)).body.status,'review_required');
 assert.equal(writes[0].payload.task.note_type_id,undefined);
},{firstName:''}));
test('a review retry is deduplicated but corrected matching names can create the dispatch note',()=>fixture(async({request,payload,writes})=>{
 const mismatch={...payload,firstName:'Eva'};
 await request('POST',mismatch);await request('POST',mismatch);
 assert.equal(writes.length,1);
 assert.equal((await request('POST',payload)).body.status,'recorded');
 assert.equal(writes.length,2);assert.equal(writes[1].payload.task.note_type_id,741093);
}));
test('a recent dispatch note cannot hide a different-name request',()=>fixture(async({request,payload,writes})=>{
 await request('POST',payload);
 assert.equal((await request('POST',{...payload,lastName:'Anders'})).body.status,'review_required');
 assert.equal(writes.length,2);assert.equal(writes[1].payload.task.note_type_id,undefined);
}));
test('concurrent different names receive their own result',()=>fixture(async({request,payload,writes})=>{
 const results=await Promise.all([request('POST',{...payload,firstName:'Eva'}),request('POST',payload)]);
 assert.deepEqual(results.map(r=>r.body.status),['review_required','recorded']);assert.equal(writes.length,2);
}));
for(const failure of ['timeout','missingConfirmation'])test(`review ${failure}: cannot report saved or blindly retry`,()=>fixture(async({request,payload,writes})=>{
 const mismatch={...payload,firstName:'Eva'};
 assert.equal((await request('POST',mismatch)).code,502);
 assert.equal((await request('POST',mismatch)).code,502);assert.equal(writes.length,1);
},{[failure]:true}));
test('submitted review names are HTML escaped',()=>fixture(async({request,payload,writes})=>{
 await request('POST',{...payload,firstName:'<script>alert(1)</script>'});
 assert.doesNotMatch(writes[0].payload.task.body,/<script>/);
 assert.match(writes[0].payload.task.body,/&lt;script&gt;/);
}));

const optIn=payload=>({...payload,marketingConsent:true,consentVersion:'2026-10-02-v2'});
test('missing newsletter category keeps only newsletter unavailable',()=>fixture(async({request,ready,payload,writes})=>{
 assert.equal(ready.body.marketingAvailable,false);
 assert.equal((await request('POST',optIn(payload))).code,503);assert.equal(writes.length,0);
 assert.equal((await request('POST',payload)).code,200);
}));
for(const update of [{marketingConsent:'true'},{marketingConsent:1},{marketingConsent:null},{marketingConsent:true},{marketingConsent:true,consentVersion:'old'}])
 test(`rejects ambiguous or stale consent ${JSON.stringify(update)}`,()=>fixture(async({request,payload,writes})=>{
  assert.equal((await request('POST',{...payload,...update})).code,400);assert.equal(writes.length,0);
 },{marketing:true}));
test('selected consent creates the categorized automation trigger; never sends directly or activates contact fields',()=>fixture(async({request,ready,payload,writes,contacts})=>{
 assert.equal(ready.body.marketingAvailable,true);
 contacts[0].newsletter=false;contacts[0].accept_contact=false;const before=structuredClone(contacts);
 const res=await request('POST',optIn(payload));
 assert.equal(res.body.newsletterStatus,'confirmation_requested');assert.match(res.body.message,/separate Bestätigungsmail/);
 assert.deepEqual(contacts,before);
 assert.equal(writes.length,2);
 assert.match(writes[1].payload.task.body,/Einwilligungstext, Version 2026-10-02-v2/);
 assert.match(writes[1].payload.task.body,/Double-Opt|Bestätigung noch ausstehend/);
 assert.equal(writes[1].payload.task.note_type_id,123);
 assert.equal(writes[1].payload.task.title,'SLS_NEWSLETTER_DOI_ANGEFORDERT');
 assert.equal(writes.filter(w=>w.path==='messages').length,0);
 assert.ok(writes.every(w=>w.path!=='contacts'));
 await request('POST',optIn(payload));assert.equal(writes.length,2);
},{marketing:true}));
test('unchecked consent preserves existing newsletter settings and creates no DOI email',()=>fixture(async({request,payload,writes,contacts})=>{
 contacts[0].newsletter=true;contacts[0].accept_contact=true;const before=structuredClone(contacts);
 const result=await request('POST',{...payload,marketingConsent:false});
 assert.equal(result.body.newsletterStatus,'not_requested');assert.equal(writes.length,1);assert.deepEqual(contacts,before);
},{marketing:true}));
test('newsletter can be requested after an earlier guide-only request without resending guide',()=>fixture(async({request,payload,writes})=>{
 await request('POST',payload);await request('POST',optIn(payload));
 assert.equal(writes.filter(w=>w.payload.task?.note_type_id===741093).length,1);
 assert.equal(writes.filter(w=>w.payload.task?.note_type_id===123).length,1);
 assert.equal(writes.filter(w=>w.path==='messages').length,0);
},{marketing:true}));
test('name mismatch records selection for review but sends no DOI or guide and changes no contact flags',()=>fixture(async({request,payload,writes})=>{
 const result=await request('POST',optIn({...payload,firstName:'Andere'}));
 assert.equal(result.body.status,'review_required');assert.equal(result.body.newsletterStatus,'review_required');
 assert.equal(writes.length,1);assert.equal(writes[0].payload.task.note_type_id,undefined);
 assert.match(writes[0].payload.task.body,/Newsletter-Anmeldung bleibt bis zur Klärung/);
},{marketing:true}));
test('uncertain trigger write preserves guide success and avoids blind repeat',()=>fixture(async({request,payload,writes})=>{
 for(let i=0;i<2;i++){
  const result=await request('POST',optIn(payload));
  assert.equal(result.code,200);assert.equal(result.body.status,'recorded');assert.equal(result.body.newsletterStatus,'needs_check');
  assert.match(result.body.message,/Ratgeberanforderung ist bereits aufgenommen/);
 }
 assert.equal(writes.filter(w=>w.payload.task?.note_type_id===123).length,1);
 assert.equal(writes.filter(w=>w.path==='messages').length,0);
},{marketing:true,newsletterTimeout:true}));

test('old uncategorized intention is not reported as an automation trigger',()=>fixture(async({request,payload,writes,activities})=>{
 await request('POST',optIn(payload));
 const activity=activities.find(a=>a.category_id===123);
 activity.category_id=null;delete activity.activatable.note_type_id;
 const res=await request('POST',optIn(payload));
 assert.equal(res.body.newsletterStatus,'needs_check');assert.equal(writes.length,2);
},{marketing:true}));
test('concurrent opt-ins create one guide and one newsletter trigger',()=>fixture(async({request,payload,writes})=>{
 const res=await Promise.all([request('POST',optIn(payload)),request('POST',optIn(payload))]);
 assert.ok(res.every(r=>r.body.newsletterStatus==='confirmation_requested'));assert.equal(writes.length,2);
},{marketing:true}));

for(const update of [{privacyAcknowledged:undefined},{privacyAcknowledged:false},{privacyAcknowledged:'true'},{privacyAcknowledged:1},{privacyVersion:undefined},{privacyVersion:'old'}])test(`rejects missing or invalid privacy acknowledgement ${JSON.stringify(update)}`,()=>fixture(async({request,payload,writes,calls})=>{
 const count=calls.length;
 const res=await request('POST',{...payload,...update,marketingConsent:true,consentVersion:'2026-10-02-v2'});
 assert.equal(res.code,400);assert.equal(writes.length,0);assert.equal(calls.length,count);
},{marketing:true}));
test('privacy acknowledgement is recorded in the guide note without marketing permission',()=>fixture(async({request,payload,writes,contacts})=>{
 const before=structuredClone(contacts);
 await request('POST',payload);
 assert.equal(writes.length,1);assert.deepEqual(contacts,before);
 const body=writes[0].payload.task.body;
 assert.match(body,/Pflicht-Checkbox aktiv bestätigt.*2026-10-02-v1/);
 assert.match(body,/Ich habe die Datenschutzerklärung zur Kenntnis genommen/);
 assert.match(body,/https:\/\/sls.de\/datenschutz\//);
 assert.match(body,/keine Newsletter-Einwilligung/);
 assert.equal(writes[0].payload.task.note_type_id,741093);
}));

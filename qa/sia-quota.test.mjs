import test from 'node:test';
import assert from 'node:assert/strict';
import { quotaDay, reserveQuota, reserveScript, settleScript } from '../api/lib/sia-quota.js';
import handler from '../api/sia-ask.js';
const env = { UPSTASH_REDIS_REST_URL: 'https://quota.example', UPSTASH_REDIS_REST_TOKEN: 'test-secret' };
const req = cookie => ({ headers: { cookie } });
const response = () => ({ headers: {}, setHeader(k,v) { this.headers[k]=v; }, end(raw) { this.data=JSON.parse(raw); } });
const cookie = res => res.headers['Set-Cookie'].split(';')[0];
// Atomic store adapter exercises HTTP orchestration; production Lua is additionally reviewed.
function store() {
 const used=new Map(), pending=new Map(), attempts=new Map(); let calls=0;
 const commands=[];
 return { commands, get calls(){return calls;}, async fetch(url,options) {
  calls++; assert.equal(url, env.UPSTASH_REDIS_REST_URL); assert.equal(options.headers.Authorization, 'Bearer test-secret');
  const command=JSON.parse(options.body); commands.push(command);
  const [,script,count,...params]=command, keys=params.slice(0,count), args=params.slice(count);
  let result;
  if (script===reserveScript) {
   const [now,id,limit]=args; const reservations=pending.get(keys[1])||new Map(); pending.set(keys[1],reservations);
   for(const [id,until] of reservations) if(until<=now) reservations.delete(id);
   const n=used.get(keys[0])||0;
   result=[n>=limit?0:n+reservations.size>=limit?-1:1,n];
   if(result[0]===1) reservations.set(id,now+90);
  } else if(script===settleScript) {
   if(pending.get(keys[1])?.delete(args[0]) && args[1]==='1') used.set(keys[0],(used.get(keys[0])||0)+1);
   result=used.get(keys[0])||0;
  } else { result=(attempts.get(keys[0])||0)+1; attempts.set(keys[0],result); }
  return Response.json({result});
 }};
}
test('Berlin reset follows winter, summer and both DST transition days',()=>{
 for(const [now,reset] of [
  ['2026-01-04T12:00:00Z','2026-01-04T23:00:00Z'],
  ['2026-07-04T12:00:00Z','2026-07-04T22:00:00Z'],
  ['2026-03-28T23:30:00Z','2026-03-29T22:00:00Z'],
  ['2026-10-24T22:30:00Z','2026-10-25T23:00:00Z']
 ]) assert.equal(new Date(quotaDay(Date.parse(now)).resetAt).toISOString(),new Date(reset).toISOString());
});
test('signed cookie, ten successes, refunds, independent browser and next day',async()=>{
 const db=store(), now=Date.parse('2026-10-04T10:00:00Z'), options={env,now,fetcher:db.fetch};
 const res=response(); let reservation=await reserveQuota(req(),res,options); const identity=cookie(res);
 assert.match(res.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Strict/);
 assert.equal((await reservation.settle(false)).remaining,10);
 for(let i=0;i<10;i++) { reservation=await reserveQuota(req(identity),response(),options); assert.equal((await reservation.settle(true)).remaining,9-i); }
 assert.equal((await reserveQuota(req(identity),response(),options)).blocked,'daily_limit');
 assert.equal((await (await reserveQuota(req(),response(),options)).settle(true)).remaining,9);
 assert.equal((await (await reserveQuota(req(identity),response(),{...options,now:now+86400000})).settle(true)).remaining,9);
 const tampered=response(); await reserveQuota(req(identity+'x'),tampered,options); assert.notEqual(cookie(tampered),identity);
});
test('parallel requests reserve capacity; duplicate settlement and expired reservations are safe',async()=>{
 const db=store(), now=Date.parse('2026-10-04T10:00:00Z'), options={env,now,fetcher:db.fetch}, res=response();
 await (await reserveQuota(req(),res,options)).settle(false);
 const requests=await Promise.all(Array.from({length:15},()=>reserveQuota(req(cookie(res)),response(),options)));
 assert.equal(requests.filter(r=>!r.blocked).length,10); assert.equal(requests.filter(r=>r.blocked==='pending_limit').length,5);
 const accepted=requests.filter(r=>!r.blocked); await accepted[0].settle(true); assert.equal((await accepted[0].settle(true)).remaining,9);
 await accepted[1].settle(false);
 assert.equal((await reserveQuota(req(cookie(res)),response(),{...options,now:now+91000})).blocked,undefined);
});
test('proxy blocks the eleventh upstream call and does not count technical errors',async()=>{
 const originalFetch=global.fetch; const db=store(); let upstreamCalls=0; let fail=false;
 Object.assign(process.env,env,{VERCEL_ENV:'preview'});
 global.fetch=async(url,options)=>{
  if(url===env.UPSTASH_REDIS_REST_URL) return db.fetch(url,options);
  upstreamCalls++; if(fail) throw Error('private diagnostic');
  return Response.json({provider:'OpenAI',answer:'Eine Antwort.',sources:[]});
 };
 const call=async identity=>{const res=response(); await handler({method:'POST',headers:{'content-type':'application/json',cookie:identity},body:{question:'Wie läuft der Verkauf?'}},res);return res;};
 try {
  let result=await call(); const identity=cookie(result); assert.equal(result.data.quota.remaining,9);
  fail=true; assert.equal((await call(identity)).statusCode,502); fail=false;
  for(let i=0;i<9;i++) assert.equal((await call(identity)).statusCode,200);
  result=await call(identity); assert.equal(result.statusCode,429); assert.equal(result.data.code,'daily_limit'); assert.equal(upstreamCalls,11);
  global.fetch=async()=>{throw Error('store unavailable');}; assert.equal((await call(identity)).statusCode,503);
 } finally { global.fetch=originalFetch; for(const key of [...Object.keys(env),'VERCEL_ENV']) delete process.env[key]; }
});

test('pure OpenAI clarification consumes no daily answer',async()=>{
 const original=global.fetch,db=store();Object.assign(process.env,env,{VERCEL_ENV:'preview',OPENAI_API_KEY:'test-key'});
 global.fetch=async(url,options)=>url===env.UPSTASH_REDIS_REST_URL?db.fetch(url,options):Response.json({provider:'OpenAI',kind:'clarification',reason:'clarification',answer:'Geht es um Kauf oder Verkauf?',sources:[]});
 try {const res=response();await handler({method:'POST',headers:{'content-type':'application/json'},body:{question:'Was muss ich beachten?'}},res);assert.equal(res.statusCode,200);assert.equal(res.data.kind,'clarification');assert.equal(res.data.quota.remaining,10);}finally{global.fetch=original;for(const key of [...Object.keys(env),'VERCEL_ENV','OPENAI_API_KEY'])delete process.env[key];}
});

// Exercise the real property loader and quota orchestration with synthetic HTTP responses.
const propertyContext = { type: 'property', propertyId: '123' };
const listing = { id:123, title:'Wohnung in Essen', city:'Essen', marketing_type:'BUY',
 archived:false, status:{id:7,name:'Vermarktung'}, price:150000, living_space:80,
 number_of_rooms:3, rs_type:'APARTMENT', images:[] };
async function withProxy(run) {
 const beforeFetch=global.fetch;
 const settings={...env,VERCEL_ENV:'preview',PROPSTACK_PUBLIC_API_KEY:'fixture-only'};
 const before=Object.fromEntries(Object.keys(settings).map(key=>[key,process.env[key]]));
 Object.assign(process.env,settings);
 const db=store();
 const state={db,upstreamCalls:0,propertyMode:'active',quotaFetch:db.fetch,
  upstream:()=>Response.json({provider:'OpenAI',answer:'Eine Antwort.',sources:[]})};
 global.fetch=async(url,options)=>{
  if(url===env.UPSTASH_REDIS_REST_URL) return state.quotaFetch(url,options);
  const u=new URL(url);
  if(u.origin==='https://api.propstack.de') {
   if(state.propertyMode==='error') return new Response(null,{status:401});
   if(u.pathname.endsWith('/property_statuses')) return Response.json([{id:7,name:'Vermarktung'}]);
   if(u.pathname.endsWith('/units')) return Response.json({data:state.propertyMode==='active'?[listing]:[]});
   if(u.pathname.endsWith('/units/123')) return Response.json(listing);
   throw Error('Unexpected property URL');
  }
  assert.equal(url,'https://frag-sls.vercel.app/api/ask');
  state.upstreamCalls++;
  return state.upstream();
 };
 state.call=async(question='Wie läuft der Verkauf?',pageContext,identity)=>{
  const res=response();
  await handler({method:'POST',headers:{'content-type':'application/json',cookie:identity},
   body:{question,...(pageContext?{pageContext}:{})}},res);
  return res;
 };
 try { await run(state); }
 finally {
  global.fetch=beforeFetch;
  for(const [key,value] of Object.entries(before)) {
   if(value===undefined) delete process.env[key]; else process.env[key]=value;
  }
 }
}
const reservations = db => db.commands.filter(command=>command[1]===reserveScript);
const settlements = db => db.commands.filter(command=>command[1]===settleScript);

test('property answers and missing-information replies each reserve and charge exactly once',async()=>{
 await withProxy(async({call,db})=>{
  let identity;
  const questions=['Was ist der Kaufpreis?','Wie groß ist die Wohnfläche?',
   'Welche Ausstattung gibt es?','Was steht im Energieausweis?','Ist Glasfaser verfügbar?'];
  for(const [i,question] of questions.entries()) {
   const res=await call(question,propertyContext,identity); identity=cookie(res);
   assert.equal(res.statusCode,200);
   assert.equal(res.data.reason,i===4?'property_context_missing':'property_context');
   assert.equal(res.data.quota.remaining,9-i);
   assert.equal(reservations(db).length,i+1);
   assert.equal(settlements(db).length,i+1);
   assert.equal(settlements(db).at(-1)[6],'1');
  }
 });
});

test('property, general and mixed questions share the same ten-answer daily limit',async t=>{
 for(const mode of ['property','general','mixed']) await t.test(mode,async()=>{
  await withProxy(async(state)=>{
   let identity;
   for(let i=0;i<10;i++) {
    const context=mode==='property'||(mode==='mixed'&&i%2===0)?propertyContext:undefined;
    const res=await state.call(context?'Was ist der Kaufpreis?':undefined,context,identity);
    identity=cookie(res); assert.equal(res.statusCode,200); assert.equal(res.data.quota.remaining,9-i);
   }
   for(const [question,context] of [['Was ist der Kaufpreis?',propertyContext],['Ist Glasfaser verfügbar?',propertyContext],[undefined,undefined]]) {
    const res=await state.call(question,context,identity);
    assert.equal(res.statusCode,429); assert.equal(res.data.code,'daily_limit');
    assert.equal(res.data.quota.remaining,0); assert.ok(Number(res.headers['Retry-After'])>0);
    assert.equal(res.data.answer,undefined);
   }
   assert.equal(settlements(state.db).length,10);
   assert.equal(state.upstreamCalls,mode==='property'?0:mode==='general'?10:5);
  });
 });
});

test('invalid or unavailable property requests never reserve capacity',async()=>{
 await withProxy(async(state)=>{
  assert.equal((await state.call('a',propertyContext)).statusCode,400);
  assert.equal((await state.call('Was ist der Preis?',{...propertyContext,propertyId:'invalid'})).statusCode,400);
  state.propertyMode='missing'; assert.equal((await state.call('Was ist der Preis?',propertyContext)).statusCode,409);
  state.propertyMode='error'; assert.equal((await state.call('Was ist der Preis?',propertyContext)).statusCode,409);
  assert.equal(state.db.calls,0); assert.equal(state.upstreamCalls,0);
 });
});

test('quota reservation failure blocks both property response paths',async()=>{
 await withProxy(async(state)=>{
  state.quotaFetch=async()=>{throw Error('private store diagnostic');};
  for(const question of ['Was ist der Preis?','Ist Glasfaser verfügbar?']) {
   const res=await state.call(question,propertyContext);
   assert.equal(res.statusCode,503); assert.equal(res.data.answer,undefined);
   assert.doesNotMatch(JSON.stringify(res.data),/private/);
  }
  assert.equal(state.upstreamCalls,0);
 });
});

test('failed property settlement releases capacity; lost acknowledgement cannot double count',async t=>{
 for(const applied of [false,true]) await t.test(applied?'acknowledgement lost':'write failed',async()=>{
  await withProxy(async(state)=>{
   const quotaFetch=state.quotaFetch; let failed=false;
   state.quotaFetch=async(url,options)=>{
    const command=JSON.parse(options.body);
    if(command[1]===settleScript&&command[6]==='1'&&!failed) {
     failed=true; if(applied) await quotaFetch(url,options);
     throw Error('private settlement diagnostic');
    }
    return quotaFetch(url,options);
   };
   const res=await state.call('Was ist der Preis?',propertyContext);
   assert.equal(res.statusCode,502); assert.equal(res.data.answer,undefined);
   assert.doesNotMatch(JSON.stringify(res.data),/private/);
   const next=await state.call('Ist Glasfaser verfügbar?',propertyContext,cookie(res));
   assert.equal(next.statusCode,200); assert.equal(next.data.quota.remaining,applied?8:9);
   assert.equal(settlements(state.db).filter(c=>c[6]==='0').length,1);
  });
 });
});

test('upstream errors, invalid responses and uncharged replies release the reservation',async()=>{
 await withProxy(async(state)=>{
  const first=await state.call('Was ist der Preis?',propertyContext),identity=cookie(first);
  const failures=[()=>{throw Error('private timeout');},()=>new Response(null,{status:500}),
   ()=>Response.json({provider:'OpenAI',answer:'',sources:[]})];
  for(const upstream of failures) {
   state.upstream=upstream; assert.equal((await state.call(undefined,undefined,identity)).statusCode,502);
  }
  for(const data of [
   {provider:'OpenAI',kind:'clarification',answer:'Kauf oder Verkauf?',sources:[]},
   {provider:'OpenAI',kind:'offtopic',answer:'Bitte fragen Sie nach Immobilien.',sources:[]},
   {provider:'Wissensbasis von SLS Immobilienpartner',answer:'Keine Grundlage.',sources:[]}
  ]) {
   state.upstream=()=>Response.json(data);
   const res=await state.call(undefined,undefined,identity);
   assert.equal(res.statusCode,200); assert.equal(res.data.quota.remaining,9);
  }
  const last=await state.call('Ist Glasfaser verfügbar?',propertyContext,identity);
  assert.equal(last.data.quota.remaining,8);
  assert.equal(settlements(state.db).filter(c=>c[6]==='0').length,6);
 });
});

test('concurrent property and general requests cannot exceed shared reserved capacity',async()=>{
 await withProxy(async(state)=>{
  const first=await state.call('Was ist der Preis?',propertyContext),identity=cookie(first);
  const results=await Promise.all(Array.from({length:15},(_,i)=>
   state.call(i%2?'Was ist der Preis?':undefined,i%2?propertyContext:undefined,identity)));
  assert.equal(results.filter(r=>r.statusCode===200).length,9);
  assert.equal(results.filter(r=>r.statusCode===429).length,6);
  assert.ok(results.filter(r=>r.statusCode===429).every(r=>['daily_limit','pending_limit'].includes(r.data.code)));
  assert.equal(settlements(state.db).length,10);
  assert.equal((await state.call('Ist Glasfaser verfügbar?',propertyContext,identity)).data.code,'daily_limit');
 });
});

test('property replies retain optional-quota behavior when no store is configured',async()=>{
 await withProxy(async(state)=>{
  const keys=['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','KV_REST_API_URL','KV_REST_API_TOKEN'];
  const before=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  try {
   for(const key of keys) delete process.env[key];
   const res=await state.call('Was ist der Preis?',propertyContext);
   assert.equal(res.statusCode,200); assert.match(res.data.answer,/150\.000/);
   assert.equal(res.data.quota,undefined); assert.equal(state.db.calls,0);
  } finally { for(const [key,value] of Object.entries(before)) if(value!==undefined) process.env[key]=value; }
 });
});

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
 return { get calls(){return calls;}, async fetch(url,options) {
  calls++; assert.equal(url, env.UPSTASH_REDIS_REST_URL); assert.equal(options.headers.Authorization, 'Bearer test-secret');
  const [,script,count,...params]=JSON.parse(options.body), keys=params.slice(0,count), args=params.slice(count);
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

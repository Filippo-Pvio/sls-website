import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import handler from '../api/sia-ask.js';
import config from '../api/sia-config.js';
const originalFetch = global.fetch;
const fixture = { provider:'OpenAI', answer:'Antwort von SLS Immobilienpartner. [1]', sources:[{number:1,title:'Quelle',url:'/quellen/kosten.html'}], version:'1.4.3' };
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},end(raw){this.data=JSON.parse(raw);}};}
async function call(overrides={}) { const req = {method:'POST',headers:{'content-type':'application/json',host:'preview.example',origin:'https://preview.example'},body:{question:'Wie läuft der Verkauf?'},...overrides}; const res=response(); await handler(req,res);return res; }
test('preview proxy boundaries',async t=>{
 process.env.VERCEL_ENV='preview';
 await t.test('valid request uses fixed upstream and returns provenance',async()=>{
  global.fetch=async(url,opts)=>{assert.equal(url,'https://frag-sls.vercel.app/api/ask');assert.deepEqual(JSON.parse(opts.body),{question:'Wie läuft der Verkauf?'});return Response.json(fixture);};
  const res=await call();assert.equal(res.statusCode,200);assert.equal(res.data.provider,'OpenAI');assert.equal(res.headers['Cache-Control'],'no-store');
 });
 await t.test('production disabled even if local flag set',async()=>{process.env.VERCEL_ENV='production';process.env.SIA_LOCAL_PREVIEW='1';assert.equal((await call()).statusCode,404);const r=response();config({method:'GET'},r);assert.equal(r.data.enabled,false);process.env.VERCEL_ENV='preview';});
 await t.test('approved public hostname enabled, other aliases disabled',async()=>{
  process.env.VERCEL_ENV='production';global.fetch=async()=>Response.json(fixture);
  const headers={'content-type':'application/json',host:'sls-website-eight.vercel.app',origin:'https://sls-website-eight.vercel.app'};
  assert.equal((await call({headers})).statusCode,200);
  const r=response();config({method:'GET',headers},r);assert.equal(r.data.enabled,true);
  assert.equal((await call({headers:{...headers,host:'sls.de'}})).statusCode,404);
  process.env.VERCEL_ENV='preview';
 });
 await t.test('rejects methods, media types and foreign origins',async()=>{assert.equal((await call({method:'GET'})).statusCode,405);assert.equal((await call({headers:{'content-type':'text/plain'}})).statusCode,415);assert.equal((await call({headers:{'content-type':'application/json',host:'preview.example',origin:'https://foreign.example'}})).statusCode,403);});
 await t.test('input boundaries and invalid JSON',async()=>{for(const body of [{question:'a'}, {question:'a'.repeat(1201)},'bad',null])assert.equal((await call({body})).statusCode,400);assert.equal((await call({body:{question:'a'.repeat(9000)}})).statusCode,413);});
 await t.test('stream input matches Vercel parsed body',async()=>{global.fetch=async()=>Response.json(fixture);const req=Readable.from([Buffer.from('{"question":"Verkauf planen"}')]);req.method='POST';req.headers={'content-type':'application/json'};const res=response();await handler(req,res);assert.equal(res.statusCode,200);});
 await t.test('knowledge fallback retains distinct provider',async()=>{global.fetch=async()=>Response.json({...fixture,provider:'Wissensbasis von SLS Immobilienpartner'});assert.equal((await call()).data.provider,'Wissensbasis von SLS Immobilienpartner');});
 await t.test('unsupported definition gets grounded fallback; valid AI and individual questions stay unchanged',async()=>{
  global.fetch=async()=>Response.json({provider:'Wissensbasis von SLS Immobilienpartner',answer:'Keine Antwort',sources:[],reason:'invalid_sources'});
  let res=await call({body:{question:'Was ist Erbpacht?'}});assert.equal(res.data.reason,'general_definition');assert.equal(res.data.sources.length,1);assert.match(res.data.answer,/Erbbaurecht/);
  res=await call({body:{question:'Kann ich mein Erbbaurecht kündigen?'}});assert.equal(res.data.answer,'Keine Antwort');assert.equal(res.data.reason,'invalid_sources');
  global.fetch=async()=>Response.json(fixture);res=await call({body:{question:'Was ist Erbpacht?'}});assert.equal(res.data.provider,'OpenAI');assert.equal(res.data.answer,fixture.answer);
 });
 await t.test('upstream failures never leak upstream text',async()=>{global.fetch=async()=>new Response('private diagnostic',{status:429});let res=await call();assert.equal(res.statusCode,502);assert.ok(!JSON.stringify(res.data).includes('private'));global.fetch=async()=>{throw Error('private diagnostic');};assert.equal((await call()).statusCode,502);});
 await t.test('malformed response rejected',async()=>{global.fetch=async()=>Response.json({answer:'text',sources:[]});assert.equal((await call()).statusCode,502);});
 global.fetch=originalFetch;delete process.env.SIA_LOCAL_PREVIEW;delete process.env.VERCEL_ENV;
});

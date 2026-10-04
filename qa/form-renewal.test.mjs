import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
for(const [file,state] of [['contact-page.js','readiness'],['buyer-finder.js','ready']]){
 const source=await readFile(new URL('../assets/'+file,import.meta.url),'utf8');
 const helpers=source.slice(source.indexOf('  async function renewToken()'),source.indexOf('  async function initialise()'));
 function fixture(fetch,expiresAt=0){
  const context=vm.createContext({fetch,AbortSignal,Date,JSON,Number});
  vm.runInContext(`const endpoint='/api/propstack-contact-request';let token='old-token',${state}={expiresAt:${expiresAt}};${helpers};globalThis.send=sendRequest;`,context);return context;
 }
 test(file+': expired permission refreshes before POST and preserves all submitted data',async()=>{
  const calls=[],body={firstName:'Anna',salutation:'ms',message:'Meine Nachricht',place:'Dorsten',privacy:true};
  const ctx=fixture(async(url,options)=>{calls.push(options);return {ok:true,json:async()=>options.method==='POST'?{ok:true}:{token:'renewed-token',expiresAt:Date.now()+1800000}};},1);
  await ctx.send(body);assert.equal(calls.length,2);assert.equal(calls[0].headers['X-SLS-Form-Token'],'old-token');
  assert.deepEqual(JSON.parse(calls[1].body),{...body,token:'renewed-token'});assert.equal(body.message,'Meine Nachricht');
 });
 test(file+': explicit expiry rejection retries once with renewed permission',async()=>{
  const calls=[];const ctx=fixture(async(url,options)=>{calls.push(options);const n=calls.length;return {ok:n!==1,json:async()=>n===1?{code:'FORM_TOKEN_EXPIRED'}:n===2?{token:'renewed-token',expiresAt:Date.now()+1800000}:{ok:true}};},Date.now()+1800000);
  assert.equal((await ctx.send({message:'Erhalten'})).result.ok,true);assert.equal(calls.length,3);assert.equal(JSON.parse(calls[2].body).message,'Erhalten');
 });
 test(file+': unavailable renewal does not submit or change entered data',async()=>{
  let calls=0;const body={message:'Erhalten'};const ctx=fixture(async()=>{calls++;return {ok:false,json:async()=>({})};},1);
  await assert.rejects(ctx.send(body),/Eingaben bleiben erhalten/);assert.equal(calls,1);assert.equal(body.message,'Erhalten');
 });
 test(file+': uncertain POST failure is never automatically resubmitted',async()=>{
  let calls=0;const ctx=fixture(async()=>{calls++;throw new Error('Network interruption');},Date.now()+1800000);
  await assert.rejects(ctx.send({message:'Erhalten'}),/Network interruption/);assert.equal(calls,1);
 });
}

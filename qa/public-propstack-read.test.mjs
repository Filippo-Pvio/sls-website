import test from 'node:test';
import assert from 'node:assert/strict';
import {readPublicPropstack,withPublicReadBudget} from '../lib/public-propstack-read.mjs';

async function fixture(fetcher,run){
 const original=global.fetch;
 global.fetch=fetcher;
 try{await run();}finally{global.fetch=original;}
}

test('a transient read failure retries once without changing the request or exposing credentials to redirects',()=>{
 const calls=[];
 return fixture(async(url,options)=>{
  calls.push({url,options});
  return calls.length===1?new Response('',{status:503}):Response.json({data:[{id:1}]});
 },async()=>{
  assert.deepEqual(await readPublicPropstack('units?page=1','fixture'),{data:[{id:1}]});
  assert.equal(calls.length,2);
  for(const {url,options}of calls){assert.equal(url,'https://api.propstack.de/v1/units?page=1');assert.equal(options.method,undefined);assert.equal(options.redirect,'error');assert.equal(options.headers['X-API-KEY'],'fixture');}
 });
});

test('authentication errors, invalid JSON and long rate-limit waits are not replayed',async()=>{
 for(const response of [()=>new Response('',{status:401}),()=>new Response('',{status:429,headers:{'retry-after':'60'}}),()=>new Response('not JSON')]){
  let calls=0;
  await fixture(async()=>{calls++;return response();},async()=>{
   await assert.rejects(readPublicPropstack('units','fixture'));assert.equal(calls,1);
  });
 }
});

test('repeated upstream failures do not become an empty successful catalog',async()=>{
 let calls=0;
 await fixture(async()=>{calls++;return new Response('',{status:502});},async()=>{
  await assert.rejects(readPublicPropstack('units','fixture'),/Propstack HTTP 502/);assert.equal(calls,2);
 });
});

test('only an explicitly optional missing object returns null',()=>fixture(async()=>new Response('',{status:404}),async()=>{
 assert.equal(await readPublicPropstack('units/1','fixture',{allowMissing:true}),null);
 await assert.rejects(readPublicPropstack('units/1','fixture'),/Propstack HTTP 404/);
}));

test('nested reads share a total deadline instead of starting a new pagination budget',async()=>{
 const originalNow=Date.now;let now=originalNow(),calls=0;Date.now=()=>now;
 try{
  await fixture(async()=>{calls++;return Response.json({data:[]});},async()=>{
   await withPublicReadBudget(async()=>{
    await readPublicPropstack('units?page=1','fixture');now+=31;
    await assert.rejects(withPublicReadBudget(()=>readPublicPropstack('units?page=2','fixture')),/read_timeout/);
   },30);
   assert.equal(calls,1);
  });
 }finally{Date.now=originalNow;}
});

test('the timeout remains active while the response body is being read',()=>fixture(async(_url,{signal})=>({ok:true,json:()=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error('body timeout'),{name:'AbortError'})),{once:true}))}),async()=>{
 await assert.rejects(withPublicReadBudget(()=>readPublicPropstack('units','fixture'),20),/body timeout/);
}));

test('foreign provider URLs are rejected before fetching',()=>fixture(async()=>{throw Error('Must not fetch');},async()=>{
 for(const path of ['https://foreign.example/units','../../private'])await assert.rejects(readPublicPropstack(path,'fixture'),/Invalid provider path/);
}));

import test from 'node:test';
import assert from 'node:assert/strict';
import {claimContactSubmission,claimContactNote,clearContactNote} from '../lib/contact-shared-guard.mjs';

test('contact guards share submission fingerprint and block duplicate note writes',async()=>{
  const originalFetch=globalThis.fetch,oldUrl=process.env.KV_REST_API_URL,oldToken=process.env.KV_REST_API_TOKEN;
  const data=new Map();
  process.env.KV_REST_API_URL='https://kv.example.test';
  process.env.KV_REST_API_TOKEN='test';
  globalThis.fetch=async(_url,options)=>{
    const [op,key,value,...args]=JSON.parse(options.body);
    let result=null;
    if(op==='SET'){if(!args.includes('NX')||!data.has(key)){data.set(key,value);result='OK';}}
    if(op==='GET')result=data.get(key)||null;
    if(op==='DEL')result=data.delete(key)?1:0;
    return {ok:true,json:async()=>({result})};
  };
  try {
    assert.equal(await claimContactSubmission('submission-1','fingerprint-a'),'claimed');
    assert.equal(await claimContactSubmission('submission-1','fingerprint-a'),'existing');
    assert.equal(await claimContactSubmission('submission-1','fingerprint-b'),'conflict');
    assert.equal(await claimContactNote('submission-1:category-1'),true);
    assert.equal(await claimContactNote('submission-1:category-1'),false);
    await clearContactNote('submission-1:category-1');
    assert.equal(await claimContactNote('submission-1:category-1'),true);
    assert.ok([...data.keys()].every(key=>!key.includes('submission-1')));
  } finally {
    globalThis.fetch=originalFetch;
    if(oldUrl===undefined)delete process.env.KV_REST_API_URL;else process.env.KV_REST_API_URL=oldUrl;
    if(oldToken===undefined)delete process.env.KV_REST_API_TOKEN;else process.env.KV_REST_API_TOKEN=oldToken;
  }
});
test('missing shared storage fails closed',async()=>{
  const old=process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_URL;
  try{await assert.rejects(claimContactNote('test'),/not configured/);}
  finally{if(old!==undefined)process.env.KV_REST_API_URL=old;}
});

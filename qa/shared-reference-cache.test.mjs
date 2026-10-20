import test from 'node:test';
import assert from 'node:assert/strict';
import {readSharedReferences,writeSharedReferences} from '../lib/shared-reference-cache.mjs';

test('shared public reference cache writes and reads a verified snapshot', async () => {
  const oldUrl=process.env.KV_REST_API_URL,oldToken=process.env.KV_REST_API_TOKEN,oldFetch=globalThis.fetch;
  const store=new Map();
  process.env.KV_REST_API_URL='https://cache.example.test';
  process.env.KV_REST_API_TOKEN='test-only';
  globalThis.fetch=async (_url,options)=>{
    const args=JSON.parse(options.body);
    if(args[0]==='SET'){store.set(args[1],args[2]);return {ok:true,json:async()=>({result:'OK'})};}
    if(args[0]==='GET')return {ok:true,json:async()=>({result:store.get(args[1])||null})};
    throw new Error('unexpected');
  };
  try {
    const items=[{id:'123',title:'Verkauft',city:'Dorsten',zip:'46282',image:'https://example.test/a.jpg'}];
    assert.equal(await writeSharedReferences('test-api-key',items),true);
    assert.deepEqual(await readSharedReferences('test-api-key'),{items,fresh:true});
    assert.equal(await readSharedReferences('other-api-key'),null);
    assert.equal(await writeSharedReferences('test-api-key',[{...items[0],privatePhone:'123'}]),false);
    assert.equal(await writeSharedReferences('test-api-key',[]),false);
    const key=[...store.keys()][0];
    assert.equal(key.includes('test-api-key'),false);
    store.set(key,JSON.stringify({savedAt:Date.now()-25*60*60*1000,items}));
    assert.equal(await readSharedReferences('test-api-key'),null);
  } finally {
    globalThis.fetch=oldFetch;
    if(oldUrl===undefined)delete process.env.KV_REST_API_URL;else process.env.KV_REST_API_URL=oldUrl;
    if(oldToken===undefined)delete process.env.KV_REST_API_TOKEN;else process.env.KV_REST_API_TOKEN=oldToken;
  }
});

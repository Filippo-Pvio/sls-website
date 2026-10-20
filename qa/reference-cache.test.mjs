import test from 'node:test';
import assert from 'node:assert/strict';
import {cachedCatalog} from '../lib/property-catalog.mjs';

test('successful reference snapshot is reused while fresh', async () => {
  let calls=0;
  const read=cachedCatalog(async()=>{calls++;return [{id:'1'}]},60000,{staleOnError:true});
  assert.deepEqual(await read('key','sold'),[{id:'1'}]);
  assert.deepEqual(await read('key','sold'),[{id:'1'}]);
  assert.equal(calls,1);
});

test('failed refresh retains last verified reference snapshot', async () => {
  let calls=0;
  const read=cachedCatalog(async()=>{if(++calls>1)throw new Error('offline');return [{id:'1'}]},0,{staleOnError:true});
  assert.deepEqual(await read('key','sold'),[{id:'1'}]);
  assert.deepEqual(await read('key','sold'),[{id:'1'}]);
});

test('first failed load must never become an empty successful catalog', async () => {
  const read=cachedCatalog(async()=>{throw new Error('offline')},0,{staleOnError:true});
  await assert.rejects(read('key','sold'),/offline/);
});

test('unrelated catalogs keep strict failure behavior', async () => {
  let calls=0;
  const read=cachedCatalog(async()=>{if(++calls>1)throw new Error('offline');return [{id:'1'}]},0);
  await read('key','sold');
  await assert.rejects(read('key','sold'),/offline/);
});

test('a verified snapshot is not served for another identity', async () => {
  const read=cachedCatalog(async(key)=>{if(key==='other')throw new Error('offline');return [{id:'1'}]},0,{staleOnError:true});
  await read('key','sold');
  await assert.rejects(read('other','sold'),/offline/);
});

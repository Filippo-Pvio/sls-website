import test from 'node:test';
import assert from 'node:assert/strict';
import {newsletterConfig, NEWSLETTER_NOTE} from '../lib/guide-newsletter.mjs';

const category = {id:123,name:NEWSLETTER_NOTE,category:'for_notes'};
test('automation resolves only a unique exact note category',async()=>{
 assert.deepEqual(await newsletterConfig('fixture',async()=>[category]),{noteTypeId:123});
 for (const entries of [[],[{...category,category:'reminder'}],[{...category,name:'Other'}],[category,{...category,id:124}],[{...category,id:'bad'}]]) {
  assert.equal(await newsletterConfig('fixture',async()=>entries),null);
 }
});
test('automation lookup paginates and rejects a duplicate on a later page',async()=>{
 let calls=0;
 assert.equal(await newsletterConfig('fixture',async()=>({data:[{...category,id:++calls}],meta:{total_count:2}})),null);
 assert.equal(calls,2);
});
test('failed lookup never enables the newsletter',async()=>{
 await assert.rejects(newsletterConfig('fixture',async()=>{throw Error('unavailable');}),/unavailable/);
});

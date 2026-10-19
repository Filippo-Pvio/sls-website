import test from 'node:test';
import assert from 'node:assert/strict';
import references from '../api/propstack-sold-references.js';

test('slow optional broker enrichment stops without dropping valid public references',async()=>{
 const originalFetch=global.fetch,originalNow=Date.now,originalKey=process.env.PROPSTACK_API_KEY;
 let now=originalNow(),detailReads=0;Date.now=()=>now;process.env.PROPSTACK_API_KEY='reference-budget-fixture';
 const units=Array.from({length:20},(_,i)=>({id:i+1,title:`Haus ${i+1}`,city:'Dorsten',marketing_type:'BUY',status:{id:8},broker:{id:9,name:'SLS'},images:[{is_private:false,medium_url:'https://example.org/image.jpg'}]}));
 global.fetch=async(url,options)=>{
  assert.equal(options.method,undefined);
  const path=new URL(url).pathname;
  if(path.endsWith('property_statuses'))return Response.json([{id:8,name:'Verkauft'}]);
  if(path.endsWith('/units'))return Response.json({data:units,meta:{total_count:units.length}});
  if(path.endsWith('/brokers'))return Response.json([{id:9,name:'SLS'}]);
  detailReads++;now+=7000;
  return Response.json(units.find(u=>String(u.id)===path.split('/').pop()));
 };
 const res={setHeader(){},status(code){this.code=code;return this},json(body){this.body=body;return this}};
 try{
  await references({method:'GET',query:{}},res);
  assert.equal(res.code,200);assert.equal(res.body.references.length,20);
  assert.ok(detailReads>0&&detailReads<20,'optional enrichment must stop within its budget');
  assert.deepEqual(res.body.references.map(r=>r.id),units.map(u=>String(u.id)));
 }finally{global.fetch=originalFetch;Date.now=originalNow;if(originalKey===undefined)delete process.env.PROPSTACK_API_KEY;else process.env.PROPSTACK_API_KEY=originalKey;}
});

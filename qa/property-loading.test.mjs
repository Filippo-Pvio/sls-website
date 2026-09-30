import test from 'node:test';
import assert from 'node:assert/strict';
import {propertyCard,queryProperties,cachedCatalog} from '../lib/property-catalog.mjs';
import handler from '../api/propstack-properties.js';
const sample={id:'1',title:'Wohnung',city:'Dorsten',zip:'46286',price:150000,area:80,rooms:3,type:'Wohnung',images:['first','second'],description:'private long text',broker:{email:'no'},energy:{rating:'C'}};
test('card projection excludes detail payload and extra images',()=>{
 const card=propertyCard(sample);assert.deepEqual(card.images,['first']);assert.equal(card.description,undefined);assert.equal(card.broker,undefined);assert.equal(card.energy.rating,'C');
});
test('server filters search all candidates and sort missing values last',()=>{
 const rows=[sample,{...sample,id:'2',city:'Essen',price:100000},{...sample,id:'3',price:null}];
 assert.deepEqual(queryProperties(rows,{city:'ESSEN'}).map(p=>p.id),['2']);
 assert.deepEqual(queryProperties(rows,{sort:'price-desc'}).map(p=>p.id),['1','2','3']);
 assert.deepEqual(queryProperties(rows,{query:'46286',price:'120000'}).map(p=>p.id),['2']);
 assert.equal(queryProperties(rows,{area:'90'}).length,0);
});
test('catalog coalesces refreshes, expires and retries failed loads',async()=>{
 let calls=0;const cache=cachedCatalog(async()=>{calls++;await new Promise(r=>setTimeout(r,5));return [sample]},10);
 await Promise.all([cache('key','status'),cache('key','status')]);assert.equal(calls,1);
 await cache('key','status');assert.equal(calls,1);
 await new Promise(r=>setTimeout(r,15));await cache('key','status');assert.equal(calls,2);
 let failures=0;const retry=cachedCatalog(async()=>{if(!failures++)throw Error('offline');return []});
 await assert.rejects(retry('k','s'));assert.deepEqual(await retry('k','s'),[]);
});
test('feed pages, slim map, full catalog search and recommendations use bounded public queries',async()=>{
 const previousFetch=global.fetch,previousKey=process.env.PROPSTACK_API_KEY;let calls=[];
 process.env.PROPSTACK_API_KEY='fixture-only';
 const rows=Array.from({length:135},(_,i)=>({id:i+1,title:`Objekt ${i+1}`,city:i===134?'Essen':'Dorsten',zip_code:'46286',marketing_type:'BUY',archived:false,status:{id:7,name:'Vermarktung'},price:150000,living_space:80,number_of_rooms:3,rs_type:'APARTMENT',images:[]}));
 global.fetch=async input=>{const u=new URL(input);calls.push(u);
  if(u.pathname.endsWith('property_statuses'))return {ok:true,json:async()=>[{id:7,name:'Vermarktung'}]};
  assert.equal(u.searchParams.get('status'),'7');assert.equal(u.searchParams.get('marketing_type'),'BUY');
  const per=Number(u.searchParams.get('per')),page=Number(u.searchParams.get('page')||1);
  return {ok:true,json:async()=>({data:rows.slice((page-1)*per,page*per),meta:{total_count:135}})};
 };
 const run=async query=>{const res={code:200,setHeader(){},status(code){this.code=code;return this},json(data){this.data=data;return this}};await handler({method:'GET',query},res);assert.equal(res.code,200);return res.data};
 try{
  const first=await run({page:'1',per:'6'});assert.equal(first.items.length,6);assert.equal(first.total,135);assert.equal(calls.length,2);
  const map=await run({map:'1'});assert.equal(map.items.length,135);assert.deepEqual(Object.keys(map.items[0]),['id','zip','city','price']);assert.equal(calls.length,5);
  const found=await run({query:'Objekt 135',per:'9'});assert.equal(found.items.length,1);assert.equal(String(found.items[0].id),'135');assert.equal(calls.length,6);
  const similar=await run({similarTo:'1'});assert.ok(similar.items.length<=3);assert.ok(similar.items.every(p=>p.id!=='1'));
 }finally{global.fetch=previousFetch;if(previousKey===undefined)delete process.env.PROPSTACK_API_KEY;else process.env.PROPSTACK_API_KEY=previousKey}
});

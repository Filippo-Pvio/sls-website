import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/propstack-sold-references.js';
const unit=id=>({id,title:`Immobilie ${id}`,city:'Dorsten',marketing_type:'BUY',status:{id:2},broker:{id:9,name:'SLS'},images:[{is_private:false,medium_url:'https://example.org/public.webp'}]});
const call=async (query,units,options={})=>{
 const originalFetch=globalThis.fetch,originalKey=process.env.PROPSTACK_API_KEY,calls=[];
 process.env.PROPSTACK_API_KEY='test-key';
 globalThis.fetch=async input=>{
  const url=new URL(input);calls.push(url);
  if(url.pathname.endsWith('property_statuses'))return {ok:true,json:async()=>[{id:2,name:'Verkauft'},{id:3,name:'Reserviert'}]};
  if(url.pathname.endsWith('brokers'))return {ok:true,json:async()=>[{id:9,name:'SLS'}]};
  assert.equal(url.pathname,'/v1/units');
  const page=Number(url.searchParams.get('page')),per=Number(url.searchParams.get('per'));
  if(options.fail)throw Error('upstream failed');
  const data=units.slice((page-1)*per,page*per);
  return {ok:true,json:async()=>options.noMeta?{data}:{data,meta:{total_count:units.length}}};
 };
 const response={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 try{await handler({method:'GET',query},response);return {...response,calls};}
 finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.PROPSTACK_API_KEY;else process.env.PROPSTACK_API_KEY=originalKey;}
};
test('first gallery request fetches only twelve upstream rows and no brokers/details',async()=>{
 const result=await call({gallery:'1'},Array.from({length:221},(_,i)=>unit(i+1)));
 assert.equal(result.code,200);assert.equal(result.body.references.length,12);assert.equal(result.body.nextCursor,'2:0');assert.equal(result.calls.length,2);assert.equal(result.calls[1].searchParams.get('per'),'12');assert.match(result.headers['Cache-Control'],/s-maxage=900/);
});
test('cursor loads all references exactly once including the short final page',async()=>{
 const units=Array.from({length:29},(_,i)=>unit(i+1));let cursor='1:0';const ids=[];
 while(cursor){const r=await call({gallery:'1',cursor},units);assert.equal(r.code,200);ids.push(...r.body.references.map(x=>x.id));cursor=r.body.nextCursor;}
 assert.deepEqual(ids,units.map(x=>String(x.id)));
});
test('private photos, floorplans, missing cities, rentals and unsold properties are excluded without skipping the next valid item',async()=>{
 const units=Array.from({length:30},(_,i)=>unit(i+1));units[0].images[0].is_private=true;units[1].images[0].is_floorplan=true;units[2].city='';units[3].marketing_type='RENT';units[4].status.id=3;
 const first=await call({gallery:'1'},units);assert.equal(first.body.references.length,12);assert.equal(first.body.nextCursor,'2:5');
 const next=await call({gallery:'1',cursor:first.body.nextCursor},units);const last=await call({gallery:'1',cursor:next.body.nextCursor},units);
 assert.deepEqual([...first.body.references,...next.body.references,...last.body.references].map(x=>x.id),units.slice(5).map(x=>String(x.id)));
});
test('without totals, full pages continue until an empty page',async()=>{
 const first=await call({gallery:'1'},Array.from({length:12},(_,i)=>unit(i+1)),{noMeta:true});assert.equal(first.body.nextCursor,'2:0');
 const final=await call({gallery:'1',cursor:first.body.nextCursor},Array.from({length:12},(_,i)=>unit(i+1)),{noMeta:true});assert.deepEqual(final.body,{references:[],nextCursor:null});
});
test('empty collection has no continuation',async()=>{assert.deepEqual((await call({gallery:'1'},[])).body,{references:[],nextCursor:null});});
test('malformed cursors are rejected before any upstream request',async()=>{
 for(const cursor of ['0:0','1:12','-1:0','abc','9999:0',['1:0']]){const r=await call({gallery:'1',cursor},[]);assert.equal(r.code,400);assert.equal(r.calls.length,0);assert.equal(r.headers['Cache-Control'],'no-store');}
});
test('sparse pages are bounded and keep a cursor so remaining public entries stay reachable',async()=>{
 const units=Array.from({length:110},(_,i)=>({...unit(i+1),images:i<96?[]:unit(i+1).images}));
 const first=await call({gallery:'1'},units);assert.equal(first.calls.length,9);assert.deepEqual(first.body,{references:[],nextCursor:'9:0'});
 const next=await call({gallery:'1',cursor:'9:0'},units);assert.equal(next.body.references.length,12);
});
test('legacy consumers still receive the complete feed with broker names',async()=>{
 const r=await call({},Array.from({length:29},(_,i)=>unit(i+1)));assert.equal(r.body.references.length,29);assert.equal(r.body.references[0].brokerName,'SLS');assert(!Object.hasOwn(r.body,'nextCursor'));assert(r.calls.some(x=>x.pathname.endsWith('brokers')));
});

test('numbered gallery pages count only public references and allow direct last-page access',async()=>{
 const units=Array.from({length:104},(_,i)=>unit(i+1));units[0].images[0].is_private=true;units[1].images[0].is_floorplan=true;units[2].city='';units[3].marketing_type='RENT';units[4].status.id=3;
 const result=await call({gallery:'1',page:'9'},units);
 assert.equal(result.code,200);assert.equal(result.body.totalPages,9);assert.equal(result.body.page,9);
 assert.deepEqual(result.body.references.map(x=>x.id),['102','103','104']);
 assert(!result.calls.some(x=>x.pathname.endsWith('brokers')));
 assert(result.calls.filter(x=>x.pathname.endsWith('units')).every(x=>x.searchParams.get('sort_by')==='unit_id.raw'));
});
test('numbered gallery validates page input and clamps a vanished last page',async()=>{
 for(const page of ['0','-1','335','abc',['1']]){const result=await call({gallery:'1',page},[]);assert.equal(result.code,400);assert.equal(result.calls.length,0);}
 const result=await call({gallery:'1',page:'8'},[unit(1)]);assert.equal(result.body.page,1);assert.equal(result.body.totalPages,1);
 assert.deepEqual((await call({gallery:'1',page:'1'},[])).body,{references:[],page:1,totalPages:0});
});

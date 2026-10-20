import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/propstack-sold-references.js';
import {referenceDisplayItem} from '../lib/reference-display.mjs';
test('reference display projects only public photos and factual fields, with no prices or contacts',()=>{
 const unit={id:1,rs_type:'HOUSE',price:123456,sold_price:99999,broker:{email:'private@example.test'},living_space:{value:120},number_of_rooms:4,construction_year:2000,images:[{is_private:true,big_url:'https://example.test/private.jpg'},{big_url:'https://example.test/unknown.jpg'},{is_private:false,is_floorplan:true,big_url:'https://example.test/plan.jpg'},{is_private:false,big_url:'https://example.test/large.jpg',medium_url:'https://example.test/small.jpg'}]};
 const result=referenceDisplayItem(unit,{id:'1',title:'Haus',city:'Dorsten',zip:'46286',image:'https://example.test/small.jpg'});
 assert.deepEqual(result.images,['https://example.test/large.jpg']);assert.deepEqual(result.facts,[['Wohnfläche','120 m²'],['Zimmer','4'],['Baujahr','2000']]);
 assert.deepEqual(Object.keys(result),['id','title','city','zip','type','images','facts']);assert.doesNotMatch(JSON.stringify(result),/123456|99999|private@|private.jpg|unknown.jpg|plan.jpg/);
});
test('reference display loads all public sold references across pages and excludes active offers',async()=>{
 const previous=global.fetch,previousKey=process.env.PROPSTACK_PUBLIC_API_KEY;process.env.PROPSTACK_PUBLIC_API_KEY='reference-display-fixture';let reads=0;
 const rows=Array.from({length:135},(_,i)=>({id:i+1,title:'Referenz '+(i+1),city:'Dorsten',marketing_type:'BUY',status:{id:8},images:[{is_private:false,big_url:'https://example.test/'+i+'.jpg'}]}));
 rows[0].status={id:7};rows[1].marketing_type='RENT';rows[2].images=[{is_private:true,big_url:'https://example.test/private.jpg'}];
 global.fetch=async input=>{const u=new URL(input);if(u.pathname.endsWith('/property_statuses'))return {ok:true,json:async()=>[{id:8,name:'Verkauft'},{id:7,name:'Vermarktung'}]};
  assert.ok(u.pathname.endsWith('/units'));reads++;const page=Number(u.searchParams.get('page'));return {ok:true,json:async()=>({data:rows.slice((page-1)*100,page*100),meta:{total_count:135}})};};
 const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(v){this.statusCode=v;return this},json(v){this.data=v;return this}};
 try{await handler({method:'GET',query:{display:'1'}},res);assert.equal(res.statusCode,200);assert.equal(res.data.total,132);assert.equal(res.data.items.at(-1).id,'135');assert.equal(reads,2);assert.equal(res.headers['Cache-Control'],'public, s-maxage=60');assert.ok(res.data.items.every(p=>!['1','2','3'].includes(p.id)));}
 finally{global.fetch=previous;if(previousKey===undefined)delete process.env.PROPSTACK_PUBLIC_API_KEY;else process.env.PROPSTACK_PUBLIC_API_KEY=previousKey}
});

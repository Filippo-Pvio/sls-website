import test from 'node:test';
import assert from 'node:assert/strict';
import {publicUnit} from '../lib/propstack-preview.mjs';
import {propertyCard,propertyFilters,queryProperties} from '../lib/property-catalog.mjs';
import {buildSavedQuery,publicCriteria,sameSavedQuery} from '../lib/search-profile.mjs';
import handler from '../api/propstack-properties.js';
const card=(id,type,category,city)=>propertyCard(publicUnit({id,rs_type:{value:type},rs_category:{value:category},city}));
test('preserves codes and translates subtypes through the public card chain',()=>{
  const p=card(1,'APARTMENT','GROUND_FLOOR','Essen');
  assert.deepEqual([p.rs_type,p.rs_category,p.type,p.subtype],['APARTMENT','GROUND_FLOOR','Wohnung','Erdgeschosswohnung']);
  assert.equal(card(2,'TRADE_SITE','TRADE_SITE','Essen').type,'Grundstück');
});
test('facets use the whole catalog, exclude technical fallback and deduplicate cities',()=>{
  const items=Array.from({length:120},(_,i)=>card(i,'APARTMENT','GROUND_FLOOR',' Essen '));
  items.push(card(121,'HOUSE','SINGLE_FAMILY_HOUSE','Dorsten'),card(122,'TRADE_SITE','TRADE_SITE','Borken'),card(123,'UNKNOWN','','essen'));
  const facets=propertyFilters(items);
  assert.deepEqual(facets.cities,['Borken','Dorsten','Essen']);
  assert.deepEqual(facets.types.map(p=>p.value),['Grundstück','Haus','Wohnung']);
  assert.deepEqual(facets.types.find(p=>p.value==='Wohnung').subtypes,[{value:'GROUND_FLOOR',label:'Erdgeschosswohnung'}]);
});
test('subtype combines with existing text, city, type, numeric filters and sorting',()=>{
  const items=[{...card(1,'APARTMENT','GROUND_FLOOR','Essen'),title:'Garten',price:200000,area:80,rooms:3},
    {...card(2,'APARTMENT','PENTHOUSE','Essen'),title:'Garten',price:150000,area:90,rooms:3},
    {...card(3,'HOUSE','GROUND_FLOOR','Essen'),title:'Garten',price:180000,area:80,rooms:3}];
  assert.deepEqual(queryProperties(items,{type:'Wohnung',subtype:'GROUND_FLOOR',query:'garten',city:'ess',price:250000,area:75,rooms:3,sort:'price-asc'}).map(p=>p.id),['1']);
  assert.deepEqual(queryProperties(items,{type:'APARTMENT',subtype:'PENTHOUSE'}).map(p=>p.id),['2']);
});
test('saved profiles include land and subtypes, and distinguish subtype-specific duplicates',()=>{
  assert.deepEqual(buildSavedQuery(publicCriteria({type:'Grundstück'}),1).rs_types,['TRADE_SITE']);
  const candidate=buildSavedQuery(publicCriteria({type:'Wohnung',subtype:'GROUND_FLOOR'}),1);
  assert.deepEqual(candidate.rs_categories,['GROUND_FLOOR']);
  assert.equal(sameSavedQuery({...candidate,rs_categories:['PENTHOUSE']},candidate),false);
  assert.equal(sameSavedQuery({...candidate,rs_categories:[]},candidate),false);
  assert.equal(sameSavedQuery(candidate,candidate),true);
});
test('API facets include late published listings and never private or archived units',async()=>{
  const originalFetch=globalThis.fetch,oldKey=process.env.PROPSTACK_API_KEY;
  process.env.PROPSTACK_API_KEY='filter-test';
  const rows=Array.from({length:101},(_,i)=>({id:i+1,rs_type:i===100?'TRADE_SITE':'APARTMENT',rs_category:i===100?'TRADE_SITE':'GROUND_FLOOR',city:i===100?'Borken':'Essen',marketing_type:'BUY',status:{id:7,name:'Vermarktung'}}));
  rows.push({...rows[0],id:200,city:'Privat',status:{id:7,nonpublic:true}}, {...rows[0],id:201,city:'Archiv',archived:true});
  globalThis.fetch=async url=>{const u=new URL(url);return {ok:true,json:async()=>u.pathname.endsWith('/property_statuses')?[{id:7,name:'Vermarktung'}]:{data:rows.slice((Number(u.searchParams.get('page'))-1)*100,Number(u.searchParams.get('page'))*100),meta:{total_count:rows.length}}}};
  const response=()=>({statusCode:0,body:null,setHeader(){},status(code){this.statusCode=code;return this},json(body){this.body=body;return this}});
  try{
    const res=response();await handler({method:'GET',query:{filters:'1',city:'Essen'}},res);
    assert.equal(res.statusCode,200);assert.deepEqual(res.body.filters.cities,['Borken','Essen']);
    const search=response();await handler({method:'GET',query:{subtype:'TRADE_SITE'}},search);
    assert.deepEqual(search.body.items.map(p=>p.id),['101']);
  }finally{globalThis.fetch=originalFetch;if(oldKey===undefined)delete process.env.PROPSTACK_API_KEY;else process.env.PROPSTACK_API_KEY=oldKey}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedIds,mayDisplay,publicUnit} from '../lib/propstack-preview.mjs';
import handler from '../api/propstack-test-properties.js';
const ids=allowedIds('17,18'),statuses=allowedIds('2');
const unit={id:17,archived:false,marketing_type:'BUY',status:{id:2,nonpublic:false},images:[{url:'https://example.org/private.jpg',is_private:true},{url:'https://example.org/public.jpg',is_private:false}]};
test('Objektfreigabe verlangt ID, Kauf, öffentlich sichtbaren Status und keine Archivierung',()=>{
  assert.ok(mayDisplay(unit,ids,statuses));
  assert.equal(mayDisplay({...unit,id:19},ids,statuses),false);
  assert.equal(mayDisplay({...unit,archived:true},ids,statuses),false);
  assert.equal(mayDisplay({...unit,marketing_type:'RENT'},ids,statuses),false);
  assert.equal(mayDisplay({...unit,status:{id:3}},ids,statuses),false);
  assert.equal(mayDisplay({...unit,status:{id:2,nonpublic:true}},ids,statuses),false);
});
test('Antwort enthält keine privaten Fotos oder Rohdatenfelder',()=>{
  const result=publicUnit({...unit,internal_note:'Nicht öffentlich'});
  assert.deepEqual(result.images,['https://example.org/public.jpg']);
  assert.equal('internal_note' in result,false);
});
test('API verweigert ohne Konfiguration alle Objektangaben',async()=>{
  const previous=[process.env.PROPSTACK_API_KEY,process.env.PROPSTACK_TEST_PROPERTY_IDS,process.env.PROPSTACK_PUBLIC_STATUS_NAME];
  delete process.env.PROPSTACK_API_KEY; delete process.env.PROPSTACK_TEST_PROPERTY_IDS; delete process.env.PROPSTACK_PUBLIC_STATUS_NAME;
  const req={method:'GET',query:{}};
  const res={headers:{},setHeader(k,v){this.headers[k]=v},status(code){this.code=code;return this},json(data){this.data=data;return this}};
  try {await handler(req,res);assert.equal(res.code,503);assert.equal(res.headers['Cache-Control'],'no-store')}
  finally {['PROPSTACK_API_KEY','PROPSTACK_TEST_PROPERTY_IDS','PROPSTACK_PUBLIC_STATUS_NAME'].forEach((k,i)=>previous[i]===undefined?delete process.env[k]:process.env[k]=previous[i])}
});
test('API ermittelt nur einen öffentlichen Status mit exaktem Namen und gibt nur freigegebene Objekte aus',async()=>{
  const previous=[process.env.PROPSTACK_API_KEY,process.env.PROPSTACK_TEST_PROPERTY_IDS,process.env.PROPSTACK_PUBLIC_STATUS_NAME,globalThis.fetch];
  process.env.PROPSTACK_API_KEY='test-key';process.env.PROPSTACK_TEST_PROPERTY_IDS='17';process.env.PROPSTACK_PUBLIC_STATUS_NAME='Vermarktung';
  globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('property_statuses')
    ? {data:[{id:2,name:'Vermarktung',nonpublic:null},{id:3,name:'Intern',nonpublic:true}]}
    : {data:[{...unit,title:'Testobjekt'},{...unit,id:18,title:'Fremdobjekt'}]}});
  const req={method:'GET',query:{}};
  const res={setHeader(){},status(code){this.code=code;return this},json(data){this.data=data;return this}};
  try {await handler(req,res);assert.equal(res.code,200);assert.equal(res.data.items.length,1);assert.equal(res.data.items[0].id,'17')}
  finally {['PROPSTACK_API_KEY','PROPSTACK_TEST_PROPERTY_IDS','PROPSTACK_PUBLIC_STATUS_NAME'].forEach((k,i)=>previous[i]===undefined?delete process.env[k]:process.env[k]=previous[i]);globalThis.fetch=previous[3]}
});
test('Detailansicht nutzt den freigegebenen Listenstatus auch wenn das Detail-JSON keinen Status enthält',async()=>{
  const previous=[process.env.PROPSTACK_API_KEY,process.env.PROPSTACK_TEST_PROPERTY_IDS,process.env.PROPSTACK_PUBLIC_STATUS_NAME,globalThis.fetch];
  process.env.PROPSTACK_API_KEY='test-key';process.env.PROPSTACK_TEST_PROPERTY_IDS='17';process.env.PROPSTACK_PUBLIC_STATUS_NAME='Vermarktung';
  globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('property_statuses')
    ? {data:[{id:2,name:'Vermarktung',nonpublic:null}]}
    : String(url).includes('units/17?new=1')
      ? {id:17,title:{value:'Detailtitel'},description_note:{value:'Beschreibung'},images:unit.images}
      : {data:[{...unit,title:'Listentitel'}]}});
  const res={setHeader(){},status(code){this.code=code;return this},json(data){this.data=data;return this}};
  try {await handler({method:'GET',query:{id:'17'}},res);assert.equal(res.code,200);assert.equal(res.data.items[0].title,'Detailtitel');assert.equal(res.data.items[0].description,'Beschreibung');assert.deepEqual(res.data.items[0].images,['https://example.org/public.jpg'])}
  finally {['PROPSTACK_API_KEY','PROPSTACK_TEST_PROPERTY_IDS','PROPSTACK_PUBLIC_STATUS_NAME'].forEach((k,i)=>previous[i]===undefined?delete process.env[k]:process.env[k]=previous[i]);globalThis.fetch=previous[3]}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedIds,mayDisplay,publicUnit} from '../lib/propstack-preview.mjs';
import handler from '../api/propstack-test-properties.js';
import inquiryHandler from '../api/propstack-test-inquiry.js';
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
test('Energieangaben und Merkmale erscheinen nur bei vorhandenen Propstack-Werten',()=>{
  const empty=publicUnit(unit);
  assert.equal(empty.energy.value,null);
  assert.deepEqual(empty.amenities,[]);
  const filled=publicUnit({...unit,building_energy_rating_type:{value:'Verbrauchsausweis'},thermal_characteristic:{value:84.4},energy_efficiency_class:{value:'C'},firing_types:{value:'Gas'},number_of_balconies:1,parking_space_type:{value:'Garage'},cellar:true});
  assert.equal(filled.energy.kind,'Verbrauchsausweis');
  assert.equal(filled.energy.value,84.4);
  assert.deepEqual(filled.amenities,['Balkon','Garage','Keller']);
  const withYear=publicUnit({...unit,construction_year:{value:2002},energy_certificate_construction_year:null,equipment_technology_construction_year:{value:2002},energy_certificate_creation_date:{value:'2019-09-09'}});
  assert.equal(withYear.energy.buildingYear,2002);
  assert.equal(withYear.energy.equipmentYear,2002);
  assert.equal(withYear.energy.issuedOn,'2019-09-09');
});
test('Exposé-Felder werden aus dem value-Format des Detailabrufs gelesen',()=>{
  const result=publicUnit({...unit,rs_type:{value:'APARTMENT'},number_of_bed_rooms:{value:1},number_of_bath_rooms:{value:1},construction_year:{value:2002},number_of_rooms:{value:2}});
  assert.deepEqual([result.type,result.bedrooms,result.baths,result.year,result.rooms],['Wohnung',1,1,2002,2]);
});
test('Maklerkontaktdaten kommen aus dem zugewiesenen Propstack-Nutzer',()=>{
  const result=publicUnit({...unit,broker:{name:'Testmakler',phone:'+49 123',mobile:'+49 456',email:'makler@example.org',avatar_url:'https://example.org/broker.jpg'}});
  assert.deepEqual(result.broker,{name:'Testmakler',phone:'+49 123',mobile:'+49 456',email:'makler@example.org',photo:'https://example.org/broker.jpg'});
});
test('Anfrageversand bleibt ohne Schreibkonfiguration gesperrt',async()=>{
  const previous=process.env.PROPSTACK_INQUIRY_ENABLED;
  delete process.env.PROPSTACK_INQUIRY_ENABLED;
  const res={setHeader(){},status(code){this.code=code;return this},json(data){this.data=data;return this}};
  try {await inquiryHandler({method:'POST',body:{},headers:{}},res);assert.equal(res.code,503)}
  finally {if(previous===undefined) delete process.env.PROPSTACK_INQUIRY_ENABLED;else process.env.PROPSTACK_INQUIRY_ENABLED=previous}
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
      ? {id:17,title:{value:'Detailtitel'},description_note:{value:'Beschreibung'},price:{value:null},number_of_rooms:null,rs_type:{value:'APARTMENT'},number_of_bed_rooms:{value:1},number_of_bath_rooms:{value:1},construction_year:{value:2002},images:unit.images}
      : {data:[{...unit,title:'Listentitel',price:233000,number_of_rooms:2}]}});
  const res={setHeader(){},status(code){this.code=code;return this},json(data){this.data=data;return this}};
  try {await handler({method:'GET',query:{id:'17'}},res);assert.equal(res.code,200);assert.equal(res.data.items[0].title,'Detailtitel');assert.equal(res.data.items[0].description,'Beschreibung');assert.equal(res.data.items[0].price,233000);assert.equal(res.data.items[0].rooms,2);assert.equal(res.data.items[0].type,'Wohnung');assert.equal(res.data.items[0].bedrooms,1);assert.equal(res.data.items[0].baths,1);assert.equal(res.data.items[0].year,2002);assert.deepEqual(res.data.items[0].images,['https://example.org/public.jpg'])}
  finally {['PROPSTACK_API_KEY','PROPSTACK_TEST_PROPERTY_IDS','PROPSTACK_PUBLIC_STATUS_NAME'].forEach((k,i)=>previous[i]===undefined?delete process.env[k]:process.env[k]=previous[i]);globalThis.fetch=previous[3]}
});
test('Detailansicht bewahrt Maklerdaten aus der Liste, wenn das Detail sie weglässt',async()=>{
  const previous=[process.env.PROPSTACK_API_KEY,process.env.PROPSTACK_TEST_PROPERTY_IDS,process.env.PROPSTACK_PUBLIC_STATUS_NAME,globalThis.fetch];
  process.env.PROPSTACK_API_KEY='test-key';process.env.PROPSTACK_TEST_PROPERTY_IDS='17';process.env.PROPSTACK_PUBLIC_STATUS_NAME='Vermarktung';
  globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('property_statuses')
    ? {data:[{id:2,name:'Vermarktung'}]}
    : String(url).includes('units/17?new=1') ? {id:17,broker:null}
    : {data:[{...unit,broker:{name:'Frau Muster',phone:'+49 123',email:'muster@example.org'}}]}});
  const res={setHeader(){},status(code){this.code=code;return this},json(data){this.data=data;return this}};
  try {await handler({method:'GET',query:{id:'17'}},res);assert.equal(res.code,200);assert.equal(res.data.items[0].broker.phone,'+49 123');assert.equal(res.data.items[0].broker.email,'muster@example.org')}
  finally {['PROPSTACK_API_KEY','PROPSTACK_TEST_PROPERTY_IDS','PROPSTACK_PUBLIC_STATUS_NAME'].forEach((k,i)=>previous[i]===undefined?delete process.env[k]:process.env[k]=previous[i]);globalThis.fetch=previous[3]}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOwnerAddress,createOwnerFlow} from '../lib/owner-inquiry.mjs';
import {createInquiryHandler,handler} from '../api/propstack-test-inquiry.js';
import {fixture,testAddress,testBody,testPolicy} from './owner-crm-fixture.mjs';

const context={contactId:123,buyerPropertyId:17,address:testAddress};
const property=extra=>({id:201,address:testAddress,statusId:testPolicy.statusId,private:true,ownerClientIds:[123],...extra});
const response=()=>({setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
const request=body=>({method:'POST',headers:{host:'localhost:4175','content-type':'application/json'},body});
async function env(run){
  const values={NODE_ENV:'test',VERCEL_ENV:'preview',PROPSTACK_PUBLIC_API_KEY:'fixture-public',PROPSTACK_INQUIRY_API_KEY:'fixture-inquiry',PROPSTACK_INQUIRY_SOURCE_ID:'42'};
  const previous=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]])),before=global.fetch;
  Object.assign(process.env,values);
  try{await run();}finally{global.fetch=before;for(const [k,v]of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v;}
}
test('own address is ignored without checkbox and strictly validated when selected',()=>{
  assert.equal(parseOwnerAddress({...testBody,ownerInterest:false,ownerZip:'bad'}),null);
  for(const patch of [{ownerStreet:''},{ownerHouseNumber:''},{ownerZip:'1234'},{ownerType:'invented'},{ownerCity:'A\nB'},{ownerStreet:'x'.repeat(121)},{ownerType:'APARTMENT',ownerUnit:''}])assert.throws(()=>parseOwnerAddress({...testBody,...patch}));
  assert.deepEqual(parseOwnerAddress(testBody),testAddress);
  assert.equal(parseOwnerAddress({...testBody,ownerType:'APARTMENT',ownerUnit:'2. OG links'}).unit,'2. OG links');
});
test('new owner object, separate deal and one task preserve buyer and shared contact',async()=>{
  const f=fixture(),before=structuredClone({contact:f.state.contact,buyer:f.state.buyer,buyerDeal:f.state.buyerDeal});
  const flow=createOwnerFlow({repository:f.repository,policy:testPolicy});
  const result=await flow.run(context);
  assert.equal(result.status,'created');assert.notEqual(result.propertyId,17);
  assert.equal(f.state.properties.length,1);assert.equal(f.state.deals.length,1);assert.equal(f.state.tasks.length,1);
  assert.equal(f.state.tasks[0].propertyId,result.propertyId);
  assert.deepEqual(f.state.writes[0].property.relationships_attributes,[{internal_name:'owner',related_client_id:123}]);
  assert.deepEqual({contact:f.state.contact,buyer:f.state.buyer,buyerDeal:f.state.buyerDeal},before);
  assert.ok(f.state.writes.every(w=>!w.task&&!w.client));
});
test('repeated and simultaneous inquiries across buyer listings do not duplicate owner work',async()=>{
  const f=fixture(),flow=createOwnerFlow({repository:f.repository,policy:testPolicy});
  await Promise.all([flow.run(context),flow.run({...context,buyerPropertyId:18})]);
  const repeated=await flow.run({...context,buyerPropertyId:19,address:{...testAddress,street:'  MUSTERSTRAßE  ',city:'essen'}});
  assert.equal(repeated.reused,true);
  assert.equal(f.state.properties.filter(p=>p.address.street===testAddress.street).length,1);
  assert.equal(f.state.tasks.filter(t=>t.propertyId===repeated.propertyId).length,1);
});
test('proven private owner property and existing deal are reused without resetting phase',async()=>{
  const f=fixture({properties:[property()],deals:[{id:501,contactId:123,propertyId:201,pipelineId:testPolicy.pipelineId,stageId:90009}]});
  const result=await createOwnerFlow({repository:f.repository,policy:testPolicy}).run(context);
  assert.equal(result.propertyId,201);assert.equal(result.dealId,501);assert.equal(f.state.writes.length,0);assert.equal(f.state.deals[0].stageId,90009);
});
test('a proven private owner property without a deal gets exactly one deal/task',async()=>{
  const f=fixture({properties:[property()]});
  await createOwnerFlow({repository:f.repository,policy:testPolicy}).run(context);
  assert.equal(f.state.properties.length,1);assert.equal(f.state.deals.length,1);assert.equal(f.state.tasks.length,1);
});
for(const [name,properties]of Object.entries({
  buyerListing:[property({id:17})],unknownOwner:[property({ownerClientIds:[999]})],
  archived:[property({archived:true})],marketed:[property({statusId:7,private:false})],
  ambiguous:[property(),property({id:202})],differentApartment:[property({address:{...testAddress,type:'APARTMENT',unit:'1. OG'}})]
}))test(`${name}: hold for review, never adopt or mutate uncertain object`,async()=>{
  const f=fixture({properties});const result=await createOwnerFlow({repository:f.repository,policy:testPolicy}).run(context);
  assert.equal(result.status,'review_required');assert.equal(f.state.writes.length,0);assert.equal(f.state.tasks.length,0);
});
for(const failAt of ['search','property','deal'])test(`${failAt} failure: uncertainty blocks replay and never falls back to buyer object`,async()=>{
  const f=fixture({failAt}),flow=createOwnerFlow({repository:f.repository,policy:testPolicy});
  assert.equal((await flow.run(context)).status,'review_required');
  const count=f.state.writes.length;assert.equal((await flow.run(context)).status,'review_required');assert.equal(f.state.writes.length,count);
  assert.ok(f.state.tasks.every(t=>t.propertyId!==17));assert.equal(f.state.buyer.status,'Vermarktung');
});
for(const patch of [{contactStatus:'Eigentümer (Lead)'},{storageReason:'1 Jahr'},{followUpTasks:2},{privateObject:false},{stageId:234555},{statusId:157369}])test(`unsafe policy is refused before any writes: ${JSON.stringify(patch)}`,async()=>{
  const f=fixture();const flow=createOwnerFlow({repository:f.repository,policy:{...testPolicy,...patch}});
  assert.throws(()=>flow.prepare());await assert.rejects(flow.run(context));assert.equal(f.state.writes.length,0);
});
test('default handler blocks owner flow before CRM calls; ordinary buyer flow remains intact',()=>env(async()=>{
  const f=fixture();global.fetch=f.fetch;
  const blocked=response();await handler(request(testBody),blocked);
  assert.equal(blocked.code,503);assert.equal(f.state.writes.length,0);
  const missing=response();await handler(request({...testBody,ownerStreet:''}),missing);
  assert.equal(missing.code,400);assert.equal(f.state.writes.length,0);
  const buyer=response();await handler(request({...testBody,ownerInterest:false}),buyer);
  assert.equal(buyer.code,200);assert.equal(f.state.writes.length,1);assert.deepEqual(f.state.writes[0].task.property_ids,[17]);
}));
test('complete injected test handler creates two separated paths with no legacy owner note',()=>env(async()=>{
  const f=fixture();global.fetch=f.fetch;
  const ownerFlow=createOwnerFlow({repository:f.repository,policy:testPolicy}),res=response();
  await createInquiryHandler({ownerFlow})(request(testBody),res);
  assert.equal(res.code,200);assert.equal(res.body.ownerInquiryStatus,'created');
  assert.deepEqual(f.state.writes[0].task.property_ids,[17]);assert.equal(f.state.tasks.length,1);assert.notEqual(f.state.tasks[0].propertyId,17);
  assert.ok(!f.state.writes.some(w=>w.task?.note_type_id===739259));assert.equal(f.state.contact.status,'Käufer');
}));
test('owner failure after accepted buyer inquiry is explicit and does not ask for resubmission',()=>env(async()=>{
  const f=fixture({failAt:'deal'});global.fetch=f.fetch;const res=response();
  await createInquiryHandler({ownerFlow:createOwnerFlow({repository:f.repository,policy:testPolicy})})(request(testBody),res);
  assert.equal(res.code,200);assert.equal(res.body.portalInquiryTriggered,true);assert.equal(res.body.ownerInquiryStatus,'review_required');assert.deepEqual(f.state.writes[0].task.property_ids,[17]);
}));

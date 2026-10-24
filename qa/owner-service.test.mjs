import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebsiteOwnerServiceFlow} from '../lib/owner-service.mjs';
import {createInquiryHandler} from '../api/propstack-test-inquiry.js';
import {fixture,testAddress,testBody} from './owner-crm-fixture.mjs';
import {ownerInquiryOrigin} from '../lib/owner-origin.mjs';

const env={OWNER_SERVICE_ENABLED:'true',OWNER_SERVICE_URL:'https://func-sls-propstack-sync-prod-g6dggbdmg4h3azfy.germanywestcentral-01.azurewebsites.net/api/website-owner/intake',OWNER_SERVICE_KEY:'synthetic-only'};
const context={contactId:123,buyerPropertyId:17,address:testAddress,contact:{firstName:'Anna',lastName:'Muster',email:'anna@example.org',phone:'12345'}};
const response=(status,body)=>({status,json:async()=>body});
test('owner service is off by default and rejects other destinations before transmitting',()=>{
  for(const patch of [{OWNER_SERVICE_ENABLED:'false'},{OWNER_SERVICE_KEY:''},{OWNER_SERVICE_URL:'https://other.example/api/website-owner/intake'},{OWNER_SERVICE_URL:env.OWNER_SERVICE_URL+'?code=untrusted'}])assert.throws(()=>createWebsiteOwnerServiceFlow({env:{...env,...patch}}).prepare());
});
test('server sends resolved identity only to fixed authenticated backend',async()=>{
  let called=0;
  const flow=createWebsiteOwnerServiceFlow({env,fetcher:async(url,options)=>{
    called++;assert.equal(url,env.OWNER_SERVICE_URL);assert.equal(options.headers['x-functions-key'],'synthetic-only');assert.equal(options.redirect,'error');
    assert.deepEqual(JSON.parse(options.body),{version:1,...context,origin:ownerInquiryOrigin({id:17})});return response(200,{status:'created',contactId:123,propertyId:201,dealId:501});
  }});
  assert.deepEqual(await flow.run(context),{status:'created',propertyId:201,dealId:501});assert.equal(called,1);
});
test('queued receipt is distinct from confirmed CRM creation',async()=>{
  const flow=createWebsiteOwnerServiceFlow({env,fetcher:async()=>response(202,{accepted:true,receiptId:1})});
  assert.deepEqual(await flow.run(context),{status:'submitted'});
});
test('wrong object/contact, rejected input and incomplete backend results require review',async()=>{
  for(const [status,body]of [[200,{status:'created',contactId:123,propertyId:17,dealId:501}],[200,{status:'created',contactId:456,propertyId:201,dealId:501}],[200,{status:'created',contactId:123,propertyId:201}],[409,{review_required:true}],[503,{}],[202,{accepted:true}]]){
    assert.equal((await createWebsiteOwnerServiceFlow({env,fetcher:async()=>response(status,body)}).run(context)).status,'review_required');
  }
});
test('network uncertainty does not automatically repeat the request',async()=>{
  let calls=0;await assert.rejects(createWebsiteOwnerServiceFlow({env,fetcher:async()=>{calls++;throw Error('fixture timeout');}}).run(context));assert.equal(calls,1);
});
test('complete website handler keeps buyer CRM request and separate backend request apart',async()=>{
  const vars={NODE_ENV:'test',VERCEL_ENV:'preview',PROPSTACK_PUBLIC_API_KEY:'fixture-public',PROPSTACK_INQUIRY_API_KEY:'fixture-inquiry',PROPSTACK_INQUIRY_SOURCE_ID:'42'};
  const previous=Object.fromEntries(Object.keys(vars).map(k=>[k,process.env[k]])),before=global.fetch;
  Object.assign(process.env,vars);const f=fixture();global.fetch=f.fetch;let sent=0;
  const ownerFlow=createWebsiteOwnerServiceFlow({env,fetcher:async(url,options)=>{sent++;const p=JSON.parse(options.body);assert.equal(p.contactId,123);assert.equal(p.buyerPropertyId,17);assert.equal(p.address.street,testAddress.street);assert.deepEqual(p.origin,ownerInquiryOrigin({id:17,reference:'DEMO 17'}));return response(200,{status:'created',contactId:123,propertyId:201,dealId:501});}});
  const res={setHeader(){},status(code){this.code=code;return this;},json(data){this.body=data;return this;}};
  try{
    await createInquiryHandler({ownerFlow})({method:'POST',headers:{host:'localhost:4175','content-type':'application/json',referer:'https://other.example/'},body:{...testBody,contactId:999,origin:{channel:'pricehubble',pageUrl:'https://other.example/'}}},res);
    assert.equal(res.code,200);assert.equal(res.body.ownerInquiryStatus,'created');assert.equal(sent,1);assert.equal(f.state.writes.length,1);assert.deepEqual(f.state.writes[0].task.property_ids,[17]);assert.equal(f.state.writes[0].task.note_type_id,739127);
  }finally{global.fetch=before;for(const [k,v]of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
test('origin is built from the verified listing and excludes query parameters and personal data',()=>{
  const origin=ownerInquiryOrigin({id:17,title:'Ein Haus',city:'Essen',reference:'SLS 6610'});
  assert.equal(origin.pageUrl,'https://sls.de/immobilie/ein-haus-essen-sls-6610-17/');
  assert.equal(origin.channel,'website_owner_checkbox');assert.equal(origin.buyerReference,'SLS 6610');
});
test('wrong listing, external URL, tracking parameters and injected source are rejected before transfer',async()=>{
  const good=ownerInquiryOrigin({id:17});let sent=0;
  const flow=createWebsiteOwnerServiceFlow({env,fetcher:async()=>{sent++;}});
  for(const patch of [{buyerPropertyId:18},{channel:'pricehubble'},{pageUrl:'https://other.example/immobilie/immobilie-17/'},{pageUrl:good.pageUrl+'?email=private'},{buyerReference:'SLS\nInjected'}]){
    await assert.rejects(flow.run({...context,origin:{...good,...patch}}));
  }
  assert.equal(sent,0);
});

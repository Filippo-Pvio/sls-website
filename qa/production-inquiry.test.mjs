import test from 'node:test';
import assert from 'node:assert/strict';
import {handler as handler} from '../api/propstack-test-inquiry.js';
for(const override of [undefined,'12345'])test(`production inquiry uses ${override?'configured':'verified SLS'} note category`,async()=>{
 const names=['VERCEL_ENV','PROPSTACK_API_KEY','PROPSTACK_INQUIRY_SOURCE_ID','PROPSTACK_WEBSITE_INQUIRY_NOTE_TYPE_ID'];
 const previous=names.map(n=>process.env[n]),before=global.fetch,writes=[];
 Object.assign(process.env,{VERCEL_ENV:'production',PROPSTACK_API_KEY:'fixture',PROPSTACK_INQUIRY_SOURCE_ID:'42'});
 if(override)process.env.PROPSTACK_WEBSITE_INQUIRY_NOTE_TYPE_ID=override;else delete process.env.PROPSTACK_WEBSITE_INQUIRY_NOTE_TYPE_ID;
 global.fetch=async(input,options={})=>{
  const path=new URL(input).pathname.replace('/v1/','');let data;
  if(path==='property_statuses')data=[{id:7,name:'Vermarktung'}];
  else if(path==='units')data={data:[{id:17,marketing_type:'BUY',status:{id:7},broker_id:9}]};
  else if(path==='contacts')data={data:[{id:123,first_name:'Anna',last_name:'Muster'}]};
  else if(path==='contacts/123')data={id:123};
  else if(path==='client_properties')data={data:[{id:99}]};
  else if(path==='tasks'){writes.push(JSON.parse(options.body));data={id:456};}
  else if(path==='activities/456')data={id:456,source_id:42};
  else throw new Error(`Unexpected fixture request: ${path}`);
  return {ok:true,json:async()=>data};
 };
 const res={setHeader(){},status(code){this.code=code;return this},json(body){this.body=body;return this}};
 try{
  await handler({method:'POST',headers:{host:'sls-website-eight.vercel.app','content-type':'application/json'},body:{testMode:true,propertyId:'17',firstName:'Anna',lastName:'Muster',email:'anna@example.org',phone:'123',privacy:true}},res);
  assert.equal(res.code,200);assert.equal(writes.length,1);
  assert.equal(writes[0].task.note_type_id,Number(override||739127));
  assert.equal(writes[0].task.client_source_id,42);
  assert.deepEqual(writes[0].task.property_ids,[17]);assert.equal(res.body.activityVerified,true);
 }finally{global.fetch=before;names.forEach((n,i)=>previous[i]===undefined?delete process.env[n]:process.env[n]=previous[i]);}
});

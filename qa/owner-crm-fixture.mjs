import {buildingKey} from '../lib/owner-inquiry.mjs';

// Synthetic, in-memory CRM. This module has no outbound transport or credentials.
export const testPolicy={reviewed:true,statusId:90001,stageId:90002,pipelineId:90003,contactStatus:null,storageReason:null,removesContactTags:false,followUpTasks:1,privateObject:true};
export const testAddress={street:'Musterstraße',houseNumber:'12',zip:'45127',city:'Essen',country:'DEU',type:'HOUSE',unit:''};
export const testBody={testMode:true,propertyId:'17',firstName:'Anna',lastName:'Muster',email:'anna@example.org',phone:'0123456789',privacy:true,ownerInterest:true,ownerStreet:'Musterstraße',ownerHouseNumber:'12',ownerZip:'45127',ownerCity:'Essen',ownerType:'HOUSE'};

export function fixture({properties=[],deals=[],failAt}={}) {
  const state={properties:structuredClone(properties),deals:structuredClone(deals),tasks:[],writes:[],journal:new Map(),contact:{id:123,status:'Käufer',storageReason:'Maklervertrag 5 Jahre'},buyer:{id:17,status:'Vermarktung'},buyerDeal:{id:99,phase:'Rechtsformular bestätigt Verkauf'}};
  let sequence=1000;
  const repository={
    async claim(key){
      const previous=state.journal.get(key);
      if(previous)return previous.state==='done'?structuredClone(previous):{state:previous.state};
      state.journal.set(key,{state:'pending'});return {state:'claimed'};
    },
    async review(key){state.journal.set(key,{state:'review'});},
    async complete(key,result){state.journal.set(key,{state:'done',result:structuredClone(result)});},
    async findBuilding(address){
      if(failAt==='search')throw Error('fixture read failed');
      return state.properties.filter(p=>buildingKey(p.address)===buildingKey(address));
    },
    async createProperty(payload,address){
      const property={id:++sequence,address:structuredClone(address),statusId:payload.property.property_status_id,private:true,ownerClientIds:[payload.property.relationships_attributes[0].related_client_id]};
      state.properties.push(property);state.writes.push(payload);
      if(failAt==='property')throw Error('fixture uncertain property write');
      return property;
    },
    async findDeals(contactId,propertyId){return state.deals.filter(d=>d.contactId===contactId&&d.propertyId===propertyId);},
    async createDeal(payload){
      const d=payload.client_property;
      const deal={id:++sequence,contactId:d.client_id,propertyId:d.property_id,stageId:d.deal_stage_id,pipelineId:testPolicy.pipelineId};
      state.deals.push(deal);state.writes.push(payload);
      state.tasks.push({title:'Bewertungstermin vereinbaren',team:'Telesales',contactId:d.client_id,propertyId:d.property_id});
      if(failAt==='deal')throw Error('fixture uncertain deal write');
      return deal;
    }
  };
  const fetch=async(input,options={})=>{
    const u=new URL(input),path=u.pathname.replace('/v1/','');
    if(u.origin!=='https://api.propstack.de')throw Error('Fixture refuses external transport');
    let data;
    if(path==='property_statuses')data=[{id:7,name:'Vermarktung'}];
    else if(path==='units')data={data:[{id:17,unit_id:'DEMO 17',marketing_type:'BUY',status:{id:7},broker_id:9}]};
    else if(path==='contacts')data={data:[{id:123,first_name:'Anna',last_name:'Muster'}]};
    else if(path==='contacts/123')data={id:123};
    else if(path==='client_properties')data={data:[{id:99}]};
    else if(path==='tasks'&&options.method==='POST'){
      const payload=JSON.parse(options.body);
      if(payload.task.note_type_id!==739127)throw Error('Unexpected note automation');
      state.writes.push(payload);data={id:456};
    }else if(path==='activities/456')data={id:456,source_id:42};
    else throw Error('Unexpected fixture request');
    return {ok:true,json:async()=>data};
  };
  return {state,repository,fetch};
}

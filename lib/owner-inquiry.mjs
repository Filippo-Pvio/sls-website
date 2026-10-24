// Isolated fixture contract; production uses the separate Azure service.
import {addressKey} from './owner-address.mjs';
export {parseOwnerAddress,addressKey,buildingKey} from './owner-address.mjs';
const validId=value=>Number.isSafeInteger(value)&&value>0;

function assertPolicy(policy) {
  // A second deal does not protect the shared contact from phase automations.
  // The existing SLS phases/status are explicitly excluded as they are unsafe.
  if(policy?.reviewed!==true||!validId(policy.statusId)||!validId(policy.stageId)||!validId(policy.pipelineId)||policy.statusId===157369||[234555,351084].includes(policy.stageId)||policy.contactStatus!==null||policy.storageReason!==null||policy.removesContactTags!==false||policy.followUpTasks!==1||policy.privateObject!==true)
    throw new Error('Eigentümerprozess noch nicht für die getrennte Verarbeitung geprüft.');
}

export function createOwnerFlow({repository,policy}) {
  return {
    prepare(){assertPolicy(policy);},
    async run({contactId,buyerPropertyId,address}) {
      assertPolicy(policy);
      if(!validId(contactId)||!validId(buyerPropertyId))throw new Error('Ungültige Kontakt- oder Objektzuordnung.');
      // The repository must claim atomically and keep an uncertain claim blocked.
      // Same contact/address is one owner request, even across different listings.
      const key=JSON.stringify([contactId,addressKey(address)]);
      const claim=await repository.claim(key);
      if(claim.state==='done')return {...claim.result,reused:true};
      if(claim.state!=='claimed')return {status:'review_required'};
      const review=async()=>{await repository.review(key);return {status:'review_required'};};
      try {
        // Must include all pages, archived units, all statuses and all owners.
        // A failed/incomplete search must throw, never become an empty array.
        const candidates=await repository.findBuilding(address);
        if(!Array.isArray(candidates))throw new Error('Objektsuche nicht vollständig.');
        let property;
        if(candidates.length){
          const exact=candidates.filter(p=>p.address&&addressKey(p.address)===addressKey(address));
          if(exact.length!==1)return await review();
          property=exact[0];
          // Never adopt a buyer listing or an unproven/external property match.
          if(!validId(property.id)||property.id===buyerPropertyId||property.archived||property.statusId!==policy.statusId||property.private!==true||!property.ownerClientIds?.includes(contactId))return await review();
        }else{
          property=await repository.createProperty({property:{
            title:`Bewertungsanfrage – ${address.street} ${address.houseNumber}, ${address.zip} ${address.city}${address.unit?' – '+address.unit:''}`,
            street:address.street,house_number:address.houseNumber,zip_code:address.zip,city:address.city,country:address.country,
            rs_type:address.type,property_status_id:policy.statusId,
            relationships_attributes:[{internal_name:'owner',related_client_id:contactId}]
          }},address);
          if(!validId(property?.id)||property.id===buyerPropertyId)throw new Error('Eigentümerobjekt nicht eindeutig angelegt.');
        }
        const deals=await repository.findDeals(contactId,property.id);
        if(!Array.isArray(deals)||deals.length>1)return await review();
        let deal=deals[0];
        // Repeated requests must not reset an existing phase or restart its task.
        if(deal&&(deal.pipelineId!==policy.pipelineId||deal.propertyId!==property.id||deal.contactId!==contactId||!validId(deal.id)))return await review();
        if(!deal)deal=await repository.createDeal({client_property:{client_id:contactId,property_id:property.id,deal_stage_id:policy.stageId}});
        if(!validId(deal?.id))throw new Error('Eigentümerdeal nicht bestätigt.');
        // Exactly one task is supplied by the audited deal phase. No owner note
        // with category 739259, extra task or contact-wide PATCH is sent here.
        const result={status:'created',propertyId:property.id,dealId:deal.id,reused:candidates.length>0};
        await repository.complete(key,result);
        return result;
      }catch{
        // No automatic replay after a timeout: an upstream write may have worked.
        return await review();
      }
    }
  };
}

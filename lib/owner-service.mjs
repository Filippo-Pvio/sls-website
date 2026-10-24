import {parseOwnerAddress} from './owner-address.mjs';
import {ownerInquiryOrigin,validOwnerOrigin} from './owner-origin.mjs';

const serviceHost='func-sls-propstack-sync-prod-g6dggbdmg4h3azfy.germanywestcentral-01.azurewebsites.net';
const validId=value=>Number.isSafeInteger(value)&&value>0;

// Server-to-server API call to the existing valuation backend. No CRM webhook,
// HTML mail importer or PriceHubble sender/dossier impersonation is involved.
export function createWebsiteOwnerServiceFlow({env=process.env,fetcher=(...args)=>fetch(...args)}={}) {
  function configuration(){
    const url=new URL(env.OWNER_SERVICE_URL||'https://invalid.invalid');
    if(env.OWNER_SERVICE_ENABLED!=='true'||url.protocol!=='https:'||url.hostname!==serviceHost||url.port||url.username||url.password||url.search||url.hash||url.pathname!=='/api/website-owner/intake'||!env.OWNER_SERVICE_KEY)
      throw Error('Eigentümereingang noch nicht freigegeben.');
    return {url:url.href,key:env.OWNER_SERVICE_KEY};
  }
  return {
    prepare(){configuration();},
    async run({contactId,buyerPropertyId,address,contact,origin=ownerInquiryOrigin({id:buyerPropertyId})}) {
      const cfg=configuration();
      if(!validId(contactId)||!validId(buyerPropertyId))throw Error('Ungültige Zuordnung.');
      if(!validOwnerOrigin(origin,buyerPropertyId))throw Error('Ungültige Anfrageherkunft.');
      const own=parseOwnerAddress({ownerInterest:true,ownerStreet:address?.street,ownerHouseNumber:address?.houseNumber,ownerZip:address?.zip,ownerCity:address?.city,ownerType:address?.type,ownerUnit:address?.unit});
      // contactId was resolved by the buyer API, never taken from browser input.
      const response=await fetcher(cfg.url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json','x-functions-key':cfg.key},body:JSON.stringify({version:1,contactId,buyerPropertyId,address:own,contact,origin})});
      const result=await response.json().catch(()=>({}));
      if(response.status===200&&result.status==='created'&&validId(result.propertyId)&&result.propertyId!==buyerPropertyId&&validId(result.dealId)&&result.contactId===contactId)
        return {status:'created',propertyId:result.propertyId,dealId:result.dealId};
      if(response.status===202&&result.accepted===true&&validId(result.receiptId))return {status:'submitted'};
      // No retries after an uncertain response. SQL state on the service holds
      // a possibly completed write, and repeated requests use the same identity.
      return {status:'review_required'};
    }
  };
}

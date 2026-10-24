import {objectPath} from '../assets/property-seo.mjs';

// Build attribution from the verified listing, never a submitted URL/Referer.
export function ownerInquiryOrigin({id,reference='',title='',city=''}) {
  if(!Number.isSafeInteger(id)||id<1)throw Error('Ungültiges Herkunftsobjekt.');
  const safe=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,150):'';
  const property={id,reference:safe(reference),title:safe(title),city:safe(city)};
  return {channel:'website_owner_checkbox',buyerPropertyId:id,buyerReference:property.reference,pageUrl:`https://sls.de${objectPath(property)}`};
}

export function validOwnerOrigin(origin,buyerPropertyId) {
  if(origin?.channel!=='website_owner_checkbox'||origin.buyerPropertyId!==buyerPropertyId||typeof origin.buyerReference!=='string'||origin.buyerReference.length>150||/[\u0000-\u001f\u007f]/u.test(origin.buyerReference)||typeof origin.pageUrl!=='string'||origin.pageUrl.length>500)return false;
  try{
    const url=new URL(origin.pageUrl);
    return url.origin==='https://sls.de'&&!url.username&&!url.password&&!url.search&&!url.hash&&new RegExp(`^/immobilie/[a-z0-9-]+-${buyerPropertyId}/$`).test(url.pathname);
  }catch{return false;}
}

import {writeFile,mkdir,cp} from 'node:fs/promises';
const BASE='https://api.propstack.de/v1/';
const TEST_ID='5644071';
const key=process.env.PROPSTACK_API_KEY;
async function get(path){
  if(!key)throw new Error('no_key');
  const r=await fetch(new URL(path,BASE),{headers:{'X-API-KEY':key},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error(`HTTP_${r.status}_${path.split('?')[0]}`);
  return r.json();
}
function rows(b){if(Array.isArray(b))return b;for(const k of ['data','events','client_properties','activities','emails','messages','client_sources','activity_types','note_types'])if(Array.isArray(b?.[k]))return b[k];throw new Error('unexpected_response');}
async function all(path){
 const result=[],seen=new Set();
 for(let page=1;page<=100;page++){
  const b=await get(path+(path.includes('?')?'&':'?')+`per=100&page=${page}`), batch=rows(b);
  for(const x of batch){if(x.id==null||seen.has(String(x.id)))throw new Error('pagination_not_progressing');seen.add(String(x.id));result.push(x);}
  const total=b.meta?.total_count;
  if(total!=null&&result.length>=Number(total))return result;
  if(!batch.length){if(total!=null&&result.length<Number(total))throw new Error('incomplete_pagination');return result;}
 }
 throw new Error('pagination_limit');
}
async function optionalAll(path){try{return {ok:true,rows:await all(path)}}catch(e){return {ok:false,rows:[],error:e.message}}}
function belongs(x,id){return [x.property_id,x.property?.id,...(x.property_ids||[]),...(x.properties||[]).map(p=>p.id),...(x.units||[]).map(p=>p.id)].some(v=>String(v)===id);}
const norm=v=>String(v??'').trim().toLocaleLowerCase('de-DE');
function flatStrings(v,out=[]){if(v==null)return out;if(typeof v==='string'||typeof v==='number'){out.push(norm(v));return out;}if(Array.isArray(v)){for(const x of v)flatStrings(x,out);return out;}if(typeof v==='object')for(const x of Object.values(v))flatStrings(x,out);return out;}
function hasText(v,list){const hay=flatStrings(v).join(' | ');return list.some(x=>hay.includes(norm(x)));}
const PORTAL=['homepage','immobilienscout24','immoscout24','immowelt','sls website','sls.de','ebay kleinanzeigen','kleinanzeigen','frimo'];
const OWN_MAIL_CATEGORY_IDS=new Set([180736,180740]);
const PRICE_FINANCE=['preis und finanzierung','preis & finanzierung','preis','finanzierung','finanzierbarkeit'];
try{
 const unit=await get(`units/${TEST_ID}?new=1`);
 if(String(unit.id)!==TEST_ID)throw new Error('object_scope_not_verified');
 const unitId=String(unit.id);
 const [events,deals,activitiesResult,activityTypesResult,clientSourcesResult]=await Promise.all([all(`events?property=${unitId}`),all(`client_properties?property_id=${unitId}&show_archived_clients=true`),optionalAll(`activities?property_id=${unitId}&only_inquiries=1`),optionalAll(`activity_types`),optionalAll(`client_sources`)]);
 if(events.some(e=>!belongs(e,unitId))||deals.some(d=>!belongs(d,unitId)))throw new Error('object_scope_not_verified');
 // SLS category IDs verified in Propstack administration on 2026-09-29.
 const viewingEvents=events.filter(e=>[321135,321136].includes(Number(e.note_type_id)));
 const viewings={planned:0,completed:0,cancelled:0,unconfirmed:0};
 const now=Date.now();
 for(const e of viewingEvents){
  if(e.state==='took_place')viewings.completed++;
  else if(e.state==='cancelled')viewings.cancelled++;
  else if(e.state==='neutral'&&Date.parse(e.starts_at)>now)viewings.planned++;
  else viewings.unconfirmed++;
 }
 const dealClientIds=[...new Set(deals.map(d=>d.client_id).filter(Boolean).map(String))];
 const emailResult=await optionalAll(`activities?property_id=${unitId}&item_type=message`);
 const emailActivityRows=emailResult.rows;
 const portalSourceIds=new Set(clientSourcesResult.rows.filter(s=>hasText(s.name,PORTAL)).map(s=>Number(s.id)).filter(Number.isFinite));
 const portalDeals=deals.filter(d=>portalSourceIds.has(Number(d.client_source_id)));
 const portalClients=new Set(portalDeals.map(d=>d.client_id).filter(Boolean).map(String));
 const ownEmails=emailActivityRows.filter(e=>OWN_MAIL_CATEGORY_IDS.has(Number(e.message_category_id??e.category_id)));
 const ownClients=new Set(ownEmails.flatMap(e=>[e.client_id,...(e.client_ids||[]),...(e.clients||[]).map(x=>x?.id)]).filter(Boolean).map(String));
 const amounts=deals.map(d=>d.sold_price??d.purchase_price??d.offer_price??d.price).map(v=>v?.value??v).map(v=>Number(String(v??'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))).filter(v=>Number.isFinite(v)&&v>0).sort((a,b)=>b-a);
 const rejectionReasons={priceFinance:0,other:0};
 for(const d of deals){
   const reason=d.rejection_reason??d.rejection_reason_name??d.cancel_reason??d.cancellation_reason??d.lost_reason??d.deal_lost_reason??d.reason;
   if(reason==null)continue;
   if(hasText(reason,PRICE_FINANCE))rejectionReasons.priceFinance++;
   else rejectionReasons.other++;
 }
 const data={status:'ok',generatedAt:new Date().toISOString(),requestedPropertyId:TEST_ID,propertyId:unitId,counts:{portalInquiries:activitiesResult.rows.length,ownDatabaseContacts:ownClients.size||ownEmails.length,interestedParties:new Set(deals.map(d=>d.client_id).filter(Boolean)).size,deals:deals.length,viewings:viewings.completed,offers:amounts.length},viewings,topOffers:amounts.slice(0,3),rejectionReasons,diagnostics:{objectVerified:true,deals:deals.length,dealFields:Object.keys(deals[0]||{}),dealClientIds:dealClientIds.length,events:events.length,viewingEvents:viewingEvents.length,otherEvents:events.length-viewingEvents.length,portalActivities:portalDeals.length,ownDatabaseEmails:ownEmails.length,activitiesAvailable:activitiesResult.ok,activityRows:activitiesResult.rows.length,activityFields:Object.keys(activitiesResult.rows[0]||{}),activityError:activitiesResult.error||null,emailRows:emailActivityRows.length,emailFields:Object.keys(emailActivityRows[0]||{}),emailError:emailResult.error||null,emailMatchedRows:ownEmails.length,activityTypeRows:activityTypesResult.rows.length,activityTypeFields:Object.keys(activityTypesResult.rows[0]||{}),clientSourceRows:clientSourcesResult.rows.length,clientSourceFields:Object.keys(clientSourcesResult.rows[0]||{}),offerSource:'deal purchase price',viewingCountUnit:'appointments'}};
 await mkdir('eigentuemer-cockpit-test',{recursive:true});
 await writeFile('eigentuemer-cockpit-test/owner-report-data.json',JSON.stringify(data,null,2));
 console.log('OWNER_REPORT:ok',JSON.stringify(data));
}catch(e){
 const code=/^(no_key|no_unique_unit_\d+|HTTP_\d+_[a-z_]+|object_scope_not_verified|pagination_not_progressing|incomplete_pagination|pagination_limit|unexpected_response)$/.test(e.message)?e.message:'upstream_unavailable';
 await mkdir('eigentuemer-cockpit-test',{recursive:true});
 await writeFile('eigentuemer-cockpit-test/owner-report-data.json',JSON.stringify({generatedAt:new Date().toISOString(),requestedPropertyId:TEST_ID,status:'unavailable',error:code,counts:null,viewings:null,topOffers:[]},null,2));
 console.warn('OWNER_REPORT:unavailable',code);
}

// Explicit public allowlist for this isolated reporting preview.
await mkdir('public/eigentuemer-cockpit-test',{recursive:true});
for(const name of ['index.html','owner-report-data.json'])await cp(`eigentuemer-cockpit-test/${name}`,`public/eigentuemer-cockpit-test/${name}`);

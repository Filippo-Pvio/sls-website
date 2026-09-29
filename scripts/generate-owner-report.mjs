import {writeFile,mkdir} from 'node:fs/promises';
const BASE='https://api.propstack.de/v1/';
const TEST_ID='101701672';
const key=process.env.PROPSTACK_API_KEY;
async function get(path){
  if(!key)throw new Error('no_key');
  const r=await fetch(new URL(path,BASE),{headers:{'X-API-KEY':key},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error(`HTTP_${r.status}_${path.split('?')[0]}`);
  return r.json();
}
function rows(b){if(Array.isArray(b))return b;for(const k of ['data','events','client_properties','note_types'])if(Array.isArray(b?.[k]))return b[k];throw new Error('unexpected_response');}
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
function belongs(x,id){return [x.property_id,x.property?.id,...(x.property_ids||[]),...(x.properties||[]).map(p=>p.id),...(x.units||[]).map(p=>p.id)].some(v=>String(v)===id);}
try{
 const units=await all(`units?with_meta=1&q=${TEST_ID}&archived=-1`);
 const matches=units.filter(u=>[u.id,u.unit_id,u.exposee_id].some(v=>String(v?.value??v)===TEST_ID));
 if(matches.length!==1)throw new Error(`no_unique_unit_${matches.length}`);
 const unitId=String(matches[0].id);
 const [events,deals]=await Promise.all([all(`events?property=${unitId}`),all(`client_properties?property_id=${unitId}&show_archived_clients=true`)]);
 if(events.some(e=>!belongs(e,unitId))||deals.some(d=>!belongs(d,unitId)))throw new Error('object_scope_not_verified');
 console.log('OWNER_REPORT:schema',JSON.stringify({propertyId:unitId,eventFields:Object.keys(events[0]||{}),dealFields:Object.keys(deals[0]||{}),eventTypes:[...new Set(events.map(e=>e.note_type_id))],eventStates:[...new Set(events.map(e=>e.state))]}));
 const viewings={planned:0,completed:0,cancelled:0,unclassified:0};
 // Until the account's structured categories are verified, never count all events as viewings.
 const viewingEvents=events.filter(e=>/besichtigung/i.test(String(e.note_type?.name||'')));
 for(const e of viewingEvents){const s={neutral:'planned',took_place:'completed',cancelled:'cancelled'}[e.state]||'unclassified';viewings[s]++;}
 const data={generatedAt:new Date().toISOString(),requestedPropertyId:TEST_ID,propertyId:unitId,counts:{interestedParties:new Set(deals.map(d=>d.client_id).filter(Boolean)).size,deals:deals.length,viewings:null,offers:null},viewings:null,topOffers:[],diagnostics:{objectVerified:true,events:events.length,viewingCategoriesVerified:false,offerFieldsVerified:false}};
 await mkdir('eigentuemer-cockpit-test',{recursive:true});
 await writeFile('eigentuemer-cockpit-test/owner-report-data.json',JSON.stringify(data,null,2));
 console.log('OWNER_REPORT:ok',JSON.stringify(data));
}catch(e){
 const code=/^(no_key|no_unique_unit_\d+|HTTP_\d+_[a-z_]+|object_scope_not_verified|pagination_not_progressing|incomplete_pagination|pagination_limit|unexpected_response)$/.test(e.message)?e.message:'upstream_unavailable';
 await mkdir('eigentuemer-cockpit-test',{recursive:true});
 await writeFile('eigentuemer-cockpit-test/owner-report-data.json',JSON.stringify({generatedAt:new Date().toISOString(),requestedPropertyId:TEST_ID,status:'unavailable',error:code,counts:null,viewings:null,topOffers:[]},null,2));
 console.warn('OWNER_REPORT:unavailable',code);
}

import {writeFile,mkdir,cp} from 'node:fs/promises';
const BASE='https://api.propstack.de/v1/';
const TEST_ID='3528391';
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
 const unit=await get(`units/${TEST_ID}?new=1`);
 if(String(unit.id)!==TEST_ID)throw new Error('object_scope_not_verified');
 const unitId=String(unit.id);
 const [events,deals]=await Promise.all([all(`events?property=${unitId}`),all(`client_properties?property_id=${unitId}&show_archived_clients=true`)]);
 if(events.some(e=>!belongs(e,unitId))||deals.some(d=>!belongs(d,unitId)))throw new Error('object_scope_not_verified');
 const types=await get('note_types').catch(()=>null);
 const pipelines=await get('deal_pipelines').catch(()=>null);
 console.log('OWNER_REPORT:categories',JSON.stringify({types,pipelines:pipelines?rows(pipelines).map(p=>({id:p.id,stages:p.deal_stages?.map(s=>({id:s.id,name:s.name}))})):null,events:events.map(e=>({type:e.note_type_id,state:e.state,mass:e.mass_viewing,participantCount:e.viewings?.length,participantFields:Object.keys(e.viewings?.[0]||{})})),dealAmounts:deals.filter(d=>Number(d.sold_price)>0).map(d=>({amount:d.sold_price,stage:d.deal_stage_id})),customFieldKeys:[...new Set(deals.flatMap(d=>Object.keys(d.custom_fields||{})))]}));
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

// Explicit public allowlist for this isolated reporting preview.
await mkdir('public/eigentuemer-cockpit-test',{recursive:true});
for(const name of ['index.html','owner-report-data.json'])await cp(`eigentuemer-cockpit-test/${name}`,`public/eigentuemer-cockpit-test/${name}`);

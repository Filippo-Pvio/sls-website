import {writeFile,mkdir} from "node:fs/promises";
const BASE="https://api.propstack.de/v1/";
const TEST_ID="101701672";
const key=process.env.PROPSTACK_API_KEY;
if(!key){console.error("OWNER_REPORT:no_key");process.exit(1)}
async function get(path){const r=await fetch(new URL(path,BASE),{headers:{"X-API-KEY":key}});const body=await r.json().catch(()=>null);return{ok:r.ok,status:r.status,body}}
function rows(body){if(Array.isArray(body))return body;for(const k of ["data","events","client_properties"]){if(Array.isArray(body?.[k]))return body[k]}return[]}
function eventStatus(e){return String(e?.status||e?.state||e?.event_status||"").toLowerCase()}
function price(d){for(const k of ["price","offer_price","purchase_price","amount"]){const v=Number(d?.[k]);if(Number.isFinite(v)&&v>0)return v}return null}
const list=await get("units?with_meta=1&property_ids="+TEST_ID+"&per=10");
let unitId=null;
for(const u of rows(list.body)){if(String(u?.id)===TEST_ID){unitId=String(u.id);break}}
if(!unitId && rows(list.body)[0]?.id)unitId=String(rows(list.body)[0].id);
if(!unitId){const direct=await get("units/"+TEST_ID+"?new=1");if(direct.ok&&direct.body?.id)unitId=String(direct.body.id)}
if(!unitId){console.error("OWNER_REPORT:no_unit_id",JSON.stringify({listStatus:list.status,listCount:rows(list.body).length}));process.exit(1)}
const [eventsR,dealsR]=await Promise.all([
  get("events?property="+encodeURIComponent(unitId)),
  get("client_properties?property_id="+encodeURIComponent(unitId)+"&per=100")
]);
const events=rows(eventsR.body),deals=rows(dealsR.body);
const statuses={planned:0,completed:0,cancelled:0};
for(const e of events){const s=eventStatus(e);if(s.includes("cancel"))statuses.cancelled++;else if(s.includes("took")||s.includes("complete")||s.includes("done"))statuses.completed++;else statuses.planned++}
const offers=deals.map(price).filter(v=>v!=null).sort((a,b)=>b-a).slice(0,3);
const data={
  generatedAt:new Date().toISOString(),
  propertyId:unitId,
  counts:{interestedParties:deals.length,viewings:statuses.completed,offers:offers.length},
  viewings:statuses,
  topOffers:offers,
  diagnostics:{eventsStatus:eventsR.status,dealsStatus:dealsR.status}
};
await mkdir("eigentuemer-cockpit-test",{recursive:true});
await writeFile("eigentuemer-cockpit-test/owner-report-data.json",JSON.stringify(data,null,2));
console.log("OWNER_REPORT:ok",JSON.stringify({propertyId:unitId,events:events.length,deals:deals.length,completed:statuses.completed,cancelled:statuses.cancelled,offers:offers.length}));
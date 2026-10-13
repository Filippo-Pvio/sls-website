import {readFileSync} from 'node:fs';
import {propertyTaxonomy} from './property-taxonomy.mjs';
import {referenceParticipants} from './profile-reference-roles.mjs';
const team=JSON.parse(readFileSync(new URL('../content/team/profiles.json',import.meta.url),'utf8'));
const reviews=JSON.parse(readFileSync(new URL('../content/team/reviews.json',import.meta.url),'utf8'));
team.push({slug:'filippo-livera',name:'Filippo Livera',portrait:'/assets/images/magazin/filippo.jpg',role:'Geschäftsführer'});
const v=x=>x&&typeof x==='object'&&'value' in x?x.value:x;
export function httpsUrl(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return ''}}
const plain=value=>String(v(value)||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export function referenceSummary(value,maxWords=150){
 const text=plain(value);
 const sentences=text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)||[];
 const kept=[];let count=0;
 for(const part of sentences){const sentence=part.trim();if(/jetzt\s+(?:besichtigen|anfragen|kontakt)|vereinbaren\s+sie|kontaktieren\s+sie|verfügbar\s+ab|bezugsfrei\s+ab|reservieren|@|https?:\/\//i.test(sentence))continue;
 const words=sentence.split(/\s+/).length;if(count+words>maxWords){if(!kept.length)kept.push(sentence.split(/\s+/).slice(0,maxWords).join(' ')+' …');break}kept.push(sentence);count+=words;}
 return kept.join(' ');
}
// Verified public company review; never attributed to a specific colleague or property.
const companyReview={author:'Monika Hecker',rating:5,excerpt:'Wir haben den Verkauf unserer Immobilie über dieses Maklerbüro abgewickelt. Selbst unter schwierigeren Rahmenbedingungen verlief der gesamte Prozess absolut reibungslos.',partial:true,googleMapsUri:'https://www.google.com/maps/reviews/data=!4m6!14m5!1m4!2m3!1sCi9DQUlRQUNvZENodHljRjlvT2s4NE5qSnZVR3R0T1VZNUxVaHpMVmhoUkVKWFdIYxAB!2m1!1s0x8a1a616dc32ad483:0xdf996794c2ce85eb',verifiedOn:'2026-10-13'};
const photoUrl=x=>httpsUrl(x.big_url||x.big||x.medium_url||x.medium||x.url);
export function projectReferenceDetail(unit,item,brokers=[]){
 const publicImages=(unit.images||[]).filter(x=>x.is_private===false);
 const images=[...new Set(publicImages.filter(x=>x.is_floorplan!==true).map(photoUrl).filter(Boolean))];
 if(!images.length)images.push(item.image);
 const floorplans=publicImages.filter(x=>x.is_floorplan===true).map((x,i)=>({title:plain(x.title)||`Grundriss ${i+1}`,preview:photoUrl(x),url:httpsUrl(x.url)||photoUrl(x)}));
 for(const x of unit.floorplans||[])if(x.is_private!==true&&(x.is_private===false||x.on_landing_page===true)){
  const url=httpsUrl(x.url);if(url&&!floorplans.some(f=>f.url===url))floorplans.push({title:plain(x.title||x.name)||'Grundriss',url,preview:/\.(?:png|jpe?g|webp)(?:\?|$)/i.test(url)?url:''});
 }
 const taxonomy=propertyTaxonomy(unit),facts=[];
 if(taxonomy.subtype||taxonomy.type!=='Immobilie')facts.push(['Objektart',taxonomy.subtype||taxonomy.type]);
 facts.push(['Ort',item.city]);
 for(const [label,field,unitLabel] of [['Wohnfläche','living_space',' m²'],['Grundstück','plot_area',' m²'],['Zimmer','number_of_rooms',''],['Baujahr','construction_year','']]){const raw=v(unit[field]);const n=Number(raw);if(raw!=null&&raw!==''&&Number.isFinite(n)&&n>0)facts.push([label,new Intl.NumberFormat('de-DE',{maximumFractionDigits:2,useGrouping:field!=='construction_year'}).format(n)+unitLabel]);}
 const map=new Map(brokers.map(b=>[String(b.id),b]));if(unit.broker?.id)map.set(String(unit.broker.id),unit.broker);
 const roles=referenceParticipants(unit,map),people=[];
 for(const role of roles){const person=team.find(p=>p.slug===role.profile);if(!person)continue;const existing=people.find(p=>p.slug===person.slug);if(existing)existing.roles.push(role.role);else people.push({slug:person.slug,name:person.name,portrait:httpsUrl(person.portrait)||person.portrait,roles:[role.role],review:reviews[person.slug]||companyReview,reviewKind:reviews[person.slug]?'personal':'company'});}

 const media=(unit.links||[]).filter(x=>x.is_private!==true&&(x.is_private===false||x.on_landing_page===true)).map(x=>({title:plain(x.title)||'Video',url:httpsUrl(x.url)})).filter(x=>x.url&&!/rundgang|360|virtuell|matterport|tour\.sls\.de/i.test(x.title+' '+x.url)&&/video|drohne|youtube|youtu\.be/i.test(x.title+' '+x.url));
 return {...item,images,floorplans:floorplans.filter(x=>x.url&&(!x.preview||httpsUrl(x.preview))),facts,description:referenceSummary(unit.description_note),location:referenceSummary(unit.location_note,75),people,media};
}
export async function loadReferenceDetail(item,key,{request=fetch}={}){
 const read=async path=>{const response=await request('https://api.propstack.de/v1/'+path,{headers:{'X-API-KEY':key},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Reference detail unavailable');return response.json()};
 const statusesResult=await read('property_statuses');
 const statuses=Array.isArray(statusesResult)?statusesResult:statusesResult.data||[];
 const soldIds=new Set(statuses.filter(s=>['verkauft','erfolgreich vermarktet'].includes(String(s.name||'').trim().toLocaleLowerCase('de-DE'))).map(s=>String(s.id)));
 if(!soldIds.size)throw Error('No sold status');
 let listed=null;
 for(let page=1;page<=50;page++){
  const query=new URLSearchParams({with_meta:'1',status:[...soldIds].join(','),marketing_type:'BUY',archived:'-1',per:'100',page:String(page)});
  const listing=await read('units?'+query),rows=Array.isArray(listing)?listing:listing.data||[];
  listed=rows.find(u=>String(u.id)===String(item.id)&&u.marketing_type==='BUY'&&soldIds.has(String(u.status?.id)));
  if(listed||rows.length<100)break;
 }
 if(!listed)return null;
 const detail=await read('units/'+encodeURIComponent(item.id)+'?new=1');
 if(String(detail.id)!==String(item.id))return null;
 const unit={...listed,...detail,status:listed.status,marketing_type:listed.marketing_type,images:detail.images?.length?detail.images:listed.images};
 let brokers=[];try{const result=await read('brokers');brokers=Array.isArray(result)?result:result.data||[]}catch{/* Public gallery remains usable without a staff assignment. */}
 return projectReferenceDetail(unit,item,brokers);
}

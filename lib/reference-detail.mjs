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
 for(const [label,field,unitLabel] of [['Wohnfläche','living_space',' m²'],['Grundstück','plot_area',' m²'],['Zimmer','number_of_rooms',''],['Baujahr','construction_year','']]){const raw=v(unit[field]);const n=Number(raw);if(raw!=null&&raw!==''&&Number.isFinite(n)&&n>0)facts.push([label,new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n)+unitLabel]);}
 const map=new Map(brokers.map(b=>[String(b.id),b]));if(unit.broker?.id)map.set(String(unit.broker.id),unit.broker);
 const roles=referenceParticipants(unit,map),people=[];
 for(const role of roles){const person=team.find(p=>p.slug===role.profile);if(!person)continue;const existing=people.find(p=>p.slug===person.slug);if(existing)existing.roles.push(role.role);else people.push({slug:person.slug,name:person.name,portrait:httpsUrl(person.portrait)||person.portrait,roles:[role.role],review:reviews[person.slug]||null});}
 const media=(unit.links||[]).filter(x=>x.is_private!==true&&(x.is_private===false||x.on_landing_page===true)).map(x=>({title:plain(x.title)||'Weitere Einblicke',url:httpsUrl(x.url)})).filter(x=>x.url&&/rundgang|360|virtuell|video|drohne|youtube|youtu\.be/i.test(x.title+' '+x.url));
 return {...item,images,floorplans:floorplans.filter(x=>x.url&&(!x.preview||httpsUrl(x.preview))),facts,description:referenceSummary(unit.description_note),location:referenceSummary(unit.location_note,75),people,media};
}
export async function loadReferenceDetail(item,key,{request=fetch}={}){
 const read=async path=>{const response=await request('https://api.propstack.de/v1/'+path,{headers:{'X-API-KEY':key},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Reference detail unavailable');return response.json()};
 const unit=await read('units/'+encodeURIComponent(item.id)+'?new=1');
 // Recheck historical status; a stale catalog may never expose an active property.
 if(String(unit.id)!==item.id||unit.marketing_type!=='BUY'||!['verkauft','erfolgreich vermarktet'].includes(String(unit.status?.name||'').trim().toLocaleLowerCase('de-DE')))return null;
 let brokers=[];try{const result=await read('brokers');brokers=Array.isArray(result)?result:result.data||[]}catch{/* Public gallery remains usable without a staff assignment. */}
 return projectReferenceDetail(unit,item,brokers);
}

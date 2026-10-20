import {propertyTaxonomy} from './property-taxonomy.mjs';
const value=x=>x&&typeof x==='object'&&'value' in x?x.value:x;
const number=new Intl.NumberFormat('de-DE',{maximumFractionDigits:2});
// Exactly the public reference detail's photos and factual fields; never prices or contacts.
export function referenceDisplayItem(unit,item){
 const images=[...new Set((unit.images||[]).filter(x=>x.is_private===false&&x.is_floorplan!==true).map(x=>{
  try{const u=new URL(x.big_url||x.big||x.medium_url||x.medium||x.url);return u.protocol==='https:'?u.href:null}catch{return null}
 }).filter(Boolean))].slice(0,3);
 const facts=[];
 for(const [label,field,suffix] of [['Wohnfläche','living_space',' m²'],['Grundstück','plot_area',' m²'],['Zimmer','number_of_rooms',''],['Baujahr','construction_year','']]){
  const raw=value(unit[field]),n=Number(raw);
  if(raw!=null&&raw!==''&&Number.isFinite(n)&&n>0)facts.push([label,field==='construction_year'?String(n):number.format(n)+suffix]);
 }
 return {id:item.id,title:item.title,city:item.city,zip:item.zip,type:propertyTaxonomy(unit).type,
  images:images.length?images:[item.image],facts};
}

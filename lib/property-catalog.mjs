import {matchesMarketCity} from '../assets/market-city-match.mjs';
// Only fields needed by a result card leave the listing endpoint.
export function propertyCard(p){
  return Object.fromEntries(['id','reference','title','city','zip','price','area','rooms','type','status','courtage','energy'].map(k=>[k,p[k]]).concat([['images',(p.images||[]).slice(0,1)]]));
}
const text=v=>String(v||'').trim().toLocaleLowerCase('de-DE');
export function queryProperties(items,q){
  const query=text(q.query),city=text(q.city),type=String(q.type||''),price=Number(q.price),area=Number(q.area),rooms=Number(q.rooms);
  const found=items.filter(p=>(!query||text(`${p.title} ${p.reference||''} ${p.id} ${p.city} ${p.zip}`).includes(query))&&(!city||(q.marketCity==='1'?matchesMarketCity(p,q.city):text(p.city).includes(city)))&&(!type||p.type===type)&&(!price||(p.price!=null&&p.price<=price))&&(!area||(p.area!=null&&p.area>=area))&&(!rooms||(p.rooms!=null&&p.rooms>=rooms)));
  const sort=String(q.sort||'default');
  if(['price-asc','price-desc','area-desc'].includes(sort)){
    const key=sort==='area-desc'?'area':'price',direction=sort==='price-asc'?1:-1;
    found.sort((a,b)=>a[key]==null?(b[key]==null?0:1):b[key]==null?-1:direction*(a[key]-b[key]));
  }
  return found;
}
// One bounded snapshot per warm function; concurrent requests share the refresh.
export function cachedCatalog(load,ttl=60000){
  let cached=null,pending=null;
  return async(key,status)=>{
    const identity=`${key}:${status}`;
    if(cached?.identity===identity&&cached.expires>Date.now())return cached.items;
    if(pending?.identity===identity)return pending.promise;
    const entry={identity};
    entry.promise=load(key,status).then(items=>{cached={identity,items,expires:Date.now()+ttl};return items}).finally(()=>{if(pending===entry)pending=null});
    pending=entry;return entry.promise;
  };
}

import {propertyTypes} from './property-taxonomy.mjs';
const typeMap=Object.fromEntries(Object.entries(propertyTypes).map(([code,label])=>[label.toLocaleLowerCase('de-DE'),[code]]));

const cleanText=value=>String(value??'').trim();
const positive=value=>{
  const number=Number(value);
  return Number.isFinite(number)&&number>0?number:null;
};
const normaliseList=value=>(Array.isArray(value)?value:[])
  .map(item=>cleanText(item).toLocaleLowerCase('de-DE'))
  .filter(Boolean)
  .sort();

export function buildSavedQuery(criteria={},clientId){
  const saved_query={
    client_id:Number(clientId),
    active:true,
    marketing_type:'BUY',
    note:'Suchauftrag über die SLS Website angelegt.'
  };

  const city=cleanText(criteria.city);
  if(city)saved_query.cities=[city];

  const mapped=typeMap[cleanText(criteria.type).toLocaleLowerCase('de-DE')];
  if(mapped)saved_query.rs_types=mapped;
  const subtype=cleanText(criteria.subtype);
  if(mapped&&/^[A-Z][A-Z_]*$/.test(subtype))saved_query.rs_categories=[subtype];

  const priceTo=positive(criteria.price);
  if(priceTo!=null)saved_query.price_to=priceTo;

  const livingSpace=positive(criteria.minArea);
  if(livingSpace!=null)saved_query.living_space=livingSpace;

  const rooms=positive(criteria.rooms);
  if(rooms!=null)saved_query.number_of_rooms=rooms;

  return saved_query;
}

export function sameSavedQuery(existing={},candidate={}){
  if(String(existing.marketing_type||'')!==String(candidate.marketing_type||''))return false;
  if(JSON.stringify(normaliseList(existing.cities))!==JSON.stringify(normaliseList(candidate.cities)))return false;
  if(JSON.stringify(normaliseList(existing.rs_types))!==JSON.stringify(normaliseList(candidate.rs_types)))return false;

  if(JSON.stringify(normaliseList(existing.rs_categories))!==JSON.stringify(normaliseList(candidate.rs_categories)))return false;
  const sameNumber=(a,b)=>{
    const left=positive(a),right=positive(b);
    return left===right;
  };
  return sameNumber(existing.price_to,candidate.price_to)
    && sameNumber(existing.living_space,candidate.living_space)
    && sameNumber(existing.number_of_rooms,candidate.number_of_rooms);
}

export function publicCriteria(criteria={}){
  return {
    type:cleanText(criteria.type).slice(0,80),
    subtype:cleanText(criteria.subtype).slice(0,80),
    city:cleanText(criteria.city).slice(0,120),
    price:positive(criteria.price),
    minArea:positive(criteria.minArea),
    rooms:positive(criteria.rooms)
  };
}

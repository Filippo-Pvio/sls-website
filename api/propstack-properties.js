import {propertyCard,queryProperties,cachedCatalog} from '../lib/property-catalog.mjs';
import {similarProperties} from '../assets/property-similarity.mjs';
import {publicUnit} from '../lib/propstack-preview.mjs';
import {publicPropertyFacts,publicPropertySourceFields} from '../lib/public-property-facts.mjs';

const LIST_PAGE_SIZE=9;
const PUBLIC_STATUS_NAME='vermarktung';

async function read(path,key){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(`https://api.propstack.de/v1/${path}`,{
      headers:{'X-API-KEY':key},
      signal:controller.signal
    });
    if(!response.ok)throw new Error(`Propstack returned ${response.status}`);
    return await response.json();
  }finally{clearTimeout(timer);}
}

async function readMaybe(path,key){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(`https://api.propstack.de/v1/${path}`,{
      headers:{'X-API-KEY':key},
      signal:controller.signal
    });
    if(response.status===404)return null;
    if(!response.ok)throw new Error(`Propstack returned ${response.status}`);
    return await response.json();
  }finally{clearTimeout(timer);}
}

async function unavailableResponse(id,key,res){
  const raw=await readMaybe(`units/${encodeURIComponent(id)}?new=1`,key);
  if(!raw||String(raw.id)!==String(id))return res.status(404).json({error:'Objekt nicht gefunden',code:'PROPERTY_NOT_FOUND'});
  return res.status(410).json({
    error:'Dieses Objekt ist nicht mehr verfügbar.',
    code:'PROPERTY_UNAVAILABLE'
  });
}

const normalise=value=>String(value||'').trim().toLocaleLowerCase('de-DE');

async function resolvePublicStatus(key){
  const result=await read('property_statuses',key);
  const statuses=Array.isArray(result.data)?result.data:Array.isArray(result)?result:[];
  const matches=statuses.filter(status=>
    normalise(status?.name)===PUBLIC_STATUS_NAME &&
    status?.nonpublic!==true
  );
  if(matches.length!==1)throw new Error('Aktiver Vermarktungsstatus in Propstack nicht eindeutig gefunden');
  return matches[0];
}

function isPublished(unit){
  return Boolean(
    unit &&
    /^\d+$/.test(String(unit.id||'')) &&
    unit.archived!==true &&
    unit.marketing_type==='BUY' &&
    unit.status?.nonpublic!==true
  );
}

async function listingById(id,key,statusId){
  const query=new URLSearchParams({
    with_meta:'1',
    expand:'1',
    property_ids:String(id),
    status:String(statusId),
    marketing_type:'BUY',
    archived:'-1',
    per:'100'
  });
  const result=await read(`units?${query}`,key);
  return (Array.isArray(result.data)?result.data:[]).find(unit=>
    String(unit.id)===String(id) && isPublished(unit)
  )||null;
}

async function pageListings(key,statusId,page,per,sort){
  const sortMap={
    'default':['updated_at','desc'],
    'newest':['updated_at','desc'],
    'price-asc':['price','asc'],
    'price-desc':['price','desc'],
    'area-desc':['living_space','desc']
  };
  const [sortBy,order]=sortMap[sort]||sortMap.default;
  const query=new URLSearchParams({
    with_meta:'1',
    expand:'1',
    status:String(statusId),
    marketing_type:'BUY',
    archived:'-1',
    per:String(per),
    page:String(page),
    sort_by:sortBy,
    order
  });
  const result=await read(`units?${query}`,key);
  const rows=Array.isArray(result.data)?result.data:[];
  const items=rows.filter(isPublished).map(publicUnit).map(propertyCard);
  const metaTotal=Number(result.meta?.total_count);
  const total=Number.isFinite(metaTotal)?metaTotal:((page-1)*per+rows.length+(rows.length===per?1:0));
  return {
    items,
    total,
    page,
    per,
    hasMore:page*per<total && rows.length>0
  };
}

const getCatalog=cachedCatalog(async(key,statusId)=>{
  const items=[];
  for(let page=1;page<=50;page++){
    const result=await pageListings(key,statusId,page,100,'default');
    items.push(...result.items);
    if(!result.hasMore)return [...new Map(items.map(p=>[String(p.id),p])).values()];
  }
  throw new Error('Public catalog exceeds safety limit');
});

function mergeDetail(summary,detail){
  const combined={...summary,...detail,status:summary.status,images:detail.images?.length?detail.images:summary.images};
  combined.broker={...(summary.broker||{}),...(detail.broker||{})};
  const unwrap=value=>value&&typeof value==='object'&&'value' in value?value.value:value;
  for(const field of new Set([
    'price','object_price','living_space','property_space_value','number_of_rooms',
    'number_of_bed_rooms','number_of_bath_rooms','plot_area','construction_year',
    'rs_type','city','zip_code',...publicPropertySourceFields
  ])){
    const detailValue=unwrap(combined[field]);
    const summaryValue=unwrap(summary[field]);
    if((detailValue==null||detailValue==='')&&summaryValue!=null&&summaryValue!=='')combined[field]=summary[field];
  }
  return combined;
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET')return res.status(405).json({error:'Methode nicht erlaubt'});

  const key=process.env.PROPSTACK_API_KEY;
  if(!key)return res.status(503).json({error:'Propstack ist noch nicht verbunden.'});

  try{
    const status=await resolvePublicStatus(key);
    const id=req.query.id;
    if(req.query.summary){
      const summary=String(req.query.summary);
      if(!/^\d+$/.test(summary))return res.status(404).json({error:'Objekt nicht gefunden'});
      const row=await listingById(summary,key,status.id);
      if(!row)return unavailableResponse(summary,key,res);
      res.setHeader('Cache-Control','public, s-maxage=60');
      return res.status(200).json({items:[propertyCard(publicUnit(row))]});
    }


    if(id){
      if(!/^\d+$/.test(String(id)))return res.status(404).json({error:'Objekt nicht gefunden'});
      const summary=await listingById(id,key,status.id);
      if(!summary)return unavailableResponse(id,key,res);

      const detail=await read(`units/${encodeURIComponent(id)}?new=1`,key);
      if(String(detail?.id)!==String(id)||detail.archived===true||
        (detail.marketing_type&&detail.marketing_type!=='BUY')||
        (detail.status?.id&&String(detail.status.id)!==String(status.id))||
        detail.status?.nonpublic===true){
        return res.status(404).json({error:'Objekt nicht veröffentlicht'});
      }

      const combined=mergeDetail(summary,detail);
      const brokerId=detail.broker_id||summary.broker_id||combined.broker?.id;
      if(brokerId&&(!combined.broker?.phone||!combined.broker?.email)){
        try{
          const brokers=await read('brokers',key);
          const all=Array.isArray(brokers)?brokers:(brokers.data||[]);
          const full=all.find(b=>String(b.id)===String(brokerId));
          if(full)combined.broker={...full,...Object.fromEntries(Object.entries(combined.broker||{}).filter(([,value])=>value))};
        }catch(error){
          console.warn('Propstack broker details unavailable:',error.message);
        }
      }

      const publicListing=publicUnit(summary);
      const publicDetail=publicUnit(combined);
      for(const field of ['price','area','rooms','city','zip']){
        if(publicListing[field]!=null&&publicListing[field]!=='')publicDetail[field]=publicListing[field];
      }
      if(publicListing.type!=='Immobilie')publicDetail.type=publicListing.type;
      for(const field of ['bedrooms','baths','year']){
        if(publicDetail[field]==null)publicDetail[field]=publicListing[field];
      }
      publicDetail.objectFacts=publicPropertyFacts(combined,publicDetail);
      publicDetail.inquiryEnabled=process.env.VERCEL_ENV==='preview'&&Boolean(process.env.PROPSTACK_API_KEY);
      publicDetail.inquiryTestMode=publicDetail.inquiryEnabled;

      return res.status(200).json({items:[publicDetail]});
    }

    const page=Math.max(1,Number.parseInt(req.query.page||'1',10)||1);
    const requestedPer=Number.parseInt(req.query.per||String(LIST_PAGE_SIZE),10)||LIST_PAGE_SIZE;
    const per=Math.min(LIST_PAGE_SIZE,Math.max(1,requestedPer));
    const sort=String(req.query.sort||'default');
    let result;
    const needsCatalog=req.query.map==='1'||req.query.similarTo||['query','city','type','price','area','rooms'].some(k=>Boolean(req.query[k]));
    if(needsCatalog){
      const catalog=await getCatalog(key,status.id);
      if(req.query.similarTo){
        const current=catalog.find(p=>String(p.id)===String(req.query.similarTo));
        result={items:current?similarProperties(current,catalog):[]};
      }else{
        const found=queryProperties(catalog,req.query);
        result=req.query.map==='1'
          ?{items:found.map(({id,zip,city,price})=>({id,zip,city,price})),total:found.length}
          :{items:found.slice((page-1)*per,page*per),total:found.length,page,per,hasMore:page*per<found.length};
      }
    }else result=await pageListings(key,status.id,page,per,sort);
    res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(result);
  }catch(error){
    console.error('Propstack property feed failed:',error.message);
    return res.status(502).json({error:'Propstack-Objekte sind momentan nicht abrufbar.'});
  }
}

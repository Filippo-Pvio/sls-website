const API_BASE='https://api.propstack.de/v1/';
const PAGE_SIZE=100;
async function ps(path,key){
  const r=await fetch(new URL(path,API_BASE),{headers:{'X-API-KEY':key},signal:AbortSignal.timeout(8000)});
  if(!r.ok) throw new Error('Propstack HTTP '+r.status);
  return r.json();
}
function norm(v){return String(v||'').trim().toLocaleLowerCase('de-DE');}
function safeImage(images){
  return (Array.isArray(images)?images:[]).some(item=>{
    if(item?.is_private!==false||item?.is_floorplan===true) return false;
    const value=item.medium_url||item.medium||item.big_url||item.big||item.url;
    try { const u=new URL(value); return u.protocol==='https:'; } catch { return false; }
  });
}
function publicExpose(unit){
  try { const u=new URL(unit.public_expose_url); return u.protocol==='https:'&&u.hostname==='crm.propstack.de'&&u.pathname.startsWith('/public/exposee/'); }
  catch { return false; }
}
function eligible(unit){
  const title=String(unit.title?.value??unit.title??'').trim();
  const city=String(unit.city??'').trim();
  const price=Number(unit.price?.value??unit.price);
  return unit.marketing_type==='BUY'&&unit.archived!==true&&safeImage(unit.images)&&publicExpose(unit)&&title&&city&&Number.isFinite(price)&&price>0;
}
async function allUnits(key,statusId,marketingType){
  const units=[]; let totalCount=null;
  for(let page=1;page<=40;page++){
    const q=new URLSearchParams({with_meta:'1',expand:'1',status:String(statusId),archived:'-1',per:String(PAGE_SIZE),page:String(page)});
    if(marketingType) q.set('marketing_type',marketingType);
    const r=await ps('units?'+q,key);
    if(!Array.isArray(r.data)) throw new Error('Unexpected Propstack format');
    if(totalCount===null && Number.isFinite(Number(r.meta?.total_count))) totalCount=Number(r.meta.total_count);
    units.push(...r.data);
    if(r.data.length===0 || r.data.length<PAGE_SIZE || (totalCount!==null && units.length>=totalCount)) break;
  }
  return {units,totalCount};
}
export default async function handler(req,res){
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Cache-Control','no-store');
  const key=process.env.PROPSTACK_API_KEY;
  if(!key) return res.status(503).json({error:'missing key'});
  try{
    const s=await ps('property_statuses',key);
    const statuses=Array.isArray(s.data)?s.data:Array.isArray(s)?s:[];
    const status=statuses.find(x=>norm(x?.name)==='vermarktung');
    if(!status) return res.status(404).json({error:'status not found'});
    const [all,buy,rent]=await Promise.all([
      allUnits(key,status.id,null),
      allUnits(key,status.id,'BUY'),
      allUnits(key,status.id,'RENT')
    ]);
    const eligibleBuy=buy.units.filter(eligible);
    return res.status(200).json({
      status:{id:status.id,name:status.name},
      counts:{
        allNonArchived: all.totalCount ?? all.units.length,
        buyNonArchived: buy.totalCount ?? buy.units.length,
        rentNonArchived: rent.totalCount ?? rent.units.length,
        homepageEligibleBuy: eligibleBuy.length
      },
      diagnostics:{
        loadedAll:all.units.length,
        loadedBuy:buy.units.length,
        loadedRent:rent.units.length,
        buyWithPublicImage:buy.units.filter(u=>safeImage(u.images)).length,
        buyWithPublicExpose:buy.units.filter(publicExpose).length,
        buyWithPositivePrice:buy.units.filter(u=>Number(u.price?.value??u.price)>0).length,
        buyWithTitleAndCity:buy.units.filter(u=>String(u.title?.value??u.title??'').trim()&&String(u.city??'').trim()).length
      }
    });
  }catch(e){console.error('Propstack count diagnostic failed:',e);return res.status(503).json({error:'diagnostic failed'});}
}

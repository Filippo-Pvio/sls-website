const API_BASE='https://api.propstack.de/v1/';
const PAGE_SIZE=100;
const MAX_PAGES=8;
const MARKET_NAMES=new Set(['kontaktprozess','entscheidungsprozess','maklervertrag unterschrieben','vermarktung','verkauft','erfolgreich vermarktet']);

async function propstack(path,key){
  const response=await fetch(new URL(path,API_BASE),{headers:{'X-API-KEY':key},signal:AbortSignal.timeout(12000)});
  if(!response.ok) throw new Error('Propstack HTTP '+response.status);
  return response.json();
}
function norm(v){return String(v||'').trim().toLocaleLowerCase('de-DE');}
function num(v){const n=Number(v?.value??v);return Number.isFinite(n)&&n>0?n:null;}
function pctl(a,p){if(!a.length)return null;const i=(a.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return a[l]+(a[h]-a[l])*(i-l);}
function r50(v){return v==null?null:Math.round(v/50)*50;}
function objType(u){return u.rs_type==='HOUSE'?'haus':u.rs_type==='APARTMENT'?'wohnung':null;}
function validPsm(v){return Number.isFinite(v)&&v>=250&&v<=20000;}
function summary(values){
  const v=[...values].sort((a,b)=>a-b),n=v.length;
  return {count:n,low:n>=5?r50(pctl(v,.25)):null,typical:n>=5?r50(pctl(v,.5)):null,high:n>=5?r50(pctl(v,.75)):null};
}

export default async function handler(req,res){
  res.setHeader('X-Robots-Tag','noindex,nofollow');
  res.setHeader('Cache-Control','private,no-store');
  if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
  const key=process.env.PROPSTACK_PUBLIC_API_KEY||process.env.PROPSTACK_API_KEY;
  if(!key) return res.status(503).json({error:'propstack_not_connected'});

  try{
    const zip=String(req.query.zip||'').trim();
    const cityFilter=String(req.query.city||'').trim();
    const typeFilter=String(req.query.type||'').trim().toLowerCase();
    const statusPayload=await propstack('property_statuses',key);
    const allStatuses=Array.isArray(statusPayload.data)?statusPayload.data:Array.isArray(statusPayload)?statusPayload:[];
    if(req.query.statuses==='1'){
      return res.status(200).json({statuses:allStatuses.map(s=>String(s?.name||'').trim()).filter(Boolean).sort((a,b)=>a.localeCompare(b,'de'))});
    }
    const statuses=allStatuses.filter(s=>MARKET_NAMES.has(norm(s?.name)));

    const areas=new Map();
    const statusCounts=[];

    for(const status of statuses){
      let count=0;
      for(let page=1;page<=MAX_PAGES;page++){
        const q=new URLSearchParams({
          with_meta:'1',expand:'1',status:String(status.id),marketing_type:'BUY',
          archived:'-1',per:String(PAGE_SIZE),page:String(page)
        });
        if(typeFilter==='haus') q.set('rs_type','HOUSE');
        if(typeFilter==='wohnung') q.set('rs_type','APARTMENT');
        if(zip) q.set('q',zip);
        else if(cityFilter) q.set('q',cityFilter);
        const payload=await propstack('units?'+q,key);
        const rows=Array.isArray(payload.data)?payload.data:[];
        count+=rows.length;

        for(const unit of rows){
          const type=objType(unit);
          const unitZip=String(unit.zip_code||'').trim();
          const city=String(unit.city||'').trim();
          const living=num(unit.living_space);
          const asking=num(unit.price);
          const sold=num(unit.sold_price);
          const soldStatus=['verkauft','erfolgreich vermarktet'].includes(norm(status.name));
          if(!type||!/^\d{5}$/.test(unitZip)||!city||!living) continue;
          if(zip&&unitZip!==zip) continue;
          if(cityFilter&&city.toLocaleLowerCase('de-DE')!==cityFilter.toLocaleLowerCase('de-DE')) continue;
          if(typeFilter&&type!==typeFilter) continue;

          const askingPsm=asking/living;
          const soldPsm=sold/living;
          const k=unitZip+'|'+type;
          if(!areas.has(k)) areas.set(k,{zipCode:unitZip,city,type,asking:[],sold:[],soldAskingFallback:[],stages:{}});
          const area=areas.get(k);
          if(validPsm(askingPsm)) area.asking.push(askingPsm);
          if(soldStatus&&validPsm(soldPsm)) area.sold.push(soldPsm);
          if(soldStatus&&!validPsm(soldPsm)&&validPsm(askingPsm)) area.soldAskingFallback.push(askingPsm);
          if(validPsm(askingPsm)||validPsm(soldPsm)){
            const stage=String(status.name||'');
            area.stages[stage]=(area.stages[stage]||0)+1;
          }
        }

        const total=Number(payload.meta?.total_count);
        if(rows.length<PAGE_SIZE||(Number.isFinite(total)&&page*PAGE_SIZE>=total)) break;
      }
      statusCounts.push({name:String(status.name||''),count});
    }

    const result=[...areas.values()].map(a=>{
      const asking=summary(a.asking),sold=summary(a.sold);
      const usable=Math.max(asking.count,sold.count);
      return {
        zipCode:a.zipCode,city:a.city,type:a.type,
        asking,sold,soldWithoutRealizedPrice:a.soldAskingFallback.length,
        stages:a.stages,
        confidence:usable>=30?'high':usable>=12?'medium':usable>=5?'low':'insufficient'
      };
    }).sort((a,b)=>Math.max(b.asking.count,b.sold.count)-Math.max(a.asking.count,a.sold.count));

    return res.status(200).json({
      generatedAt:new Date().toISOString(),
      query:{zip:zip||null,city:cityFilter||null,type:typeFilter||null},
      statuses:statusCounts,
      areas:result,
      methodology:'asking and realized sold prices are kept separate; distributions are suppressed below 5 usable records'
    });
  }catch(error){
    console.error('Propstack market data unavailable:',error);
    return res.status(503).json({error:'market_data_unavailable'});
  }
}

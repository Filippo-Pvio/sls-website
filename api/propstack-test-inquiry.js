const text=(value,max=150)=>typeof value==='string'?value.trim().slice(0,max):'';
const normalise=value=>String(value||'').trim().toLocaleLowerCase('de-DE');
const html=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

async function propstack(path,key,options={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(`https://api.propstack.de/v1/${path}`,{
      ...options,
      headers:{'X-API-KEY':key,...options.headers},
      signal:controller.signal
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(`Propstack ${path} returned ${response.status}`);
    return data;
  }finally{clearTimeout(timer)}
}

function isPreviewRequest(req){
  const host=String(req.headers?.['x-forwarded-host']||req.headers?.host||'').toLowerCase();
  return host.endsWith('.vercel.app')||host.includes('localhost');
}

async function publicStatusId(key){
  const result=await propstack('property_statuses',key);
  const statuses=Array.isArray(result.data)?result.data:Array.isArray(result)?result:[];
  const matches=statuses.filter(s=>normalise(s?.name)==='vermarktung'&&s?.nonpublic!==true);
  if(matches.length!==1)throw new Error('Vermarktungsstatus nicht eindeutig');
  return String(matches[0].id);
}

async function publicUnit(id,key,statusId){
  const q=new URLSearchParams({
    with_meta:'1',
    expand:'1',
    property_ids:id,
    status:statusId,
    marketing_type:'BUY',
    archived:'-1',
    per:'100'
  });
  const result=await propstack(`units?${q}`,key);
  return (Array.isArray(result.data)?result.data:[]).find(u=>
    String(u?.id)===id&&
    u?.archived!==true&&
    u?.marketing_type==='BUY'&&
    u?.status?.nonpublic!==true
  )||null;
}

async function resolveInquirySource(key){
  const configured=Number(process.env.PROPSTACK_INQUIRY_SOURCE_ID);
  if(Number.isSafeInteger(configured)&&configured>0)return configured;

  const preferred=['sls website','sls.de','website sls'];
  for(const endpoint of ['client_sources','contact_sources','sources']){
    try{
      const result=await propstack(endpoint,key);
      const sources=Array.isArray(result)?result:Array.isArray(result.data)?result.data:[];
      const found=sources.find(source=>preferred.includes(normalise(source?.name)));
      if(found&&Number.isSafeInteger(Number(found.id)))return Number(found.id);
    }catch(error){
      console.warn(`Propstack source lookup via ${endpoint} unavailable:`,error.message);
    }
  }
  return null;
}


async function dealsForContactAndProperty(key,clientId,propertyId){
  const q=new URLSearchParams({
    client_id:String(clientId),
    property_id:String(propertyId),
    include:'client,property',
    per:'100',
    order:'desc'
  });
  const result=await propstack(`client_properties?${q}`,key);
  return Array.isArray(result.data)?result.data:Array.isArray(result)?result:[];
}

async function waitForDeal(key,clientId,propertyId,attempts=4){
  for(let attempt=0;attempt<attempts;attempt++){
    const deals=await dealsForContactAndProperty(key,clientId,propertyId);
    if(deals.length)return deals[0];
    if(attempt<attempts-1)await new Promise(resolve=>setTimeout(resolve,1200));
  }
  return null;
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='POST')return res.status(405).json({error:'Methode nicht erlaubt'});
  if(!isPreviewRequest(req))return res.status(403).json({error:'Testanfragen sind nur im geschützten Preview möglich.'});
  if(!req.headers?.['content-type']?.startsWith('application/json')||Number(req.headers?.['content-length']||0)>5000)
    return res.status(400).json({error:'Ungültige Anfrage.'});

  const readKey=process.env.PROPSTACK_API_KEY;
  const writeKey=process.env.PROPSTACK_INQUIRY_API_KEY||readKey;
  if(!readKey||!writeKey)return res.status(503).json({error:'Propstack-Anfragezugang ist noch nicht verfügbar.'});

  const body=req.body||{};
  if(body.testMode!==true)return res.status(400).json({error:'Testmodus fehlt.'});

  const id=String(body.propertyId||'');
  const firstName=text(body.firstName,100);
  const lastName=text(body.lastName,100);
  const email=text(body.email,254);
  const phone=text(body.phone,60);
  if(!/^\d+$/.test(id)||!firstName||!lastName||!/^\S+@\S+\.\S+$/.test(email)||!phone||body.privacy!==true)
    return res.status(400).json({error:'Bitte alle Pflichtfelder und die Datenschutzeinwilligung prüfen.'});

  try{
    const statusId=await publicStatusId(readKey);
    const unit=await publicUnit(id,readKey,statusId);
    if(!unit)return res.status(404).json({error:'Objekt nicht verfügbar.'});

    const sourceId=await resolveInquirySource(readKey);
    if(!sourceId){
      return res.status(503).json({
        error:'In Propstack fehlt noch die Kontaktquelle „SLS Website“ bzw. deren API-ID. Es wurde noch keine Portalanfrage ausgelöst.',
        code:'SOURCE_MISSING'
      });
    }

    const reference=String(unit.unit_id?.value??unit.unit_id??'').trim();
    const client=await propstack('contacts',writeKey,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({client:{
        first_name:firstName,
        last_name:lastName,
        email,
        phone
      }})
    });

    const contactId=Number(client.id);
    if(!Number.isSafeInteger(contactId)||contactId<=0)throw new Error('Propstack contact response missing ID');

    const verified=await propstack(`contacts/${contactId}`,writeKey);
    if(Number(verified?.id)!==contactId)throw new Error('Propstack contact verification failed');

    const existingDeals=await dealsForContactAndProperty(readKey,contactId,Number(id));
    const hadDealBefore=existingDeals.length>0;

    const inquiryPayload={
      task:{
        title:'Anfrage über die SLS Website',
        client_source_id:sourceId,
        client_ids:[contactId],
        property_ids:[Number(id)],
        broker_id:unit.broker_id||unit.broker?.id||undefined,
        body:[
          '<strong>Website-Anfrage über sls.de</strong>',
          `Objekt: ${html(reference||id)}`,
          `Name: ${html(firstName)} ${html(lastName)}`,
          `E-Mail: ${html(email)}`,
          `Telefon: ${html(phone)}`
        ].join('<br>')
      }
    };

    const inquiry=await propstack('tasks',writeKey,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(inquiryPayload)
    });

    const inquiryId=Number(inquiry?.id||inquiry?.activity_id);
    const deal=hadDealBefore?existingDeals[0]:await waitForDeal(readKey,contactId,Number(id));
    return res.status(200).json({
      ok:true,
      portalInquiryTriggered:true,
      contactId,
      inquiryId:Number.isSafeInteger(inquiryId)&&inquiryId>0?inquiryId:null,
      sourceId,
      reference:reference||null,
      hadDealBefore,
      dealDetected:Boolean(deal),
      dealId:deal?.id||null,
      dealStageId:deal?.deal_stage_id||deal?.deal_stage?.id||null
    });
  }catch(error){
    console.error('Propstack website inquiry failed:',error.message);
    return res.status(502).json({error:'Die Website-Anfrage konnte nicht vollständig an Propstack übergeben werden.'});
  }
}

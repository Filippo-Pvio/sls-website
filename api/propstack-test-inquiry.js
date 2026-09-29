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



function samePerson(contact,firstName,lastName){
  return normalise(contact?.first_name)===normalise(firstName)&&
    normalise(contact?.last_name)===normalise(lastName);
}

async function contactsByEmail(key,email){
  const q=new URLSearchParams({email,archived:'-1',with_meta:'1',per:'100'});
  const result=await propstack(`contacts?${q}`,key);
  return Array.isArray(result.data)?result.data:Array.isArray(result)?result:[];
}

async function resolveContactForInquiry(key,{firstName,lastName,email,phone}){
  const matches=await contactsByEmail(key,email);
  if(matches.length){
    const exact=matches.find(contact=>samePerson(contact,firstName,lastName));
    if(exact){
      const id=Number(exact.id);
      if(Number.isSafeInteger(id)&&id>0)return {contactId:id,reused:true};
    }
    return {
      conflict:true,
      existingContactIds:matches
        .map(contact=>Number(contact.id))
        .filter(id=>Number.isSafeInteger(id)&&id>0)
        .slice(0,10)
    };
  }

  const client=await propstack('contacts',key,{
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
  return {contactId,reused:false};
}


async function resolveWebsiteInquiryNoteType(key){
  const configured=Number(process.env.PROPSTACK_WEBSITE_INQUIRY_NOTE_TYPE_ID);
  if(Number.isSafeInteger(configured)&&configured>0)return configured;

  // Preview fallback: verified in Propstack UI for the dedicated
  // "SLS Website Anfrage" note category. Production should use the env var.
  if(process.env.VERCEL_ENV==='preview')return 739127;

  for(const endpoint of ['activity_types','note_types']){
    try{
      const result=await propstack(endpoint,key);
      const types=Array.isArray(result.data)?result.data:Array.isArray(result)?result:[];
      const found=types.find(type=>normalise(type?.name)==='sls website anfrage');
      const id=Number(found?.id);
      if(Number.isSafeInteger(id)&&id>0)return id;
    }catch(error){
      console.warn(`Propstack note type lookup via ${endpoint} unavailable:`,error.message);
    }
  }
  return null;
}


async function resolveBuyerDealStage(key){
  const configured=Number(process.env.PROPSTACK_BUYER_DEAL_STAGE_ID);
  if(Number.isSafeInteger(configured)&&configured>0)return configured;

  const result=await propstack('deal_pipelines',key);
  const pipelines=Array.isArray(result.data)?result.data:Array.isArray(result)?result:[];
  const preferred=pipelines.find(p=>normalise(p?.name)==='05_verkaufsprozess käufer')||null;
  const searchIn=preferred?[preferred]:pipelines;
  const matches=[];
  for(const pipeline of searchIn){
    for(const stage of Array.isArray(pipeline?.deal_stages)?pipeline.deal_stages:[]){
      if(normalise(stage?.name)==='neuer kaufinteressent')matches.push(stage);
    }
  }
  if(matches.length!==1)throw new Error('Deal-Phase Neuer Kaufinteressent nicht eindeutig');
  const id=Number(matches[0].id);
  if(!Number.isSafeInteger(id)||id<=0)throw new Error('Ungültige Deal-Phase');
  return id;
}

async function createWebsiteDeal(key,{clientId,propertyId,dealStageId,sourceId,brokerId}){
  const client_property={
    client_id:Number(clientId),
    property_id:Number(propertyId),
    deal_stage_id:Number(dealStageId),
    client_source_id:Number(sourceId)
  };
  if(Number.isSafeInteger(Number(brokerId))&&Number(brokerId)>0)client_property.broker_id=Number(brokerId);
  const created=await propstack('client_properties',key,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({client_property})
  });
  const deal=created?.client_property||created;
  const dealId=Number(deal?.id);
  if(!Number.isSafeInteger(dealId)||dealId<=0)throw new Error('Propstack deal response missing ID');
  return deal;
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

    const noteTypeId=await resolveWebsiteInquiryNoteType(readKey);
    if(!noteTypeId){
      return res.status(503).json({
        error:'Die Propstack-Notiz-Kategorie „SLS Website Anfrage“ konnte mit den aktuellen API-Rechten nicht automatisch gelesen werden. Es wurde keine Anfrage ausgelöst.',
        code:'SLS_NOTE_TYPE_MISSING'
      });
    }

    const reference=String(unit.unit_id?.value??unit.unit_id??'').trim();
    const contactResolution=await resolveContactForInquiry(writeKey,{firstName,lastName,email,phone});
    if(contactResolution.conflict){
      return res.status(409).json({
        error:'Diese E-Mail-Adresse ist in Propstack bereits einem anderen Kontakt zugeordnet. Propstack erlaubt für zwei eigenständige Kontakte keine identische E-Mail-Adresse. Die vorhandenen Kontaktdaten wurden nicht verändert und es wurde keine Anfrage ausgelöst. Bitte für diese Person eine andere E-Mail-Adresse verwenden.',
        code:'CONTACT_IDENTITY_CONFLICT'
      });
    }

    const contactId=contactResolution.contactId;
    const verified=await propstack(`contacts/${contactId}`,writeKey);
    if(Number(verified?.id)!==contactId)throw new Error('Propstack contact verification failed');

    let existingDeals=[];
    let dealCheckAvailable=true;
    try{
      existingDeals=await dealsForContactAndProperty(readKey,contactId,Number(id));
    }catch(error){
      dealCheckAvailable=false;
      console.warn('Propstack deal pre-check unavailable:',error.message);
    }
    const hadDealBefore=existingDeals.length>0;

    const inquiryPayload={
      task:{
        title:'Anfrage über die SLS Website',
        note_type_id:noteTypeId,
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

    const inquiryId=Number(inquiry?.activity_id||inquiry?.id);

    let deal=hadDealBefore?existingDeals[0]:null;
    let dealCreated=false;
    let dealStageId=deal?.deal_stage_id||deal?.deal_stage?.id||null;

    if(!hadDealBefore){
      const buyerDealStageId=await resolveBuyerDealStage(readKey);
      deal=await createWebsiteDeal(writeKey,{
        clientId:contactId,
        propertyId:Number(id),
        dealStageId:buyerDealStageId,
        sourceId,
        brokerId:unit.broker_id||unit.broker?.id
      });
      dealCreated=true;
      dealStageId=deal?.deal_stage_id||deal?.deal_stage?.id||buyerDealStageId;
    }

    let activityVerified=false;
    let activitySourceId=null;
    let activityType=null;
    if(Number.isSafeInteger(inquiryId)&&inquiryId>0){
      try{
        const activity=await propstack(`activities/${inquiryId}`,readKey);
        activitySourceId=Number(activity?.source_id||activity?.client_source_id||activity?.task?.client_source_id)||null;
        activityType=activity?.activatable_type||activity?.type||activity?.task?.activatable_type||null;
        activityVerified=activitySourceId===sourceId;
      }catch(error){
        console.warn('Propstack activity verification unavailable:',error.message);
      }
    }

    if(!deal&&dealCheckAvailable){
      try{
        deal=await waitForDeal(readKey,contactId,Number(id));
        dealStageId=deal?.deal_stage_id||deal?.deal_stage?.id||dealStageId;
      }catch(error){
        dealCheckAvailable=false;
        console.warn('Propstack deal post-check unavailable:',error.message);
      }
    }
    return res.status(200).json({
      ok:true,
      portalInquiryTriggered:true,
      contactId,
      inquiryId:Number.isSafeInteger(inquiryId)&&inquiryId>0?inquiryId:null,
      sourceId,
      noteTypeId,
      activityVerified,
      activitySourceId,
      activityType,
      reference:reference||null,
      contactReused:contactResolution.reused===true,
      hadDealBefore,
      dealCreated,
      dealCheckAvailable,
      dealDetected:Boolean(deal),
      dealId:deal?.id||null,
      dealStageId
    });
  }catch(error){
    console.error('Propstack website inquiry failed:',error.message);
    return res.status(502).json({error:'Die Website-Anfrage konnte nicht vollständig an Propstack übergeben werden.'});
  }
}

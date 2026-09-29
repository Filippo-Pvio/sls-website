import {buildSavedQuery,publicCriteria,sameSavedQuery} from '../lib/search-profile.mjs';

const text=(value,max=150)=>typeof value==='string'?value.trim().slice(0,max):'';
const normalise=value=>String(value||'').trim().toLocaleLowerCase('de-DE');

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

function isAllowedHost(req){
  const host=String(req.headers?.['x-forwarded-host']||req.headers?.host||'').toLowerCase().split(':')[0];
  return host==='sls.de'||host==='www.sls.de'||host.endsWith('.vercel.app')||host==='localhost';
}

function samePerson(contact,firstName,lastName){
  return normalise(contact?.first_name)===normalise(firstName)&&normalise(contact?.last_name)===normalise(lastName);
}

async function contactsByEmail(key,email){
  const q=new URLSearchParams({email,archived:'-1',with_meta:'1',per:'100'});
  const result=await propstack(`contacts?${q}`,key);
  return Array.isArray(result.data)?result.data:Array.isArray(result)?result:[];
}

async function resolveContact(key,{firstName,lastName,email,phone}){
  const matches=await contactsByEmail(key,email);
  if(matches.length){
    const exact=matches.find(contact=>samePerson(contact,firstName,lastName));
    if(exact){
      const id=Number(exact.id);
      if(Number.isSafeInteger(id)&&id>0)return {contactId:id,reused:true};
    }
    return {conflict:true};
  }
  const result=await propstack('contacts',key,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({client:{first_name:firstName,last_name:lastName,email,phone}})
  });
  const contactId=Number(result.id);
  if(!Number.isSafeInteger(contactId)||contactId<=0)throw new Error('Propstack contact response missing ID');
  return {contactId,reused:false};
}

async function existingProfiles(key,contactId){
  const q=new URLSearchParams({client_id:String(contactId),per:'100'});
  const result=await propstack(`saved_queries?${q}`,key);
  return Array.isArray(result.data)?result.data:Array.isArray(result)?result:[];
}

async function createSearchProfile(key,savedQuery){
  const result=await propstack('saved_queries',key,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({saved_query:savedQuery})
  });
  const id=Number(result?.id||result?.saved_query?.id);
  if(!Number.isSafeInteger(id)||id<=0)throw new Error('Propstack search profile response missing ID');
  return id;
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='POST')return res.status(405).json({error:'Methode nicht erlaubt'});
  if(!isAllowedHost(req))return res.status(403).json({error:'Anfrage nicht erlaubt.'});
  if(!req.headers?.['content-type']?.startsWith('application/json')||Number(req.headers?.['content-length']||0)>6000)
    return res.status(400).json({error:'Ungültige Anfrage.'});

  const key=process.env.PROPSTACK_SEARCH_PROFILE_API_KEY||process.env.PROPSTACK_INQUIRY_API_KEY||process.env.PROPSTACK_API_KEY;
  if(!key)return res.status(503).json({error:'Der Suchauftrag kann derzeit nicht gespeichert werden.'});

  const body=req.body||{};
  const firstName=text(body.firstName,100);
  const lastName=text(body.lastName,100);
  const email=text(body.email,254);
  const phone=text(body.phone,60);
  const criteria=publicCriteria(body.criteria||{});
  const hasCriteria=Boolean(criteria.type||criteria.city||criteria.price||criteria.minArea||criteria.rooms);
  if(!firstName||!lastName||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!phone||body.privacy!==true||!hasCriteria)
    return res.status(400).json({error:'Bitte Suchkriterien, Pflichtfelder und Datenschutzeinwilligung prüfen.'});

  try{
    const contact=await resolveContact(key,{firstName,lastName,email,phone});
    if(contact.conflict)return res.status(409).json({error:'Zu dieser E-Mail-Adresse besteht bereits ein Kontakt mit abweichendem Namen. Bitte kontaktieren Sie uns kurz direkt.'});

    const candidate=buildSavedQuery(criteria,contact.contactId);
    const profiles=await existingProfiles(key,contact.contactId);
    const duplicate=profiles.find(profile=>sameSavedQuery(profile,candidate));
    if(duplicate){
      return res.status(200).json({ok:true,reusedContact:contact.reused,duplicate:true,profileId:Number(duplicate.id)||null});
    }

    const profileId=await createSearchProfile(key,candidate);
    return res.status(200).json({ok:true,reusedContact:contact.reused,duplicate:false,profileId});
  }catch(error){
    console.error('Propstack search profile failed:',error);
    return res.status(502).json({error:'Der Suchauftrag konnte gerade nicht gespeichert werden. Bitte versuchen Sie es später erneut.'});
  }
}

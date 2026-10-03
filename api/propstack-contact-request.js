import {createHmac, randomUUID, timingSafeEqual} from 'node:crypto';
import {CONTACT_TOPICS, CALLBACK_TITLE, parseContactRequest, contactNoteBody} from '../lib/contact-request.mjs';
const attempts = new Map(), pending = new Map(), uncertain = new Map();
const normalise = v => String(v || '').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de-DE');
const validId = id => Number.isSafeInteger(Number(id)) && Number(id)>0;
const rows = data => {if (Array.isArray(data)) return data; if (Array.isArray(data?.data)) return data.data; throw new Error('Unexpected list response');};
const sign = (value,key) => createHmac('sha256',key).update(`sls-contact:${value}`).digest('base64url');
function issueToken(key) {const value=`${Date.now()}.${randomUUID()}`; return `${value}.${sign(value,key)}`;}
function requestId(token,key) {
  if (typeof token!=='string' || token.length>150) return null;
  const [time,id,signature,extra]=token.split('.');
  if (extra || !/^\d{13}$/.test(time || '') || !/^[a-f\d-]{36}$/.test(id || '') || !signature) return null;
  const expected=Buffer.from(sign(`${time}.${id}`,key)),actual=Buffer.from(signature);
  if (expected.length!==actual.length || !timingSafeEqual(expected,actual)) return null;
  const age=Date.now()-Number(time); return age>=1000 && age<30*60*1000 ? id : null;
}
async function propstack(path,key,payload,method) {
  const r=await fetch(`https://api.propstack.de/v1/${path}`,{method:method || (payload?'POST':'GET'),headers:{'X-API-KEY':key,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(10000)});
  if(!r.ok) {const error=new Error(`Propstack ${payload?'POST':'GET'} ${path.split('?')[0].replace(/\/\d+/g,'/:id')} failed (${r.status})`);error.writeRejected=r.status>=400&&r.status<500;throw error;}
  return r.json();
}
async function noteCategories(key) {
  const types=[];
  for(let page=1;page<=20;page++){
    const result=await propstack(`activity_types?per=100&page=${page}`,key),items=rows(result);
    const fresh=items.filter(x=>!types.some(y=>String(y.id)===String(x.id)));types.push(...fresh);
    const total=Number(result?.meta?.total_count);
    if(!fresh.length || (Number.isFinite(total)&&total<=types.length) || (!Number.isFinite(total)&&items.length<100))break;
  }
  const titles=[...Object.values(CONTACT_TOPICS).map(x=>x.title),CALLBACK_TITLE],map={};
  for(const title of titles){const matches=types.filter(x=>x.name===title && ['note','for_notes'].includes(normalise(x.category)));if(matches.length===1&&validId(matches[0].id))map[title]=Number(matches[0].id);}
  return map;
}
async function record(key,request,id,categories) {
  const titles=[CONTACT_TOPICS[request.topic].title,...(request.method==='callback'?[CALLBACK_TITLE]:[])];
  if(titles.some(title=>!categories[title]))return {status:503,error:'Das Kontaktformular ist für diese Auswahl gerade nicht verfügbar. Bitte kontaktieren Sie uns telefonisch oder per E-Mail.'};
  const contacts=rows(await propstack(`contacts?${new URLSearchParams({email:request.email,archived:'-1',with_meta:'1',per:'100'})}`,key));
  let contactId;
  if(contacts.length){
    if(contacts.length!==1 || normalise(contacts[0].email)!==request.email || normalise(contacts[0].first_name)!==normalise(request.firstName) || normalise(contacts[0].last_name)!==normalise(request.lastName))return {status:409,error:'Ihre Angaben konnten nicht eindeutig zugeordnet werden. Bitte prüfen Sie Ihren Namen und Ihre E-Mail-Adresse oder kontaktieren Sie uns direkt.'};
    contactId=Number(contacts[0].id);
  } else {
    const contact=await propstack('contacts',key,{client:{first_name:request.firstName,last_name:request.lastName,email:request.email,...(request.salutation?{salutation:request.salutation}:{}),...(request.phone?{phone:request.phone}:{})}});contactId=Number(contact.id);
  }
  if(!validId(contactId))throw new Error('Contact confirmation missing');
  let verified=await propstack(`contacts/${contactId}`,key);
  if(Number(verified.id)!==contactId || normalise(verified.email)!==request.email || normalise(verified.first_name)!==normalise(request.firstName) || normalise(verified.last_name)!==normalise(request.lastName))throw new Error('Contact verification failed');
  if(request.salutation && verified.salutation!==request.salutation){
    await propstack(`contacts/${contactId}`,key,{client:{salutation:request.salutation}},'PUT');
    verified=await propstack(`contacts/${contactId}`,key);
    if(Number(verified.id)!==contactId || verified.salutation!==request.salutation)throw new Error('Salutation verification failed');
  }
  const activities=[];
  for(let page=1;page<=10;page++){
    const items=rows(await propstack(`activities?${new URLSearchParams({client_id:String(contactId),item_type:'note',expand:'1',order:'desc',per:'100',page:String(page)})}`,key));activities.push(...items);if(items.length<100)break;
  }
  const marker=`SLS-Kontaktanfrage-ID: ${id}`,body=contactNoteBody(request,id);
  for(const title of titles){
    const category=categories[title],writeKey=`${id}:${category}`;
    const exists=activities.some(x=>{const task=x.activatable || x.task || x;return Number(x.category_id ?? task.note_type_id)===category && String(task.body || x.body || '').includes(marker);});
    if(exists){uncertain.delete(writeKey);continue;}
    if(uncertain.has(writeKey))throw new Error('Unconfirmed note needs reconciliation');
    uncertain.set(writeKey,Date.now());
    let result;
    try{result=await propstack('tasks',key,{task:{title,note_type_id:category,client_ids:[contactId],body}});}
    catch(error){if(error.writeRejected)uncertain.delete(writeKey);throw error;}
    if(!validId(result?.id || result?.activity_id))throw new Error('Note confirmation missing');
    uncertain.delete(writeKey);
  }
  return {status:200,ok:true};
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Methode nicht erlaubt.'});}
  const host=String(req.headers?.host || '').toLowerCase();
  const local=process.env.NODE_ENV!=='production' && /^localhost(?::\d+)?$/.test(host);
  const allowed=['sls-website-eight.vercel.app','sls.de','www.sls.de'].includes(host) || (process.env.VERCEL_ENV==='preview'&&/^[a-z0-9-]+\.vercel\.app$/.test(host));
  if(!allowed&&!local)return res.status(403).json({error:'Anfrage nicht erlaubt.'});
  const key=process.env.PROPSTACK_CONTACT_API_KEY || process.env.PROPSTACK_INQUIRY_API_KEY || process.env.PROPSTACK_API_KEY;
  if(!key)return res.status(503).json({error:'Das Kontaktformular ist gerade nicht verfügbar. Bitte kontaktieren Sie uns direkt.'});
  if(req.method==='GET'){
    try {const categories=await noteCategories(key);return res.status(200).json({token:issueToken(key),availableTopics:Object.entries(CONTACT_TOPICS).filter(([,v])=>categories[v.title]).map(([k])=>k),callbackAvailable:Boolean(categories[CALLBACK_TITLE])});}
    catch {return res.status(503).json({error:'Das Kontaktformular ist gerade nicht verfügbar. Bitte kontaktieren Sie uns direkt.'});}
  }
  if(req.headers?.origin!==`${local?'http':'https'}://${host}`)return res.status(403).json({error:'Anfrage nicht erlaubt.'});
  if(!req.headers?.['content-type']?.startsWith('application/json') || !req.body || typeof req.body!=='object' || JSON.stringify(req.body).length>6500)return res.status(400).json({error:'Ungültige Anfrage.'});
  const id=requestId(req.body.token,key);
  if(!id || req.body.website)return res.status(400).json({error:'Bitte laden Sie das Formular neu und versuchen Sie es erneut.'});
  let request;try{request=parseContactRequest(req.body);}catch(e){return res.status(400).json({error:e.message});}
  const now=Date.now();for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);
  for(const [k,time] of uncertain)if(now-time>60*60*1000)uncertain.delete(k);
  const ip=String(req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
  const address=sign(ip,key),entry=attempts.get(address)||{count:0,until:now+15*60*1000};entry.count++;attempts.set(address,entry);
  if(entry.count>8)return res.status(429).json({error:'Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt.'});
  const fingerprint=sign(JSON.stringify(request),key);
  const previous=pending.get(id);
  if(previous&&previous.fingerprint!==fingerprint)return res.status(409).json({error:'Bitte laden Sie das Formular für eine neue Anfrage erneut.'});
  for(const [k,v] of pending)if(v.until<now)pending.delete(k);
  try{
    const promise=previous?.promise || (async()=>record(key,request,id,await noteCategories(key)))();
    if(!previous)pending.set(id,{fingerprint,promise,until:now+30*60*1000});
    const result=await promise;
    if(result.status!==200)pending.delete(id);
    const {status,...output}=result;return res.status(status).json(output);
  }catch(e){
    pending.delete(id);
    console.error('SLS contact request failed:',e.message);
    return res.status(502).json({error:'Ihre Anfrage konnte noch nicht vollständig bestätigt werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.'});
  }
}

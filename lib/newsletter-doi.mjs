import {createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID} from 'node:crypto';
import {securityStore, FormSecurityError} from './form-security.mjs';
import {GUIDE_MARKETING_CONSENT_TEXT, GUIDE_MARKETING_CONSENT_VERSION} from './guide-consent.mjs';

const WEEK=604800;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const secret=env=>env.NEWSLETTER_TOKEN_SECRET||env.KV_REST_API_TOKEN||env.UPSTASH_REDIS_REST_TOKEN;
const key=env=>{if(!secret(env))throw new FormSecurityError(503,'Die Newsletter-Anmeldung ist gerade nicht verfügbar.');return createHash('sha256').update('sls-newsletter-v1:'+secret(env)).digest();};
export const NEWSLETTER_CATEGORY={id:745595,name:'SLS_NEWSLETTER_BESTAETIGUNG_AUSSTEHEND'};
export const NEWSLETTER_FIELDS={confirm:'sls_newsletter_bestatigungslink',unsubscribe:'sls_newsletter_abmeldelink'};
export async function newsletterConfig(apiKey,propstack,env=process.env){
 if(!apiKey||typeof propstack!=='function'||!(env.KV_REST_API_URL||env.UPSTASH_REDIS_REST_URL)||!secret(env))return null;
 const types=[];
 for(let page=1;page<=20;page++){
  const result=await propstack(`activity_types?per=100&page=${page}`,apiKey);
  const items=Array.isArray(result)?result:(result?.data||[]);
  if(!Array.isArray(items))return null;
  const fresh=items.filter(item=>!types.some(type=>String(type.id)===String(item.id)));
  types.push(...fresh);
  const total=Number(result?.meta?.total_count);
  if(!fresh.length||(Number.isFinite(total)&&total<=types.length)||(!Number.isFinite(total)&&items.length<100))break;
 }
 const matches=types.filter(t=>Number(t.id)===NEWSLETTER_CATEGORY.id&&t.name===NEWSLETTER_CATEGORY.name&&['note','for_notes'].includes(t.category));
 return matches.length===1?{dedicated:true,transport:'propstack',categoryId:NEWSLETTER_CATEGORY.id}:null;
}
export function sealNewsletter(data,env=process.env){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(env),iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
}
export function openNewsletter(token,action,env=process.env,now=Date.now()){
 try{
  if(typeof token!=='string'||token.length>1200||! /^[A-Za-z0-9_-]+$/.test(token))throw Error();
  const bytes=Buffer.from(token,'base64url');if(bytes.length<30)throw Error();
  const cipher=createDecipheriv('aes-256-gcm',key(env),bytes.subarray(0,12));cipher.setAuthTag(bytes.subarray(12,28));
  const data=JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8'));
  if(data.action!==action||!['confirm','unsubscribe'].includes(action)||!Number.isSafeInteger(data.contact)||data.contact<1
   || !/^[a-f0-9]{64}$/.test(data.emailHash||'')|| !/^[a-f0-9-]{36}$/.test(data.request||'')
   || (action==='confirm'&&data.version!==GUIDE_MARKETING_CONSENT_VERSION)||!Number.isSafeInteger(data.time)||data.time>now
   || (action==='confirm'&&now-data.time>=WEEK*1000))throw Error();
  return data;
 }catch{throw new FormSecurityError(400,'Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie die Anmeldung erneut an oder kontaktieren Sie service@sls.de.');}
}
const requestKey=(store,id)=>`sls:newsletter:request:${store.hash(id)}`;
const latestKey=(store,id)=>`sls:newsletter:latest:${store.hash(String(id))}`;
const stateKey=(store,id)=>`sls:newsletter:action:${store.hash(id)}`;
async function recordNewsletterReview(store,id){try{await store.command(['SET','sls:security:review:last',JSON.stringify({scope:'newsletter',request:store.hash(id).slice(0,12),at:Date.now()}),'EX','86400']);}catch{}}
export const newsletterClaimScript=`
if redis.call('GET',KEYS[1])~=ARGV[1] then return 'obsolete' end
local state=redis.call('GET',KEYS[2]); if state then return state end
redis.call('SET',KEYS[2],'processing','EX',ARGV[2]); return 'claimed'`;
export const newsletterRevokeScript=`redis.call('SET',KEYS[1],'revoked','EX',ARGV[1]); return 1`;

export async function requestNewsletter(options){
 const store=options.store||securityStore();
 const config=options.config||await newsletterConfig(options.key,options.propstack,options.env||process.env);
 if(config?.categoryId!==NEWSLETTER_CATEGORY.id||config?.transport!=='propstack')throw new FormSecurityError(503,'Die Newsletter-Anmeldung ist gerade nicht verfügbar.');
 return withNewsletterLock(options.contactId,options.requestId,store,()=>requestNewsletterUnlocked({...options,store,config}));
}
async function requestNewsletterUnlocked({key:apiKey,contactId,email,requestId,propstack,origin,config,
 store,env=process.env}){
 const record=requestKey(store,requestId);
 if(await store.command(['SET',record,'processing','NX','EX',String(WEEK)])!=='OK'){
  return await store.command(['GET',record])==='queued'?'confirmation_requested':'needs_check';
 }
 try{
 const contact=await propstack(`contacts/${contactId}`,apiKey);
 if(contact?.archived||contact?.deleted_at||store.hash(String(contact?.email||'').trim().toLowerCase())!==store.hash(email.trim().toLowerCase()))throw new FormSecurityError(400,'Die Kontaktzuordnung muss geprüft werden. Bitte wenden Sie sich an service@sls.de.');
 const data={contact:Number(contactId),emailHash:store.hash(email.trim().toLowerCase()),request:requestId,
  version:GUIDE_MARKETING_CONSENT_VERSION,time:Date.now()};
 const confirm=`${origin}/newsletter/#confirm=${sealNewsletter({...data,action:'confirm'},env)}`;
 const unsubscribe=`${origin}/newsletter/#unsubscribe=${sealNewsletter({...data,action:'unsubscribe'},env)}`;
 // Only the two technical fields are updated; never replace other custom fields or grant consent.
 await propstack(`contacts/${contactId}`,apiKey,{client:{partial_custom_fields:{[NEWSLETTER_FIELDS.confirm]:confirm,[NEWSLETTER_FIELDS.unsubscribe]:unsubscribe}}},'PUT');
 const verified=await propstack(`contacts/${contactId}`,apiKey);
 if(verified?.custom_fields?.[NEWSLETTER_FIELDS.confirm]!==confirm||verified?.custom_fields?.[NEWSLETTER_FIELDS.unsubscribe]!==unsubscribe||store.hash(String(verified?.email||'').trim().toLowerCase())!==data.emailHash)throw new FormSecurityError(503,'Die Newsletter-Vorbereitung konnte noch nicht bestätigt werden. Bitte wenden Sie sich an service@sls.de.');
 await store.command(['SET',latestKey(store,contactId),requestId,'EX',String(WEEK)]);
 const note=await propstack('tasks',apiKey,{task:{title:NEWSLETTER_CATEGORY.name,note_type_id:config.categoryId,client_ids:[contactId],body:[
  'Newsletter-Auswahl: Bestätigung noch ausstehend. Keine Werbefreigabe durch die Formularübermittlung.',
  `Einwilligungstext, Version ${GUIDE_MARKETING_CONSENT_VERSION}: ${escapeHtml(GUIDE_MARKETING_CONSENT_TEXT)}`,
  `Anforderung: ${requestId}`,`Zeitpunkt: ${new Date(data.time).toISOString()}`,
  'Eigener SLS-Bestätigungsablauf; Versand durch Propstack über service@sls.de. Keine allgemeine Kontakterlaubnis oder Immobilienmailings.'
 ].join('<br>')}});
 if(!Number.isSafeInteger(Number(note?.id||note?.activity_id))||Number(note?.id||note?.activity_id)<1)throw Error('Newsletter evidence unavailable');
 // Accepted trigger is a queue acknowledgement, never a delivery claim. No automatic resend.
 await store.command(['SET',record,'queued','EX',String(WEEK)]);
 return 'confirmation_requested';
 }catch(error){await recordNewsletterReview(store,requestId);throw error;}
}

export async function applyNewsletterUnlocked({token,action,apiKey,propstack,store=securityStore(),env=process.env}){
 const data=openNewsletter(token,action,env);
 const client=await propstack(`contacts/${data.contact}`,apiKey);
 if(Number(client?.id)!==data.contact||client.archived===true||client.deleted_at
  ||store.hash(String(client.email||'').trim().toLowerCase())!==data.emailHash)throw new FormSecurityError(400,'Die Anmeldung konnte nicht zugeordnet werden. Bitte kontaktieren Sie service@sls.de.');
 const latest=latestKey(store,data.contact),state=stateKey(store,data.request);
 if(action==='confirm'){
  const claimed=await store.command(['EVAL',newsletterClaimScript,2,latest,state,data.request,String(WEEK)]);
  if(claimed==='confirmed')return {ok:true,message:'Ihre Newsletter-Anmeldung wurde bereits bestätigt.'};
  if(claimed==='obsolete')throw new FormSecurityError(409,'Diese Anmeldung wurde ersetzt oder zurückgezogen. Bitte melden Sie sich bei Bedarf erneut an.');
  if(claimed!=='claimed')throw new FormSecurityError(409,'Die Bestätigung wird geprüft. Bitte kontaktieren Sie service@sls.de, bevor Sie erneut bestätigen.');
 }else{
  // Withdraw all pending confirmations first, even when a CRM write becomes uncertain.
  await store.command(['EVAL',newsletterRevokeScript,1,latest,String(WEEK)]);
 }
 const enabled=action==='confirm';
 // Change only the newsletter preference. Never grant general contact/storage consent or property mailings.
 await propstack('tasks',apiKey,{task:{title:enabled?'SLS_NEWSLETTER_BESTAETIGT':'SLS_NEWSLETTER_WIDERRUFEN',client_ids:[data.contact],body:[
  enabled?'Newsletter ausdrücklich im SLS-Bestätigungsformular bestätigt.':'Newsletter im SLS-Abmeldeformular widerrufen; ausstehende Website-Bestätigungen gesperrt.',
  `Zeitpunkt: ${new Date().toISOString()}`,`Anforderung: ${data.request}`,
  `Einwilligungstext, Version ${data.version}: ${escapeHtml(GUIDE_MARKETING_CONSENT_TEXT)}`,
  'Umfang: ausschließlich die genannten Newsletter-E-Mails. Allgemeine Kontakterlaubnis, Datenschutzstatus und Immobilienmailings unverändert.'
 ].join('<br>')}});
 await propstack(`contacts/${data.contact}`,apiKey,{client:{newsletter:enabled}},'PUT');
 const verified=await propstack(`contacts/${data.contact}`,apiKey);
 if(verified.newsletter!==enabled)throw new FormSecurityError(503,'Die Änderung konnte noch nicht bestätigt werden. Bitte wenden Sie sich an service@sls.de.');
 if(enabled)await store.command(['SET',state,'confirmed','EX',String(WEEK)]);
 return {ok:true,message:enabled?'Ihre Newsletter-Anmeldung ist bestätigt. Sie können sich jederzeit über den Abmeldelink oder service@sls.de abmelden.':'Sie sind vom Newsletter abgemeldet. Eine ausstehende Anmeldung wird nicht mehr aktiviert.'};
}

export const newsletterUnlockScript=`if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end; return 0`;
async function withNewsletterLock(contactId,requestId,store,operation){
 const lock=`sls:newsletter:lock:${store.hash(String(contactId))}`,owner=randomUUID();
 if(await store.command(['SET',lock,owner,'NX','EX','600'])!=='OK')throw new FormSecurityError(409,'Eine Änderung wird gerade bearbeitet. Bitte versuchen Sie es in einigen Minuten erneut.');
 try{
  const result=await operation();
  await store.command(['EVAL',newsletterUnlockScript,1,lock,owner]);
  return result;
 }catch(error){
  if(error instanceof FormSecurityError&&error.status<500)await store.command(['EVAL',newsletterUnlockScript,1,lock,owner]);
  else await recordNewsletterReview(store,requestId);
  throw error;
 }
}
export async function applyNewsletter(options){
 const store=options.store||securityStore();
 const data=openNewsletter(options.token,options.action,options.env||process.env);
 return withNewsletterLock(data.contact,data.request,store,()=>applyNewsletterUnlocked({...options,store}));
}

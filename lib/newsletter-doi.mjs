import {createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID} from 'node:crypto';
import {securityStore, FormSecurityError} from './form-security.mjs';
import {sendViaMicrosoftGraph} from './m365-mail.mjs';
import {GUIDE_MARKETING_CONSENT_TEXT, GUIDE_MARKETING_CONSENT_VERSION} from './guide-consent.mjs';

const WEEK=604800;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const secret=env=>env.NEWSLETTER_TOKEN_SECRET||env.KV_REST_API_TOKEN||env.UPSTASH_REDIS_REST_TOKEN;
const key=env=>{if(!secret(env))throw new FormSecurityError(503,'Die Newsletter-Anmeldung ist gerade nicht verfügbar.');return createHash('sha256').update('sls-newsletter-v1:'+secret(env)).digest();};
export async function newsletterConfig(_key,_propstack,env=process.env){
 return ['MS_GRAPH_TENANT_ID','MS_GRAPH_CLIENT_ID','MS_GRAPH_CLIENT_SECRET'].every(n=>env[n])
  && (env.KV_REST_API_URL||env.UPSTASH_REDIS_REST_URL) && secret(env) ? {dedicated:true} : null;
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

export async function requestNewsletter({key:apiKey,contactId,email,requestId,propstack,origin,
 store=securityStore(),send=sendViaMicrosoftGraph,env=process.env}){
 const record=requestKey(store,requestId);
 if(await store.command(['SET',record,'processing','NX','EX',String(WEEK)])!=='OK'){
  return await store.command(['GET',record])==='sent'?'confirmation_requested':'needs_check';
 }
 try{
 const data={contact:Number(contactId),emailHash:store.hash(email.trim().toLowerCase()),request:requestId,
  version:GUIDE_MARKETING_CONSENT_VERSION,time:Date.now()};
 const confirm=`${origin}/newsletter/#confirm=${sealNewsletter({...data,action:'confirm'},env)}`;
 const unsubscribe=`${origin}/newsletter/#unsubscribe=${sealNewsletter({...data,action:'unsubscribe'},env)}`;
 await store.command(['SET',latestKey(store,contactId),requestId,'EX',String(WEEK)]);
 // No legacy note category: its automation sends an unrelated general contact form.
 const note=await propstack('tasks',apiKey,{task:{title:'SLS_NEWSLETTER_BESTAETIGUNG_AUSSTEHEND',client_ids:[contactId],body:[
  'Newsletter-Auswahl: Bestätigung noch ausstehend. Keine Werbefreigabe durch die Formularübermittlung.',
  `Einwilligungstext, Version ${GUIDE_MARKETING_CONSENT_VERSION}: ${escapeHtml(GUIDE_MARKETING_CONSENT_TEXT)}`,
  `Anforderung: ${requestId}`,`Zeitpunkt: ${new Date(data.time).toISOString()}`,
  'Eigener SLS-Bestätigungsablauf per Microsoft 365. Keine allgemeine Kontakterlaubnis oder Immobilienmailings.'
 ].join('<br>')}});
 if(!Number.isSafeInteger(Number(note?.id||note?.activity_id))||Number(note?.id||note?.activity_id)<1)throw Error('Newsletter evidence unavailable');
 await send({to:email,subject:'SLS Immobilienpartner – Newsletter-Anmeldung bestätigen',html:`<p>Guten Tag,</p><p>Bitte bestätigen Sie Ihre freiwillige Anmeldung:</p><p>${escapeHtml(GUIDE_MARKETING_CONSENT_TEXT)}</p><p><a href="${confirm}">Newsletter-Anmeldung bestätigen</a></p><p>Der Link gilt sieben Tage. Erst Ihr ausdrücklicher Klick auf „Newsletter bestätigen“ im Formular aktiviert diese Anmeldung. Der Ratgeber wird unabhängig davon versandt.</p><p>Falls Sie die Anmeldung nicht veranlasst haben, brauchen Sie nichts zu tun. Sie können die Anmeldung auch <a href="${unsubscribe}">zurückziehen oder den Newsletter abmelden</a>.</p><p>Datenschutz: <a href="${origin}/datenschutz/">Datenschutzerklärung</a>. Kontakt: service@sls.de.</p><p>SLS Immobilienpartner GmbH · Ubierweg 2 · 46286 Dorsten</p>`});
 await store.command(['SET',record,'sent','EX',String(WEEK)]);
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
export async function applyNewsletter(options){
 const store=options.store||securityStore();
 const data=openNewsletter(options.token,options.action,options.env||process.env);
 const lock=`sls:newsletter:lock:${store.hash(String(data.contact))}`,owner=randomUUID();
 if(await store.command(['SET',lock,owner,'NX','EX','600'])!=='OK')throw new FormSecurityError(409,'Eine Änderung wird gerade bearbeitet. Bitte versuchen Sie es in einigen Minuten erneut.');
 try{
  const result=await applyNewsletterUnlocked({...options,store});
  await store.command(['EVAL',newsletterUnlockScript,1,lock,owner]);
  return result;
 }catch(error){
  // Rejected links made no remote write. Uncertain writes keep the lock until expiry.
  if(error instanceof FormSecurityError&&error.status<500)await store.command(['EVAL',newsletterUnlockScript,1,lock,owner]);
  else await recordNewsletterReview(store,data.request);
  throw error;
 }
}

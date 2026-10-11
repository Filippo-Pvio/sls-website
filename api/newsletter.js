import {securityStore, issueSecurityToken, verifySecurityToken, enforceRate, FormSecurityError} from '../lib/form-security.mjs';
import {guideHostAllowed} from '../lib/website-origin.mjs';
import {scopedPropstackKey} from '../lib/propstack-access.mjs';
import {applyNewsletter} from '../lib/newsletter-doi.mjs';
import {logOperationalFailure} from '../lib/operational-log.mjs';

async function propstack(path,key,payload,method=payload?'POST':'GET'){
 const response=await fetch(`https://api.propstack.de/v1/${path}`,{method,headers:{'X-API-KEY':key,...(payload?{'Content-Type':'application/json'}:{})},
  ...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new FormSecurityError(503,'Die Änderung konnte nicht bestätigt werden. Bitte kontaktieren Sie service@sls.de.');
 return response.json();
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Referrer-Policy','no-referrer');
 try{
  const host=String(req.headers?.host||'').toLowerCase();
  if(!guideHostAllowed(host))throw new FormSecurityError(403,'Anfrage nicht erlaubt.');
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Methode nicht erlaubt.'});}
  const store=securityStore(),ip=String(req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
  await enforceRate(store,`newsletter:${ip}`,40,900);
  if(req.method==='GET')return res.status(200).json({securityToken:issueSecurityToken('newsletter',store)});
  const origin=`${host.startsWith('localhost')?'http':'https'}://${host}`;
  if(req.headers.origin!==origin)throw new FormSecurityError(403,'Anfrage nicht erlaubt.');
  if(!req.headers['content-type']?.startsWith('application/json')||!req.body||typeof req.body!=='object'
   ||Array.isArray(req.body)||Buffer.byteLength(JSON.stringify(req.body))>4000)throw new FormSecurityError(400,'Ungültige Anfrage.');
  verifySecurityToken(req.body.securityToken,'newsletter',store);
  if(!['confirm','unsubscribe'].includes(req.body.action))throw new FormSecurityError(400,'Ungültige Auswahl.');
  const apiKey=scopedPropstackKey('PROPSTACK_GUIDES_API_KEY');if(!apiKey)throw new FormSecurityError(503,'Der Newsletter-Service ist gerade nicht verfügbar.');
  const result=await applyNewsletter({token:req.body.token,action:req.body.action,apiKey,propstack,store});
  return res.status(200).json(result);
 }catch(error){
  const status=error instanceof FormSecurityError?error.status:503;
  logOperationalFailure('newsletter_action_failed',error);
  return res.status(status).json({error:error instanceof FormSecurityError?error.message:'Die Änderung konnte nicht bestätigt werden. Bitte kontaktieren Sie service@sls.de.'});
 }
}

import {createHmac, randomUUID, timingSafeEqual} from 'node:crypto';
const TTL=86400, LOCK_TTL=600;
export class FormSecurityError extends Error {constructor(status,message){super(message);this.status=status;}}
export function securityStore(env=process.env,fetcher=(...args)=>fetch(...args)) {
 const url=env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL,secret=env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN;
 if(!url||!secret||new URL(url).protocol!=='https:')throw new FormSecurityError(503,'Der sichere Versand ist gerade nicht verfügbar. Bitte kontaktieren Sie SLS direkt.');
 const hash=value=>createHmac('sha256',env.FORM_TOKEN_SECRET||secret).update(String(value)).digest('hex');
 const command=async args=>{try{const r=await fetcher(url,{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(3000),redirect:'error'});if(!r.ok)throw Error();const data=await r.json();if(data.error||data.result===undefined)throw Error();return data.result;}catch{throw new FormSecurityError(503,'Der sichere Versand ist gerade nicht verfügbar. Bitte kontaktieren Sie SLS direkt.');}};
 return {hash,command};
}
export function allowedFormHost(req,env=process.env){const host=String(req.headers?.host||'').toLowerCase();return ['sls-website-eight.vercel.app','sls.de','www.sls.de'].includes(host)||(env.VERCEL_ENV==='preview'&&/^[a-z0-9-]+\.vercel\.app$/.test(host))||(env.NODE_ENV!=='production'&&/^localhost(?::\d+)?$/.test(host));}
export function issueSecurityToken(scope,store){const value=Buffer.from(JSON.stringify({scope,time:Date.now(),id:randomUUID()})).toString('base64url');return `${value}.${store.hash('form:'+value)}`;}
function verify(token,scope,store){if(typeof token!=='string'||token.length>500)throw new FormSecurityError(400,'Bitte laden Sie das Formular erneut.');const [value,signature,extra]=token.split('.'),expected=Buffer.from(store.hash('form:'+value)),actual=Buffer.from(signature||'');if(extra||actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new FormSecurityError(400,'Bitte laden Sie das Formular erneut.');let data;try{data=JSON.parse(Buffer.from(value,'base64url'));}catch{throw new FormSecurityError(400,'Ungültige Formularfreigabe.');}if(data.scope!==scope||!Number.isFinite(data.time)||Date.now()-data.time<0||Date.now()-data.time>=1800000||!/^[-a-f0-9]{36}$/.test(data.id||''))throw new FormSecurityError(400,'Die Formularfreigabe ist abgelaufen. Bitte laden Sie das Formular erneut.');return data.id;}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(k=>!['securityToken','token'].includes(k)).map(k=>[k,canonical(value[k])]));return value;}
export const rateScript=`local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n`;
export const claimScript=`
local previous=redis.call('GET',KEYS[1]); if previous then return {'existing',previous} end
local token=redis.call('GET',KEYS[2]); if token and token~=ARGV[1] then return {'changed',''} end
if redis.call('EXISTS',KEYS[3])==1 then return {'busy',''} end
redis.call('SET',KEYS[1],'{"pending":true}','EX',ARGV[2]); redis.call('SET',KEYS[2],ARGV[1],'EX',ARGV[2]); redis.call('SET',KEYS[3],ARGV[1],'EX',ARGV[3]); return {'claimed',''}`;
export const finishScript=`if redis.call('GET',KEYS[2])==ARGV[1] then redis.call('DEL',KEYS[2]) end; if ARGV[2]=='release' then redis.call('DEL',KEYS[1]); redis.call('DEL',KEYS[3]); else redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3]) end; return 1`;
export async function enforceRate(store,key,max,seconds){const count=Number(await store.command(['EVAL',rateScript,1,`sls:forms:rate:${store.hash(key)}`,String(seconds)]));if(!Number.isSafeInteger(count)||count<1)throw new FormSecurityError(503,'Der sichere Versand ist gerade nicht verfügbar.');if(count>max)throw new FormSecurityError(429,'Bitte warten Sie etwas, bevor Sie erneut anfragen.');}
export function withFormSecurity(scope,handler,{maxBytes=8000,postLimit=8,windowSeconds=900}={}) {
 return async function secured(req,res){res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
 try{
  if(!allowedFormHost(req))throw new FormSecurityError(403,'Anfrage nicht erlaubt.');
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Methode nicht erlaubt.'});}
  const host=String(req.headers.host).toLowerCase(),origin=`${host.startsWith('localhost')?'http':'https'}://${host}`;
  if(req.method==='POST'&&req.headers.origin!==origin)throw new FormSecurityError(403,'Anfrage nicht erlaubt.');
  const store=securityStore(),ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  await enforceRate(store,`${scope}:all:${ip}`,60,900);
  if(req.method==='GET'){
   if(req.query?.formSecurity==='1')return res.status(200).json({securityToken:issueSecurityToken(scope,store)});
   return await handler(req,res);
  }
  if(req.body===undefined&&req.headers['content-type']?.startsWith('application/json')&&req[Symbol.asyncIterator]){const chunks=[];let bytes=0;for await(const chunk of req){bytes+=Buffer.byteLength(chunk);if(bytes>maxBytes)throw new FormSecurityError(413,'Ihre Anfrage ist zu groß.');chunks.push(Buffer.from(chunk));}try{req.body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new FormSecurityError(400,'Ungültige Anfrage.');}}
  if(!req.headers['content-type']?.startsWith('application/json')||!req.body||typeof req.body!=='object'||Array.isArray(req.body)||Buffer.byteLength(JSON.stringify(req.body))>maxBytes)throw new FormSecurityError(400,'Ungültige Anfrage.');
  if(req.body.website)throw new FormSecurityError(400,'Ungültige Anfrage.');
  const id=verify(req.body.securityToken,scope,store);
  await enforceRate(store,`${scope}:post:${ip}`,postLimit,windowSeconds);
  const email=String(req.body.contact?.email||req.body.email||'').trim().toLowerCase();
  if(!email||email.length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))throw new FormSecurityError(400,'Bitte prüfen Sie Ihre E-Mail-Adresse.');
  await enforceRate(store,`${scope}:email:${email}`,postLimit,windowSeconds);
  const fingerprint=store.hash(`${scope}:${JSON.stringify(canonical(req.body))}`),record=`sls:forms:result:${fingerprint}`,tokenKey=`sls:forms:token:${store.hash(scope+id)}`,lock=`sls:forms:lock:${store.hash(email)}`;
  const result=await store.command(['EVAL',claimScript,3,record,tokenKey,lock,fingerprint,String(TTL),String(LOCK_TTL)]);
  if(!Array.isArray(result))throw new FormSecurityError(503,'Der sichere Versand ist gerade nicht verfügbar.');
  if(result[0]==='existing'){const previous=JSON.parse(result[1]);if(previous.pending)throw new FormSecurityError(409,'Ihre Anfrage wird bearbeitet oder muss geprüft werden. Bitte kontaktieren Sie SLS, bevor Sie erneut absenden.');return res.status(previous.status).json(previous.body);}
  if(result[0]==='changed')throw new FormSecurityError(409,'Bitte laden Sie das Formular für eine neue Anfrage erneut.');
  if(result[0]==='busy')throw new FormSecurityError(409,'Eine Anfrage zu dieser Adresse wird gerade bearbeitet. Bitte warten Sie kurz.');
  if(result[0]!=='claimed')throw new FormSecurityError(503,'Der sichere Versand ist gerade nicht verfügbar.');
  let status=200,body;
  const capture=Object.create(res);capture.status=code=>{status=code;return capture;};capture.json=data=>{body=data;return capture;};
  try{await handler(req,capture);}catch{status=502;body={error:'Ihre Anfrage konnte nicht bestätigt werden. Bitte kontaktieren Sie SLS vor einer Wiederholung.'};}
  if(body===undefined){status=502;body={error:'Ihre Anfrage konnte nicht bestätigt werden. Bitte kontaktieren Sie SLS.'};}
  // No contact data or CRM identifiers belong in the shared result cache.
  body=Object.fromEntries(Object.entries(body).filter(([key])=>!/(?:Id|Ids)$/.test(key)&&key!=='existingContactIds'));
  if(status<500)await store.command(['EVAL',finishScript,3,record,lock,tokenKey,fingerprint,status>=400?'release':JSON.stringify({status,body}),String(TTL)]);
  else console.warn(JSON.stringify({event:'form_write_uncertain',scope,request:fingerprint.slice(0,12)}));
  return res.status(status).json(body);
 }catch(error){const status=error instanceof FormSecurityError?error.status:503;console.warn(JSON.stringify({event:'form_security_rejected',scope,status}));if(status===429)res.setHeader('Retry-After',String(windowSeconds));return res.status(status).json({error:error instanceof FormSecurityError?error.message:'Der sichere Versand ist gerade nicht verfügbar.',message:error instanceof FormSecurityError?error.message:'Der sichere Versand ist gerade nicht verfügbar.'});}
 };
}

export function withReadSecurity(scope,handler,limit=30){return async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 try{if(!allowedFormHost(req))throw new FormSecurityError(403,'Anfrage nicht erlaubt.');if(req.method!=='GET')return res.status(405).json({error:'Methode nicht erlaubt.'});const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();await enforceRate(securityStore(),`${scope}:${ip}`,limit,900);return await handler(req,res);}catch(error){return res.status(error instanceof FormSecurityError?error.status:503).json({error:error instanceof FormSecurityError?error.message:'Der sichere Zugriff ist gerade nicht verfügbar.'});}
};}

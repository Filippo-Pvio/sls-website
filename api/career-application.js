import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {careerConfigured,parseApplication,sendApplication,CAREER_RECIPIENT,MAX_BODY_BYTES,MAX_FILE_BYTES,MAX_TOTAL_BYTES} from '../lib/career-application.mjs';
export const config = {api:{bodyParser:false}};
const states = new Map(), attempts = new Map();
const allowed = origin => {
  try { const u=new URL(origin); return u.origin===origin && u.protocol==='https:' && !u.port && (['sls.de','www.sls.de','sls-website-eight.vercel.app'].includes(u.hostname) || /^sls-website-[a-z0-9]+-info-91172609\.vercel\.app$/.test(u.hostname)); } catch { return false; }
};
const signature = (value,key) => createHmac('sha256',key).update(`sls-career:${value}`).digest('base64url');
const issue = key => { const value=`${Date.now()}.${randomUUID()}`;return `${value}.${signature(value,key)}`; };
function readToken(token,key) {
  if (typeof token!=='string' || token.length>160) return null;
  const [time,id,sig,extra]=token.split('.');
  if (extra || !/^\d{13}$/.test(time || '') || !/^[a-f\d-]{36}$/.test(id || '') || !sig) return null;
  const expected=Buffer.from(signature(`${time}.${id}`,key)),actual=Buffer.from(sig);
  if(expected.length!==actual.length || !timingSafeEqual(expected,actual))return null;
  const age=Date.now()-Number(time);return age>=1000 && age<60*60*1000 ? id : null;
}
async function readBody(req) {
  if (req.body !== undefined) {
    const encoded=typeof req.body==='string'?req.body:JSON.stringify(req.body);
    if(Buffer.byteLength(encoded)>MAX_BODY_BYTES)throw Object.assign(new Error('Ihre Unterlagen sind zu groß. Bitte reduzieren Sie die Dateigröße.'),{status:413});
    try{return typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{throw Object.assign(new Error('Die Bewerbung konnte nicht gelesen werden.'),{status:400});}
  }
  const parts=[];let size=0;
  for await (const chunk of req) { size+=chunk.length;if(size>MAX_BODY_BYTES)throw Object.assign(new Error('Ihre Unterlagen sind zu groß. Bitte reduzieren Sie die Dateigröße.'),{status:413});parts.push(chunk); }
  try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw Object.assign(new Error('Die Bewerbung konnte nicht gelesen werden.'),{status:400});}
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method==='GET')return res.status(200).json({available:careerConfigured(process.env),recipient:CAREER_RECIPIENT,maxFileBytes:MAX_FILE_BYTES,maxTotalBytes:MAX_TOTAL_BYTES,...(careerConfigured(process.env)?{token:issue(process.env.CAREER_TOKEN_SECRET)}:{})});
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Diese Anfrage wird nicht unterstützt.'});}
  if(!allowed(req.headers.origin))return res.status(403).json({error:'Bitte nutzen Sie das Bewerbungsformular auf unserer Website.'});
  // Fail before reading applicants' documents when the mail and privacy configuration is incomplete.
  if(!careerConfigured(process.env))return res.status(503).json({error:'Die Online-Bewerbung ist momentan nicht verfügbar. Bitte senden Sie Ihre Unterlagen direkt an bewerbung@sls.de.'});
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return res.status(415).json({error:'Die Bewerbung konnte nicht gelesen werden.'});
  if(Number(req.headers['content-length']||0)>MAX_BODY_BYTES)return res.status(413).json({error:'Ihre Unterlagen sind zu groß. Bitte reduzieren Sie die Dateigröße.'});
  const now=Date.now();
  for(const [key,value] of states)if(value.until<now)states.delete(key);
  for(const [key,value] of attempts)if(value.until<now)attempts.delete(key);
  const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
  const ipKey=createHmac('sha256',process.env.CAREER_TOKEN_SECRET).update(ip).digest('hex');
  const rate=attempts.get(ipKey)||{count:0,until:now+30*60*1000};
  if(rate.count>=6 || attempts.size>10000 || states.size>10000)return res.status(429).json({error:'Bitte versuchen Sie es später erneut oder schreiben Sie an bewerbung@sls.de.'});
  rate.count++;attempts.set(ipKey,rate);
  try {
    const body=await readBody(req), id=readToken(body.token,process.env.CAREER_TOKEN_SECRET);
    if(!id)return res.status(400).json({error:'Das Formular ist abgelaufen. Bitte laden Sie die Seite neu.'});
    const application=parseApplication(body);
    const previous=states.get(id);
    if(previous?.status==='accepted')return res.status(200).json({accepted:true,reference:id});
    if(previous)return res.status(409).json({error:'Der Versand dieser Bewerbung läuft bereits oder konnte nicht eindeutig bestätigt werden. Bitte senden Sie nicht erneut ab und fragen Sie bei bewerbung@sls.de nach.',reference:id});
    states.set(id,{status:'pending',until:now+60*60*1000});
    try {await sendApplication(application,id);states.set(id,{status:'accepted',until:now+60*60*1000});return res.status(200).json({accepted:true,reference:id});}
    catch {states.set(id,{status:'uncertain',until:now+60*60*1000});return res.status(502).json({error:'Der Versand konnte nicht eindeutig bestätigt werden. Bitte fragen Sie bei bewerbung@sls.de nach und nennen Sie die Referenz.',reference:id});}
  } catch(error) {return res.status(error.status||400).json({error:error.status?error.message:'Bitte prüfen Sie Ihre Angaben und Unterlagen.'});}
}

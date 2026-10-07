import {randomInt,randomUUID} from 'node:crypto';
import {securityStore,FormSecurityError} from './form-security.mjs';
export const consumeVerificationScript=`local value=redis.call('GET',KEYS[1]); if value~=ARGV[1] then return 0 end; redis.call('DEL',KEYS[1]); return 1`;
export async function verifyReportEmail(body,contact,sendConfirmation) {
 const store=securityStore(),fingerprint=store.hash(JSON.stringify([contact.email,contact.firstName,contact.lastName,contact.phone,body.report]));
 if(body.verificationRef||body.verificationCode){
  if(!/^[a-f0-9-]{36}$/.test(body.verificationRef||'')||!/^\d{6}$/.test(body.verificationCode||''))throw new FormSecurityError(400,'Bitte geben Sie den sechsstelligen Bestätigungscode ein.');
  const value=store.hash(`${fingerprint}:${body.verificationCode}`),key=`sls:forms:verify:${store.hash(body.verificationRef)}`;
  if(Number(await store.command(['EVAL',consumeVerificationScript,1,key,value]))!==1)throw new FormSecurityError(400,'Der Bestätigungscode ist ungültig oder abgelaufen. Bitte prüfen Sie den Code oder beginnen Sie erneut.');
  return null;
 }
 const verificationRef=randomUUID(),code=String(randomInt(100000,1000000)),key=`sls:forms:verify:${store.hash(verificationRef)}`;
 if(await store.command(['SET',key,store.hash(`${fingerprint}:${code}`),'EX','600'])!=='OK')throw new FormSecurityError(503,'Die E-Mail-Bestätigung ist gerade nicht verfügbar.');
 await sendConfirmation(contact.email,code);
 return {ok:true,status:'email_confirmation_required',verificationRef,message:'Bitte geben Sie den Bestätigungscode aus unserer E-Mail ein. Er ist zehn Minuten gültig. Erst danach senden wir Ihre persönliche Auswertung.'};
}

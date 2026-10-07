import {timingSafeEqual} from 'node:crypto';
import {securityStore} from '../lib/form-security.mjs';
import {sendViaMicrosoftGraph} from '../lib/m365-mail.mjs';

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method!=='GET')return res.status(405).json({error:'Methode nicht erlaubt.'});
 const secret=process.env.CRON_SECRET,actual=Buffer.from(req.headers?.authorization||''),expected=Buffer.from(secret?`Bearer ${secret}`:'');
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return res.status(401).json({error:'Anfrage nicht erlaubt.'});
 if(process.env.VERCEL_ENV!=='production')return res.status(200).json({ok:true,skipped:'preview'});
 const issues=[];let store,healthy=false,review;
 try{store=securityStore();if(await store.command(['PING'])!=='PONG')throw Error();healthy=true;
  review=await store.command(['GET','sls:security:review:last']);if(review)issues.push('form_write_needs_review');
 }catch{issues.push('central_store_unavailable');}
 try{const r=await fetch('https://frag-sls.vercel.app/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Sicherheitsprüfung'}),redirect:'error',signal:AbortSignal.timeout(10000)});if(r.status!==401)issues.push('sia_auth_check_failed');}
 catch{issues.push('sia_service_unreachable');}
 if(!issues.length){console.info(JSON.stringify({event:'security_monitor_ok'}));return res.status(200).json({ok:true});}
 console.error(JSON.stringify({event:'security_monitor_alert',issues}));
 const recipient=process.env.SECURITY_ALERT_EMAIL;let notification='dashboard';
 if(recipient&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient)){
  try{
   // One warning per observed incident for 24 hours, including concurrent checks.
   const canSend=!healthy||await store.command(['SET','sls:security:alert:'+store.hash(JSON.stringify({issues,review})),'claimed','NX','EX','86400'])==='OK';
   if(canSend){await sendViaMicrosoftGraph({to:recipient,subject:'SLS Website: Sicherheitsbetrieb prüfen',html:'<p>Eine automatische Prüfung der SLS Website meldet:</p><ul>'+issues.map(issue=>'<li>'+issue+'</li>').join('')+'</ul><p>Bitte die Runtime-Logs im Vercel-Projekt sls-website prüfen. Bei ungewissem Versand zuerst CRM beziehungsweise Postfach kontrollieren und nicht blind erneut senden. Diese Warnung enthält keine Kundendaten.</p>'});notification='accepted';}
   else notification='coalesced';
  }catch{notification='failed';console.error(JSON.stringify({event:'security_monitor_notification_failed'}));}
 }
 return res.status(503).json({ok:false,issues,notification});
}

import {createHash, timingSafeEqual} from 'node:crypto';
import {GUIDE_NEWSLETTER_SETUP, resolveNewsletterSender} from '../lib/guide-newsletter.mjs';

// Temporary, authenticated preview-only check; fixed recipient/template, no contact-field mutations.
const TOKEN_HASH = '50994483cc963c14500987bd314fc6862dcdb0a589e1c7418376fc52354eda68';
const EXPIRES = 1790926592350;
const EMAIL = 'service@sls.de';
const TEST_MARKER = 'SLS-DOI-TEST-1115618-20261002';
const rows = data => Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : (()=>{throw new Error('Unexpected response')})();
async function propstack(path,key,payload) {
  const response = await fetch(`https://api.propstack.de/v1/${path}`,{method:payload?'POST':'GET',headers:{'X-API-KEY':key,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw new Error(`Propstack ${payload?'POST':'GET'} ${path.split('?')[0].replace(/\/\d+/g,'/:id')}: ${response.status}`);
  return response.json();
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
  const supplied = String(req.headers?.authorization || '').replace(/^Bearer /,'');
  const allowed = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === 'feat/propstack-property-preview-current'
    && Date.now() < EXPIRES && supplied.length < 100
    && timingSafeEqual(createHash('sha256').update(supplied).digest(),Buffer.from(TOKEN_HASH,'hex'));
  if(!allowed) return res.status(404).json({error:'Not found'});
  if(!['GET','POST'].includes(req.method)) return res.status(405).json({error:'Method not allowed'});
  const key=process.env.PROPSTACK_GUIDES_API_KEY || process.env.PROPSTACK_INQUIRY_API_KEY || process.env.PROPSTACK_API_KEY;
  if(!key) return res.status(503).json({error:'Key unavailable'});
  try {
    const brokerId=await resolveNewsletterSender(key,EMAIL,propstack);
    const contacts=rows(await propstack(`contacts?email=${encodeURIComponent(EMAIL)}&archived=-1&with_meta=1&per=100`,key));
    if(contacts.length!==1 || String(contacts[0].email||'').trim().toLowerCase()!==EMAIL) throw new Error('Test contact not unique');
    const id=Number(contacts[0].id);if(!Number.isSafeInteger(id)||id<=0) throw new Error('Missing test contact');
    const contact=await propstack(`contacts/${id}`,key);
    if(Number(contact.id)!==id || String(contact.email||'').trim().toLowerCase()!==EMAIL) throw new Error('Test contact verification failed');
    const snapshot={newsletter:contact.newsletter??null,accept_contact:contact.accept_contact??null,newsletter_unsubscribed:contact.newsletter_unsubscribed??null};
    if(req.method==='GET') return res.status(200).json({senderResolved:true,brokerId,snippetId:GUIDE_NEWSLETTER_SETUP.snippetId,flags:snapshot});
    if(req.body?.action!=='send-confirmation-test') return res.status(400).json({error:'Invalid action'});
    const activities=rows(await propstack(`activities?client_id=${id}&item_type=note&expand=1&order=desc&per=100`,key));
    if(activities.some(activity=>{const task=activity.activatable||activity.task||activity;return (task.title||activity.title)===TEST_MARKER;})) return res.status(409).json({error:'Test already initiated; inspect the existing email instead of resending',flags:snapshot});
    const note=await propstack('tasks',key,{task:{title:TEST_MARKER,client_ids:[id],body:`Technischer Bestätigungsmail-Test auf ausdrücklichen Nutzerwunsch an service@sls.de. Textbaustein 1115618. Kein Website-Opt-in und keine bestätigte Werbeeinwilligung. Vorherige Felder: ${JSON.stringify(snapshot)}. Zeitpunkt: ${new Date().toISOString()}. Diese Testnotiz darf keine Werbeserie starten.`}});
    if(!Number(note?.id||note?.activity_id)) throw new Error('Test note not confirmed');
    const sent=await propstack('messages',key,{message:{broker_id:brokerId,snippet_id:GUIDE_NEWSLETTER_SETUP.snippetId,to:[EMAIL],client_ids:[id]}});
    if(sent?.ok===false || !Number(sent?.id)) throw new Error('Send not confirmed');
    return res.status(200).json({accepted:true,messageId:Number(sent.id),flagsBefore:snapshot});
  } catch(error) {console.error('DOI preview check:',error.message);return res.status(502).json({error:error.message});}
}

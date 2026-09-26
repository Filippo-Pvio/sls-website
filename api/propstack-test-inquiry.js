import {allowedIds,mayDisplay} from '../lib/propstack-preview.mjs';

const text=(value,max=150)=>typeof value==='string' ? value.trim().slice(0,max) : '';
async function propstack(path,key,options={}) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try {
    const response=await fetch(`https://api.propstack.de/v1/${path}`,{
      ...options,headers:{'X-API-KEY':key,...options.headers},signal:controller.signal
    });
    if (!response.ok) throw new Error(`Propstack ${path} returned ${response.status}`);
    return response.json();
  } finally {clearTimeout(timer)}
}
const html=value=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
  if (req.method!=='POST') return res.status(405).json({error:'Methode nicht erlaubt'});
  const readKey=process.env.PROPSTACK_API_KEY;
  const writeKey=process.env.PROPSTACK_INQUIRY_API_KEY;
  const source=process.env.PROPSTACK_INQUIRY_SOURCE_ID;
  if (process.env.PROPSTACK_INQUIRY_ENABLED!=='1' || !readKey || !writeKey || !/^\d+$/.test(source||''))
    return res.status(503).json({error:'Der Anfrageversand ist noch nicht freigeschaltet.'});
  if (!req.headers?.['content-type']?.startsWith('application/json') || Number(req.headers?.['content-length']||0)>5000)
    return res.status(400).json({error:'Ungültige Anfrage.'});
  const body=req.body||{};
  const id=String(body.propertyId||'');
  const firstName=text(body.firstName,100),lastName=text(body.lastName,100),email=text(body.email,254),phone=text(body.phone,60);
  if (!/^\d+$/.test(id) || !allowedIds(process.env.PROPSTACK_TEST_PROPERTY_IDS).has(id) || !firstName || !lastName || !/^\S+@\S+\.\S+$/.test(email) || !phone || body.privacy!==true)
    return res.status(400).json({error:'Bitte alle Pflichtfelder und die Datenschutzeinwilligung prüfen.'});
  try {
    const statuses=await propstack('property_statuses',readKey);
    const matches=(statuses.data||[]).filter(s=>s.name===process.env.PROPSTACK_PUBLIC_STATUS_NAME && s.nonpublic!==true);
    if (matches.length!==1) return res.status(404).json({error:'Objekt nicht verfügbar.'});
    const list=await propstack(`units?with_meta=1&property_ids=${id}&per=100`,readKey);
    const unit=(list.data||[]).find(u=>String(u.id)===id && mayDisplay(u,new Set([id]),new Set([String(matches[0].id)])));
    if (!unit) return res.status(404).json({error:'Objekt nicht verfügbar.'});
    const client=await propstack('contacts',writeKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client:{first_name:firstName,last_name:lastName,email,phone,street:text(body.street),house_number:text(body.houseNumber,20),zip_code:text(body.zip,20),city:text(body.city,100),client_source_id:Number(source)}})});
    const contactId=Number(client.id);
    if (!Number.isSafeInteger(contactId) || contactId<=0) throw new Error('Propstack contact response missing ID');
    await propstack('tasks',writeKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:{title:'Anfrage über die Webseite',client_ids:[contactId],property_ids:[Number(id)],broker_id:unit.broker_id||unit.broker?.id||undefined,client_source_id:Number(source),body:`Anfrage zu Objekt ${html(id)}<br>Name: ${html(firstName)} ${html(lastName)}<br>E-Mail: ${html(email)}<br>Telefon: ${html(phone)}`}})});
    return res.status(200).json({ok:true});
  } catch(error) {
    console.error('Propstack inquiry failed:',error.message);
    return res.status(502).json({error:'Die Anfrage konnte nicht bestätigt werden. Bitte kontaktieren Sie den Makler direkt.'});
  }
}

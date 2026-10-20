import {createHash} from 'node:crypto';

// Redis SET NX makes the uncertainty barrier visible to every serverless instance.
// No contact details, notes, or provider credentials are stored.
const digest = value => createHash('sha256').update(value).digest('hex');
const keyFor = (namespace,value) => 'sls:contact:v1:' + namespace + ':' + digest(value);
async function command(args) {
  const url=process.env.KV_REST_API_URL,token=process.env.KV_REST_API_TOKEN;
  if(!url || !token) throw new Error('Shared contact guard not configured');
  const endpoint=new URL(url);
  if(endpoint.protocol!=='https:')throw new Error('Shared contact guard requires HTTPS');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2000);
  try {
    const r=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(args),signal:controller.signal,redirect:'error'});
    if(!r.ok)throw new Error('Shared contact guard unavailable');
    const body=await r.json();
    if(body.error)throw new Error('Shared contact guard command failed');
    return body.result;
  } finally {clearTimeout(timer);}
}
export async function claimContactSubmission(identity,fingerprint) {
  const key=keyFor('submission',identity);
  const result=await command(['SET',key,fingerprint,'EX',3600,'NX']);
  if(result==='OK')return 'claimed';
  const stored=await command(['GET',key]);
  return stored===fingerprint?'existing':'conflict';
}
export async function claimContactNote(identity) {
  const result=await command(['SET',keyFor('note',identity),'uncertain','EX',86400,'NX']);
  return result==='OK';
}
export async function clearContactNote(identity) {
  await command(['DEL',keyFor('note',identity)]);
}

import {allowedIds,mayDisplay,publicUnit} from '../lib/propstack-preview.mjs';
async function read(path, key) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),10000);
  try {
    const response = await fetch(`https://api.propstack.de/v1/${path}`,{headers:{'X-API-KEY':key},signal:controller.signal});
    if (!response.ok) throw new Error(`Propstack returned ${response.status}`);
    return await response.json();
  } finally {clearTimeout(timer);}
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
  if (req.method !== 'GET') return res.status(405).json({error:'Methode nicht erlaubt'});
  const key=process.env.PROPSTACK_API_KEY;
  const ids=allowedIds(process.env.PROPSTACK_TEST_PROPERTY_IDS);
  const statusName=process.env.PROPSTACK_PUBLIC_STATUS_NAME?.trim();
  if (!key || !ids.size || !statusName) return res.status(503).json({error:'Propstack-Testzugang noch nicht vollständig konfiguriert.'});
  const id=req.query.id;
  if (id && (!/^\d+$/.test(String(id)) || !ids.has(String(id)))) return res.status(404).json({error:'Objekt nicht freigegeben'});
  try {
    const statusResult=await read('property_statuses',key);
    const available=Array.isArray(statusResult.data) ? statusResult.data : [];
    const named=available.filter(s=>s.name === statusName);
    const matches=named.filter(s=>s.nonpublic !== true);
    if (matches.length !== 1) {
      console.error('Propstack preview status mismatch:',JSON.stringify({statusCount:available.length,nameMatches:named.length,allowedMatches:matches.length}));
      return res.status(503).json({error:named.length === 0 ? 'Objektstatus in Propstack nicht gefunden.' : 'Objektstatus in Propstack gesperrt oder nicht eindeutig.'});
    }
    const statuses=new Set([String(matches[0].id)]);
    if (id) {
      const listed=await read(`units?with_meta=1&property_ids=${encodeURIComponent(id)}&per=100`,key);
      const summary=(listed.data || []).find(u=>String(u.id) === String(id) && mayDisplay(u,ids,statuses));
      if (!summary) return res.status(404).json({error:'Objekt nicht veröffentlicht'});
      const detail=await read(`units/${encodeURIComponent(id)}?new=1`,key);
      if (String(detail.id) !== String(id) || detail.archived === true ||
          (detail.marketing_type && detail.marketing_type !== 'BUY') ||
          (detail.status?.id && String(detail.status.id) !== String(summary.status.id)) ||
          detail.status?.nonpublic === true) return res.status(404).json({error:'Objekt nicht veröffentlicht'});
      const combined={...summary,...detail,status:summary.status,images:detail.images?.length ? detail.images : summary.images};
      return res.status(200).json({items:[publicUnit(combined)]});
    }
    const units=[];
    const allowed=[...ids];
    for (let i=0;i<allowed.length;i+=40) {
      const result=await read(`units?with_meta=1&property_ids=${allowed.slice(i,i+40).join(',')}&per=100`,key);
      units.push(...(result.data || []));
    }
    return res.status(200).json({items:units.filter(u=>mayDisplay(u,ids,statuses)).map(publicUnit)});
  } catch(error) {
    console.error('Propstack test fetch failed:',error.message);
    return res.status(502).json({error:'Propstack-Objekte sind momentan nicht abrufbar.'});
  }
}

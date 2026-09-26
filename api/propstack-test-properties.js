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
      // In some response variants the detailed object omits the broker relation.
      // Retain the published listing's assigned broker and fill missing contact fields.
      combined.broker={...(summary.broker || {}),...(detail.broker || {})};
      if (combined.broker.id || combined.broker.name) {
        for (const field of ['name','phone','mobile','cell','email','avatar_url','avatar']) {
          if (!combined.broker[field]) combined.broker[field]=summary.broker?.[field] || '';
        }
      }
      const brokerId=detail.broker_id || summary.broker_id || combined.broker.id;
      if (brokerId && (!combined.broker.phone || !combined.broker.email)) {
        try {
          const brokers=await read('brokers',key);
          const full=(Array.isArray(brokers) ? brokers : brokers.data || []).find(b=>String(b.id)===String(brokerId));
          if (full) combined.broker={...full,...Object.fromEntries(Object.entries(combined.broker).filter(([,value])=>value))};
        } catch(error) {
          // Broker read permission is optional; never substitute a central number.
          console.warn('Propstack broker details unavailable:',error.message);
        }
      }
      // The detail endpoint can return null for facts that are populated in the public listing.
      // Preserve those listing facts so card and exposé do not contradict each other.
      for (const field of ['price','object_price','living_space','property_space_value','number_of_rooms','number_of_bed_rooms','number_of_bath_rooms','plot_area','construction_year','rs_type','city','zip_code']) {
        if (combined[field] == null || combined[field] === '') combined[field]=summary[field];
      }
      const publicListing=publicUnit(summary);
      const publicDetail=publicUnit(combined);
      // The listing is the single source for searchable facts. In the detail response,
      // Propstack can supply a differently shaped price that hides a valid list price.
      for (const field of ['price','area','rooms','city','zip']) {
        if (publicListing[field] != null && publicListing[field] !== '') publicDetail[field]=publicListing[field];
      }
      if (publicListing.type !== 'Immobilie') publicDetail.type=publicListing.type;
      for (const field of ['bedrooms','baths','year']) {
        if (publicDetail[field] == null) publicDetail[field]=publicListing[field];
      }
      publicDetail.inquiryEnabled=process.env.PROPSTACK_INQUIRY_ENABLED==='1' &&
        Boolean(process.env.PROPSTACK_INQUIRY_API_KEY) && /^\d+$/.test(process.env.PROPSTACK_INQUIRY_SOURCE_ID||'');
      return res.status(200).json({items:[publicDetail]});
    }
    const units=[];
    const allowed=[...ids];
    for (let i=0;i<allowed.length;i+=40) {
      const result=await read(`units?with_meta=1&property_ids=${allowed.slice(i,i+40).join(',')}&per=100`,key);
      units.push(...(result.data || []));
    }
    const published=units.filter(u=>mayDisplay(u,ids,statuses));
    const items=[];
    for (let i=0;i<published.length;i+=5) {
      const batch=await Promise.all(published.slice(i,i+5).map(async summary=>{
        const item=publicUnit(summary);
        try {
          const detail=await read(`units/${summary.id}?new=1`,key);
          if (String(detail.id)!==String(summary.id) || detail.archived===true ||
              (detail.marketing_type && detail.marketing_type!=='BUY') || detail.status?.nonpublic===true ||
              (detail.status?.id && String(detail.status.id)!==String(summary.status.id))) return null;
          const more=publicUnit({...summary,...detail,status:summary.status});
          item.energy=more.energy;
          item.courtage=more.courtage||item.courtage;
          if (item.type==='Immobilie' && more.type!=='Immobilie') item.type=more.type;
          return item;
        } catch(error) {
          console.warn('Propstack preview listing detail unavailable:',error.message);
          return item;
        }
      }));
      items.push(...batch.filter(Boolean));
    }
    return res.status(200).json({items});
  } catch(error) {
    console.error('Propstack test fetch failed:',error.message);
    return res.status(502).json({error:'Propstack-Objekte sind momentan nicht abrufbar.'});
  }
}

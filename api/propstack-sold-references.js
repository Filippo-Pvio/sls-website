const API_BASE = 'https://api.propstack.de/v1/';
const PAGE_SIZE = 100;
const MAX_PAGES = 40;
// Match completed sales only. Never interpret "in Vermarktung" or "reserviert" as sold.
const SOLD_NAMES = new Set(['verkauft', 'erfolgreich vermarktet']);

async function propstack(path, key) {
  const response = await fetch(new URL(path, API_BASE), {
    headers: { 'X-API-KEY': key },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Propstack HTTP ${response.status}`);
  return response.json();
}

function safeImage(images) {
  for (const item of Array.isArray(images) ? images : []) {
    if (item.is_private !== false || item.is_floorplan === true) continue;
    const value = item.medium_url || item.medium || item.big_url || item.big || item.url;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:') return url.href;
    } catch {
      // Ignore invalid or relative image URLs.
    }
  }
  return null;
}

function publicReference(unit, soldStatusIds) {
  if (!/^\d+$/.test(String(unit?.id)) ||
      !soldStatusIds.has(String(unit?.status?.id)) ||
      unit.marketing_type !== 'BUY') return null;
  const image = safeImage(unit.images);
  if (!image) return null;
  const title = String(unit.title?.value ?? unit.title ?? '').trim().slice(0, 130);
  const city = String(unit.city ?? '').trim().slice(0, 70);
  const zip = String(unit.zip_code ?? unit.zip ?? '').trim().slice(0, 12);
  if (!title || !city) return null;
  const brokerName = String(unit.broker?.name || '').trim().slice(0, 100);
  const brokerId = String(unit.broker_id || unit.broker?.id || '').trim();
  return { id: String(unit.id), title, city, zip: zip || null, image, brokerName: brokerName || null, brokerId: brokerId || null };
}

async function soldListings(key, statusIds) {
  const units = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const query = new URLSearchParams({
      with_meta: '1', status: [...statusIds].join(','),
      marketing_type: 'BUY', archived: '-1',
      per: String(PAGE_SIZE), page: String(page)
    });
    const response = await propstack(`units?${query}`, key);
    if (!Array.isArray(response.data)) throw new Error('Propstack listing format changed');
    for (const unit of response.data) {
      if (seen.has(String(unit.id))) throw new Error('Propstack pagination repeated a property');
      seen.add(String(unit.id));
      units.push(unit);
    }
    const total = Number(response.meta?.total_count);
    if (Number.isFinite(total) && total >= 0 && units.length >= total) return units;
    if (response.data.length === 0) {
      if (Number.isFinite(total) && units.length < total) throw new Error('Incomplete Propstack results');
      return units;
    }
    // Without reliable total_count, keep reading until Propstack returns the final page.
    if (!Number.isFinite(total) && response.data.length < PAGE_SIZE) return units;
  }
  throw new Error('Too many Propstack result pages for a complete selection');
}

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  }
  const key = process.env.PROPSTACK_API_KEY;
  if (!key) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'Referenzen noch nicht verbunden' });
  }

  try {
    const result = await propstack('property_statuses', key);
    const statuses = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
    const soldStatusIds = new Set(statuses.filter(status =>
      SOLD_NAMES.has(String(status.name || '').trim().toLocaleLowerCase('de-DE')))
      .map(status => String(status.id)));
    if (!soldStatusIds.size) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(503).json({ error: 'Verkaufsstatus in Propstack nicht gefunden' });
    }

    const listings = await soldListings(key, soldStatusIds);
    let brokersById = new Map();
    try {
      const brokerResult = await propstack('brokers', key);
      const brokers = Array.isArray(brokerResult) ? brokerResult : Array.isArray(brokerResult.data) ? brokerResult.data : [];
      brokersById = new Map(brokers.map(broker => [String(broker.id), broker]));
    } catch (error) {
      console.warn('Propstack broker list unavailable:', error.message);
    }

    const publicListings = [];
    for (let i = 0; i < listings.length; i += 8) {
      const batch = await Promise.all(listings.slice(i, i + 8).map(async unit => {
        let source = unit;
        if (!unit.broker_id && !unit.broker?.id && !unit.broker?.name) {
          try {
            const detail = await propstack('units/' + encodeURIComponent(unit.id) + '?new=1', key);
            if (String(detail?.id) === String(unit.id)) source = { ...unit, ...detail, status: unit.status, images: detail.images?.length ? detail.images : unit.images };
          } catch (error) {
            console.warn('Sold reference broker detail unavailable for ' + unit.id + ':', error.message);
          }
        }
        const ref = publicReference(source, soldStatusIds);
        if (!ref) return null;
        const brokerId = String(source.broker_id || source.broker?.id || ref.brokerId || '');
        const broker = source.broker || brokersById.get(brokerId);
        if (broker) {
          ref.brokerId = brokerId || String(broker.id || '') || null;
          ref.brokerName = String(broker.name || '').trim().slice(0, 100) || null;
        }
        return ref;
      }));
      publicListings.push(...batch.filter(Boolean));
    }
    const references = publicListings;
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json({ references });
  } catch (error) {
    console.error('Propstack references unavailable:', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'Referenzen vorübergehend nicht verfügbar' });
  }
}

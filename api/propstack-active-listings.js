const API_BASE = 'https://api.propstack.de/v1/';
const PAGE_SIZE = 100;
const MAX_PAGES = 3;
const MAX_RESULTS = 12;
const ACTIVE_NAMES = new Set(['vermarktung']);

async function propstack(path, key) {
  const response = await fetch(new URL(path, API_BASE), {
    headers: { 'X-API-KEY': key },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Propstack HTTP ${response.status}`);
  return response.json();
}

function normalise(value) {
  return String(value || '').trim().toLocaleLowerCase('de-DE');
}

function safeImage(images) {
  for (const item of Array.isArray(images) ? images : []) {
    if (item?.is_private !== false || item?.is_floorplan === true) continue;
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

function findPublicSlsUrl(value, depth = 0, seen = new Set()) {
  if (depth > 5 || value == null) return null;
  if (typeof value === 'string') {
    try {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./, '');
      if (url.protocol === 'https:' && host === 'sls.de' && url.pathname.startsWith('/immobilie/')) {
        return url.href;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (typeof value !== 'object' || seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPublicSlsUrl(item, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }
  for (const item of Object.values(value)) {
    const found = findPublicSlsUrl(item, depth + 1, seen);
    if (found) return found;
  }
  return null;
}

function typeLabel(unit) {
  if (unit.rs_type === 'HOUSE') return 'Haus · Kauf';
  if (unit.rs_type === 'APARTMENT') return 'Wohnung · Kauf';
  if (unit.rs_type === 'INVESTMENT') return 'Investment · Kauf';
  if (unit.rs_type === 'TRADE_SITE') return 'Grundstück · Kauf';
  if (unit.object_type === 'COMMERCIAL') return 'Gewerbe · Kauf';
  return 'Immobilie · Kauf';
}

function publicListing(unit, activeStatusIds) {
  if (!/^\d+$/.test(String(unit?.id)) ||
      !activeStatusIds.has(String(unit?.status?.id)) ||
      unit.marketing_type !== 'BUY' ||
      unit.archived === true) return null;

  const image = safeImage(unit.images);
  const url = findPublicSlsUrl(unit);
  const title = String(unit.title?.value ?? unit.title ?? '').trim().slice(0, 140);
  const city = String(unit.city ?? '').trim().slice(0, 70);
  const price = Number(unit.price);
  if (!image || !url || !title || !city || !Number.isFinite(price) || price <= 0) return null;

  const livingSpace = Number(unit.living_space);
  const rooms = Number(unit.number_of_rooms);
  return {
    id: String(unit.id),
    title,
    city,
    price,
    livingSpace: Number.isFinite(livingSpace) && livingSpace > 0 ? livingSpace : null,
    rooms: Number.isFinite(rooms) && rooms > 0 ? rooms : null,
    type: typeLabel(unit),
    image,
    url,
    updatedAt: unit.updated_at || null,
  };
}

async function activeListings(key, statusIds) {
  const collected = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES && collected.length < MAX_RESULTS; page++) {
    const query = new URLSearchParams({
      with_meta: '1',
      expand: '1',
      status: [...statusIds].join(','),
      marketing_type: 'BUY',
      per: String(PAGE_SIZE),
      page: String(page),
      sort_by: 'updated_at',
      order: 'desc',
    });
    const response = await propstack(`units?${query}`, key);
    if (!Array.isArray(response.data)) throw new Error('Propstack listing format changed');

    for (const unit of response.data) {
      const id = String(unit?.id ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const listing = publicListing(unit, statusIds);
      if (listing) collected.push(listing);
      if (collected.length >= MAX_RESULTS) break;
    }

    const total = Number(response.meta?.total_count);
    if (response.data.length < PAGE_SIZE || (Number.isFinite(total) && page * PAGE_SIZE >= total)) break;
  }
  return collected;
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
    return res.status(503).json({ error: 'Immobilienfeed noch nicht verbunden' });
  }

  try {
    const result = await propstack('property_statuses', key);
    const statuses = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
    const activeStatusIds = new Set(statuses
      .filter(status => ACTIVE_NAMES.has(normalise(status?.name)))
      .map(status => String(status.id)));

    if (!activeStatusIds.size) {
res.setHeader('Cache-Control', 'no-store');
      return res.status(503).json({ error: 'Aktiver Vermarktungsstatus in Propstack nicht gefunden' });
    }

    const listings = await activeListings(key, activeStatusIds);
    if (!listings.length) {
      const query = new URLSearchParams({ with_meta: '1', expand: '1', status: [...activeStatusIds].join(','), marketing_type: 'BUY', per: '12', page: '1', sort_by: 'updated_at', order: 'desc' });
      const diagnostic = await propstack(`units?${query}`, key);
      console.error('Propstack active listing diagnostics:', (diagnostic.data || []).map(unit => ({ id: unit.id, title: unit.title?.value ?? unit.title, city: unit.city, price: unit.price, image: Boolean(safeImage(unit.images)), keys: Object.keys(unit).filter(key => /url|link|slug|web|external|public/i.test(key)) })));
    }
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json({ listings });
  } catch (error) {
    console.error('Propstack active listings unavailable:', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'Aktuelle Immobilien vorübergehend nicht verfügbar' });
  }
}

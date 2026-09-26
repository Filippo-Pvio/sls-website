const API_BASE = 'https://api.propstack.de/v1/';
const MAX_REFERENCES = 10;

function approvedIds(raw = '') {
  const ids = raw.split(',').map(value => value.trim());
  return [...new Set(ids.filter(value => /^\d+$/.test(value)))].slice(0, MAX_REFERENCES);
}

async function propstack(path, key) {
  const response = await fetch(new URL(path, API_BASE), {
    headers: { 'X-API-KEY': key },
    signal: AbortSignal.timeout(8000),
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
      // Ignore unavailable or relative image URLs.
    }
  }
  return null;
}

function publicReference(unit, expectedId, expectedStatusId) {
  if (String(unit?.id) !== expectedId ||
      String(unit?.status?.id) !== expectedStatusId ||
      unit.marketing_type !== 'BUY') return null;
  const image = safeImage(unit.images);
  if (!image) return null;
  const title = String(unit.title?.value ?? unit.title ?? '').trim().slice(0, 130);
  const city = String(unit.city ?? '').trim().slice(0, 70);
  if (!title || !city) return null;
  return { id: expectedId, title, city, image };
}

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  }
  const key = process.env.PROPSTACK_API_KEY;
  const ids = approvedIds(process.env.PROPSTACK_REFERENCE_PROPERTY_IDS);
  const statusId = process.env.PROPSTACK_REFERENCE_STATUS_ID?.trim();
  const statusName = process.env.PROPSTACK_REFERENCE_STATUS_NAME?.trim();
  // IDs represent explicit permission to show both the property and its non-private photos.
  if (!key || !ids.length || !/^\d+$/.test(statusId || '') || !statusName) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'Referenzen noch nicht freigegeben' });
  }

  try {
    const result = await propstack('property_statuses', key);
    const statuses = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
    const matching = statuses.filter(status =>
      String(status.id) === statusId && status.name === statusName);
    if (matching.length !== 1) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(503).json({ error: 'Referenzstatus nicht eindeutig' });
    }

    // Explicitly allowed sold records may have a nonpublic status in Propstack.
    // Never publish a record solely because it has that status.
    const references = await Promise.all(ids.map(async id => {
      try {
        const listing = await propstack(
          `units?with_meta=1&property_ids=${encodeURIComponent(id)}&archived=-1&per=100`, key);
        const units = Array.isArray(listing.data) ? listing.data : [];
        const summary = units.find(unit => String(unit.id) === id &&
          String(unit.status?.id) === statusId && unit.marketing_type === 'BUY');
        if (!summary) return null;
        const detail = await propstack(`units/${encodeURIComponent(id)}?new=1`, key);
        if (String(detail.id) !== id ||
            String(detail.status?.id ?? summary.status?.id) !== statusId ||
            (detail.marketing_type && detail.marketing_type !== 'BUY')) return null;
        return publicReference({
          ...summary, ...detail, status: summary.status,
          images: Array.isArray(detail.images) ? detail.images : summary.images
        }, id, statusId);
      } catch (error) {
        console.warn('Approved Propstack reference unavailable:', id, error.message);
        return null;
      }
    }));

    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json({ references: references.filter(Boolean) });
  } catch (error) {
    console.error('Propstack references unavailable:', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'Referenzen vorübergehend nicht verfügbar' });
  }
}

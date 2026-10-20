import {createHash} from 'node:crypto';

// Shared cache stores ONLY the already-public reference-card projection.
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const VALID_FOR_MS = 15 * 60 * 1000;
const MAX_STALE_MS = 24 * 60 * 60;
const keyFor = key => 'sls:public-references:v1:' + createHash('sha256').update(key).digest('hex').slice(0,24);
const configured = () => Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
async function command(args) {
  if (!configured()) return null;
  const url = new URL(process.env.KV_REST_API_URL);
  if (url.protocol !== 'https:') throw new Error('Cache endpoint must use HTTPS');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const response = await fetch(url, {method:'POST',headers:{
      Authorization:'Bearer ' + process.env.KV_REST_API_TOKEN,
      'Content-Type':'application/json'
    },body:JSON.stringify(args),signal:controller.signal,redirect:'error'});
    if (!response.ok) throw new Error('Cache read/write failed');
    const payload = await response.json();
    if (payload.error) throw new Error('Cache command rejected');
    return payload.result;
  } finally { clearTimeout(timer); }
}
function valid(items) {
  return Array.isArray(items) && items.length > 0 && items.length <= 4000 &&
    items.every(p => p && /^\d+$/.test(String(p.id)) &&
      typeof p.title === 'string' && typeof p.city === 'string' &&
      typeof p.image === 'string' && p.image.startsWith('https://') &&
      Object.keys(p).every(k => ['id','title','city','zip','image'].includes(k)));
}
export async function readSharedReferences(apiKey) {
  const raw = await command(['GET',keyFor(apiKey)]);
  if (!raw) return null;
  const entry = JSON.parse(raw);
  if (!Number.isFinite(entry.savedAt) || entry.savedAt > Date.now() ||
      Date.now() - entry.savedAt > MAX_STALE_MS || !valid(entry.items)) return null;
  return {items:entry.items,fresh:Date.now()-entry.savedAt < VALID_FOR_MS};
}
export async function writeSharedReferences(apiKey,items) {
  if (!valid(items)) return false;
  await command(['SET',keyFor(apiKey),JSON.stringify({savedAt:Date.now(),items}),'EX',CACHE_TTL_SECONDS]);
  return true;
}

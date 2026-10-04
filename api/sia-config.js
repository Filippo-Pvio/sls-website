// Public activation is restricted to the hostname explicitly approved by the owner.
import { quotaConfigured, DAILY_LIMIT } from './lib/sia-quota.js';
export function siaEnabled(req) {
  if (process.env.VERCEL_ENV === 'production') return req?.headers?.host?.toLowerCase() === 'sls-website-eight.vercel.app';
  return process.env.VERCEL_ENV === 'preview' || (!process.env.VERCEL_ENV && process.env.SIA_LOCAL_PREVIEW === '1');
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end('{}'); }
  let dialogueEnabled = false;
  if (siaEnabled(req)) {
    try {
      const upstream = await fetch('https://frag-sls.vercel.app/api/ask', { signal: AbortSignal.timeout(3000), redirect: 'error', cache: 'no-store' });
      if (upstream.ok) { const data = await upstream.json(); dialogueEnabled = data.version === 'frag-dialogue-1' && data.dialogueEnabled === true; }
    } catch { /* Keep the legacy service usable until the backend is upgraded. */ }
  }
  res.end(JSON.stringify({ enabled: siaEnabled(req), dailyLimit: quotaConfigured() ? DAILY_LIMIT : null, dialogueEnabled }));
}

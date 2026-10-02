// Public activation is restricted to the hostname explicitly approved by the owner.
export function siaEnabled(req) {
  if (process.env.VERCEL_ENV === 'production') return req?.headers?.host?.toLowerCase() === 'sls-website-eight.vercel.app';
  return process.env.VERCEL_ENV === 'preview' || (!process.env.VERCEL_ENV && process.env.SIA_LOCAL_PREVIEW === '1');
}
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('Allow', 'GET'); return res.end('{}'); }
  res.end(JSON.stringify({ enabled: siaEnabled(req) }));
}

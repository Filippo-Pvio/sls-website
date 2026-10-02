import { siaEnabled } from './sia-config.js';
const endpoint = 'https://frag-sls.vercel.app/api/ask';
const send = (res, status, data) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.end(JSON.stringify(data));
};
export default async function handler(req, res) {
  if (!siaEnabled(req)) return send(res, 404, { error: 'SIA ist hier noch nicht freigeschaltet.' });
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'Nur POST erlaubt.' }); }
  if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return send(res, 415, { error: 'Bitte JSON senden.' });
  if (req.headers.origin) {
    try { if (new URL(req.headers.origin).host !== req.headers.host) return send(res, 403, { error: 'Anfrage nicht erlaubt.' }); }
    catch { return send(res, 403, { error: 'Anfrage nicht erlaubt.' }); }
  }
  let body;
  try {
    if (req.body !== undefined) {
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (Buffer.byteLength(raw) > 8192) return send(res, 413, { error: 'Anfrage zu groß.' });
      body = JSON.parse(raw);
    } else {
      let size = 0; const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 8192) return send(res, 413, { error: 'Anfrage zu groß.' });
        chunks.push(Buffer.from(chunk));
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
  } catch { return send(res, 400, { error: 'Ungültige Anfrage.' }); }
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (question.length < 3 || question.length > 1200) return send(res, 400, { error: 'Bitte 3 bis 1200 Zeichen eingeben.' });
  try {
    const upstream = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }), signal: AbortSignal.timeout(43000), redirect: 'error'
    });
    if (!upstream.ok) return send(res, 502, { error: 'SIA ist gerade nicht erreichbar. Bitte versuchen Sie es später erneut oder kontaktieren Sie Ihren SLS Immobilienpartner.' });
    const data = await upstream.json();
    if (!['OpenAI', 'Wissensbasis von SLS Immobilienpartner'].includes(data.provider) || typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 30000 || !Array.isArray(data.sources) || data.sources.length > 30) throw new Error('Invalid response');
    return send(res, 200, { provider: data.provider, answer: data.answer, sources: data.sources, version: data.version });
  } catch {
    return send(res, 502, { error: 'SIA konnte gerade keine Antwort abrufen. Bitte versuchen Sie es später erneut oder kontaktieren Sie Ihren SLS Immobilienpartner.' });
  }
}

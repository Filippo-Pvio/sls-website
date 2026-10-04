import { generalDefinition } from './lib/sia-general-knowledge.js';
import { siaEnabled } from './sia-config.js';
import { reserveQuota } from './lib/sia-quota.js';
import { validateConversation } from './lib/sia-conversation.js';
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
      if (Buffer.byteLength(raw) > 32768) return send(res, 413, { error: 'Anfrage zu groß.' });
      body = JSON.parse(raw);
    } else {
      let size = 0; const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 32768) return send(res, 413, { error: 'Anfrage zu groß.' });
        chunks.push(Buffer.from(chunk));
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
  } catch { return send(res, 400, { error: 'Ungültige Anfrage.' }); }
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (Buffer.byteLength(question) > 8192) return send(res, 413, { error: 'Anfrage zu groß.' });
  let history;
  try { history = validateConversation(body?.history); } catch { return send(res, 400, { error: 'Ungültiger Gesprächskontext.' }); }
  if (question.length < (history.length ? 1 : 3) || question.length > 1200) return send(res, 400, { error: 'Bitte eine Frage mit höchstens 1200 Zeichen eingeben.' });
  let reservation;
  try {
    reservation = await reserveQuota(req, res);
  } catch {
    return send(res, 503, { error: 'SIA ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.' });
  }
  if (reservation?.blocked) {
    res.setHeader('Retry-After', String(reservation.retryAfter));
    return send(res, 429, { code: reservation.blocked, quota: reservation.quota, error: reservation.blocked === 'daily_limit'
      ? 'Sie haben heute zehn Antworten von SIA erhalten. Morgen können Sie wieder Fragen stellen. Unser Team ist weiterhin persönlich für Sie da.'
      : 'Bitte warten Sie einen Moment, bevor Sie die nächste Frage senden.' });
  }
  try {
    const upstream = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, ...(history.length ? { history } : {}) }), signal: AbortSignal.timeout(50000), redirect: 'error'
    });
    if (!upstream.ok) throw new Error('Upstream unavailable');
    const data = await upstream.json();
    if (!['OpenAI', 'Wissensbasis von SLS Immobilienpartner'].includes(data.provider) || typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 30000 || !Array.isArray(data.sources) || data.sources.length > 30) throw new Error('Invalid response');
    const definition = data.provider !== 'OpenAI' && !data.sources.length ? generalDefinition(question) : null;
    const reason = ['invalid_sources', 'verification_failed', 'missing_api_key', 'authentication', 'rate_limit', 'configuration', 'upstream_error', 'timeout', 'invalid_response'].includes(data.reason) ? data.reason : null;
    if (data.kind !== undefined && !['answer', 'clarification', 'offtopic'].includes(data.kind)) throw new Error('Invalid answer kind');
    if (data.kind && data.kind !== 'answer' && (data.provider !== 'OpenAI' || data.sources.length || data.answer.length > 500)) throw new Error('Invalid clarification');
    const kind = data.kind || 'answer';
    const citations = data.citations;
    if (citations !== undefined && (!Array.isArray(citations) || citations.length > 100 || citations.some((c, i) => !Number.isInteger(c.number) || !Number.isInteger(c.start) || !Number.isInteger(c.end) || c.start < (i ? citations[i-1].end : 0) || c.end <= c.start || c.end > data.answer.length || !data.sources.some(source => source.number === c.number)))) throw new Error('Invalid citations');
    const answer = definition || { provider: data.provider, answer: data.answer, sources: data.sources, version: data.version, kind, reason: ['clarification', 'offtopic', 'general_web'].includes(data.reason) ? data.reason : reason, ...(citations ? { citations } : {}) };
    if (answer.provider !== 'OpenAI' && !answer.sources.length) {
      answer.answer = 'Zu dieser Frage fehlt SIA derzeit eine ausreichend belegte Grundlage. Unser Team kann Ihr Anliegen persönlich einordnen.';
      answer.reason = 'unanswered';
    }
    const quota = await reservation?.settle(kind === 'answer' && (answer.provider === 'OpenAI' || answer.sources.length > 0));
    return send(res, 200, { ...answer, ...(quota ? { quota } : {}) });
  } catch {
    try { await reservation?.settle(false); } catch { /* Pending reservations expire automatically. */ }
    return send(res, 502, { error: 'SIA konnte gerade keine Antwort abrufen. Bitte versuchen Sie es später erneut oder kontaktieren Sie Ihren SLS Immobilienpartner.' });
  }
}

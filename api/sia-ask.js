import { generalDefinition } from './lib/sia-general-knowledge.js';
import { propertyDetailResult } from './propstack-properties.js';
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

  let context = null;
  const requestedContext = body?.pageContext;
  if (requestedContext?.type === 'property') {
    const propertyId = String(requestedContext.propertyId || '');
    if (!/^\d+$/.test(propertyId)) return send(res, 400, { error: 'Ungültiger Objektkontext.' });
    const result = await propertyDetailResult(propertyId);
    const property = result.status === 200 ? result.body?.items?.[0] : null;
    if (!property) return send(res, 409, { error: 'Diese Immobilie ist nicht mehr öffentlich verfügbar.' });
    const safeProperty = {
      id: property.id,
      reference: property.reference,
      title: property.title,
      type: property.type,
      city: property.city,
      zip: property.zip,
      price: property.price,
      area: property.area,
      rooms: property.rooms,
      bedrooms: property.bedrooms,
      baths: property.baths,
      plot: property.plot,
      year: property.year,
      objectFacts: property.objectFacts,
      description: property.description,
      location: property.location,
      features: property.features,
      otherNote: property.otherNote,
      courtage: property.courtage,
      courtageNote: property.courtageNote,
      energy: property.energy,
      amenities: property.amenities,
      flooring: property.flooring,
      broker: property.broker ? {
        name: property.broker.name,
        phone: property.broker.phone,
        mobile: property.broker.mobile,
        email: property.broker.email
      } : null
    };
    context = {
      type: 'property',
      instruction: 'Beantworte objektspezifische Fragen ausschließlich anhand dieser aktuell veröffentlichten SLS-Objektdaten. Erfinde keine fehlenden Angaben. Wenn eine Information hier nicht enthalten ist, sage klar, dass sie im veröffentlichten Inserat nicht angegeben ist, und verweise bei Bedarf auf den Ansprechpartner.',
      property: safeProperty
    };
  } else if (requestedContext?.type === 'page') {
    context = {
      type: 'page',
      path: typeof requestedContext.path === 'string' ? requestedContext.path.slice(0, 180) : '',
      title: typeof requestedContext.title === 'string' ? requestedContext.title.slice(0, 180) : '',
      heading: typeof requestedContext.heading === 'string' ? requestedContext.heading.slice(0, 180) : ''
    };
  }
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
    let upstreamQuestion = question;
    if (context?.type === 'property' && context.property) {
      const p = context.property;
      const compact = value => typeof value === 'string' ? value.trim().slice(0, 2200) : value;
      const facts = Array.isArray(p.objectFacts)
        ? p.objectFacts.slice(0, 30).map(item => `${item.label}: ${item.value}`).join('; ')
        : '';
      const energy = p.energy && typeof p.energy === 'object'
        ? Object.entries(p.energy).filter(([,value]) => value !== null && value !== undefined && value !== '').slice(0, 20).map(([key,value]) => `${key}: ${value}`).join('; ')
        : '';
      const broker = p.broker
        ? [p.broker.name, p.broker.phone || p.broker.mobile, p.broker.email].filter(Boolean).join(' · ')
        : '';
      const propertyContextText = [
        'VERBINDLICHER KONTEXT ZUR AKTUELL GEÖFFNETEN SLS-IMMOBILIE:',
        `Objekt-ID: ${p.id || ''}`,
        `Titel: ${compact(p.title) || ''}`,
        `Referenz: ${compact(p.reference) || ''}`,
        `Typ: ${compact(p.type) || ''}`,
        `Ort: ${[p.zip, p.city].filter(Boolean).join(' ')}`,
        p.price != null ? `Kaufpreis: ${p.price}` : '',
        p.area != null ? `Wohnfläche: ${p.area} m²` : '',
        p.rooms != null ? `Zimmer: ${p.rooms}` : '',
        p.bedrooms != null ? `Schlafzimmer: ${p.bedrooms}` : '',
        p.baths != null ? `Badezimmer: ${p.baths}` : '',
        p.plot != null ? `Grundstück: ${p.plot} m²` : '',
        p.year != null ? `Baujahr: ${p.year}` : '',
        facts ? `Weitere Eckdaten: ${facts}` : '',
        p.courtage ? `Käuferprovision: ${compact(p.courtage)}` : '',
        p.courtageNote ? `Provisionshinweis: ${compact(p.courtageNote)}` : '',
        energy ? `Energieangaben: ${energy}` : '',
        Array.isArray(p.amenities) && p.amenities.length ? `Merkmale: ${p.amenities.slice(0,30).join(', ')}` : '',
        p.flooring ? `Bodenbeläge: ${compact(p.flooring)}` : '',
        p.features ? `Ausstattung: ${compact(p.features)}` : '',
        p.description ? `Objektbeschreibung: ${compact(p.description)}` : '',
        p.location ? `Lagebeschreibung: ${compact(p.location)}` : '',
        p.otherNote ? `Sonstiges: ${compact(p.otherNote)}` : '',
        broker ? `Ansprechpartner: ${broker}` : '',
        '',
        'WICHTIGE ANTWORTREGELN:',
        '- Beantworte die folgende Nutzerfrage bezogen auf genau diese Immobilie.',
        '- Verwende für objektspezifische Aussagen ausschließlich die oben genannten veröffentlichten Daten.',
        '- Fehlt eine Information, sage klar, dass sie im veröffentlichten Inserat nicht angegeben ist.',
        '- Frage nicht erneut nach Adresse, Objekt oder weiteren Identifikationsdaten; das Objekt ist bereits eindeutig bestimmt.',
        '',
        `NUTZERFRAGE: ${question}`
      ].filter(Boolean).join('\n');
      upstreamQuestion = propertyContextText.slice(0, 7600);
    }

    const upstream = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: upstreamQuestion, ...(history.length ? { history } : {}), ...(context ? { context } : {}) }), signal: AbortSignal.timeout(50000), redirect: 'error'
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

import {createHmac, randomUUID, timingSafeEqual} from 'node:crypto';

const GUIDE = 'VERKAUF';
const NOTE = 'SLS_RATGEBER_VERKAUF_ANGEFORDERT';
const TITLE = 'Immobilie verkaufen. Mit einem guten Gefühl.';
const received = 'Vielen Dank. Ihre Ratgeberanforderung wurde aufgenommen. Der E-Mail-Versand wird derzeit vorbereitet.';
const normalise = value => String(value || '').trim().toLowerCase();
const validId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const attempts = new Map();
const pending = new Map();
const uncertain = new Map();

function rows(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  throw new Error('Unexpected Propstack list response');
}

async function propstack(path, key, payload) {
  const response = await fetch(`https://api.propstack.de/v1/${path}`, {
    method: payload ? 'POST' : 'GET',
    headers: {'X-API-KEY':key, ...(payload ? {'Content-Type':'application/json'} : {})},
    ...(payload ? {body:JSON.stringify(payload)} : {}),
    signal:AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Propstack request failed (${response.status})`);
  return response.json();
}

async function noteType(key) {
  const types = [];
  for (let page = 1; page <= 20; page++) {
    const result = await propstack(`activity_types?per=100&page=${page}`, key);
    const items = rows(result);
    const fresh = items.filter(item => !types.some(type => String(type.id) === String(item.id)));
    types.push(...fresh);
    const total = Number(result?.meta?.total_count);
    if (!fresh.length || (Number.isFinite(total) && total <= types.length) || (!Number.isFinite(total) && items.length < 100)) break;
  }
  const matches = types.filter(type => normalise(type.name) === normalise(NOTE) && normalise(type.category) === 'note' && validId(type.id));
  if (matches.length !== 1) {
    const candidate = types.find(type => Number(type.id) === 741093);
    const diagnostic = candidate ? {id:741093,name:candidate.name,category:candidate.category} : {id:741093,found:false};
    console.error('Guide category configuration:', JSON.stringify(diagnostic));
    const error = new Error('Guide note category missing or ambiguous');
    error.guideConfiguration = diagnostic;
    throw error;
  }
  return Number(matches[0].id);
}

function sign(value, key) {
  return createHmac('sha256', key).update(`sls-guide-request:${value}`).digest('base64url');
}

function issueToken(key) {
  const value = `${Date.now()}.${randomUUID()}`;
  return `${value}.${sign(value, key)}`;
}

function verifyToken(token, key) {
  if (typeof token !== 'string' || token.length > 150) return null;
  const [time, id, signature, extra] = token.split('.');
  if (extra || !/^\d{13}$/.test(time || '') || !/^[a-f\d-]{36}$/.test(id || '') || !signature) return null;
  const expected = Buffer.from(sign(`${time}.${id}`, key));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  const age = Date.now() - Number(time);
  return age >= 1500 && age < 30 * 60 * 1000 ? id : null;
}

function limited(req, key) {
  const now = Date.now();
  for (const [id, entry] of attempts) if (entry.until < now) attempts.delete(id);
  for (const [id, until] of uncertain) if (until < now) uncertain.delete(id);
  const address = String(req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0];
  const id = sign(address, key); // Keep neither raw addresses nor email addresses in the rate-limit map.
  const entry = attempts.get(id) || {count:0, until:now + 15 * 60 * 1000};
  entry.count++;
  attempts.set(id, entry);
  return entry.count > 8;
}

async function recordRequest(key, email, categoryId, requestId) {
  const query = new URLSearchParams({email, archived:'-1', with_meta:'1', per:'100'});
  const contacts = rows(await propstack(`contacts?${query}`, key));
  // A secondary/shared email must not trigger delivery to a different primary address.
  if (contacts.length > 1 || (contacts.length === 1 && normalise(contacts[0].email) !== email)) {
    throw new Error('Contact could not be uniquely matched');
  }
  let contactId = Number(contacts[0]?.id);
  if (!contacts.length) {
    // Propstack upserts by email. Send only email, so a concurrent create cannot overwrite names or preferences.
    const contact = await propstack('contacts', key, {client:{email}});
    contactId = Number(contact.id);
  }
  if (!validId(contactId)) throw new Error('Contact ID missing');
  const verified = await propstack(`contacts/${contactId}`, key);
  if (Number(verified.id) !== contactId || normalise(verified.email) !== email) throw new Error('Contact verification failed');

  const activityQuery = new URLSearchParams({client_id:String(contactId), category_id:String(categoryId), item_type:'note', expand:'1', order:'desc', per:'100'});
  const activities = rows(await propstack(`activities?${activityQuery}`, key));
  const marker = `SLS-Anforderungs-ID: ${requestId}`;
  const alreadyRecorded = activities.some(activity => {
    const task = activity.activatable || activity.task || activity;
    if (Number(activity.category_id ?? task.note_type_id) !== categoryId) return false;
    const sameRequest = String(task.body || activity.body || '').includes(marker);
    const created = Date.parse(activity.created_at || task.created_at || '');
    const recent = Number.isFinite(created) && Date.now() - created >= 0 && Date.now() - created < 10 * 60 * 1000;
    return sameRequest || recent;
  });
  if (alreadyRecorded) return;

  const retryKey = sign(`${email}:${requestId}`, key);
  if (uncertain.has(retryKey)) throw new Error('Previous note write needs reconciliation');
  // Retrying a timed-out write automatically could launch the future email process twice.
  uncertain.set(retryKey, Date.now() + 30 * 60 * 1000);
  const result = await propstack('tasks', key, {task:{
    title:NOTE,
    note_type_id:categoryId,
    client_ids:[contactId],
    body:[
      '<strong>Ratgeberanforderung über die SLS Website</strong>',
      `Ratgeber: ${TITLE}`,
      'Datei: SLS-Immobilie-verkaufen.pdf · Ausgabe Oktober 2026',
      `E-Mail für den angeforderten Versand: ${escapeHtml(email)}`,
      `Eingang: ${new Date().toISOString()}`,
      'Quelle: /downloads/',
      'Zweck: Bearbeitung und Versand des ausdrücklich angeforderten Ratgebers. Keine Newsletter-Anmeldung und keine allgemeine Werbeeinwilligung.',
      'Datenschutzhinweis im Formular: Ratgeberanforderung, Version 2026-10-01.',
      marker
    ].join('<br>')
  }});
  if (!validId(result?.id || result?.activity_id)) throw new Error('Note confirmation missing');
  uncertain.delete(retryKey);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!['GET','POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({error:'Methode nicht erlaubt.'});
  }
  const host = String(req.headers?.host || '').toLowerCase();
  // This launch stage is intentionally restricted to the preview deployment.
  const preview = process.env.VERCEL_ENV === 'preview' && /^[a-z0-9-]+\.vercel\.app$/.test(host);
  const local = process.env.NODE_ENV !== 'production' && /^localhost(?::\d+)?$/.test(host);
  if (!preview && !local) return res.status(403).json({error:'Ratgeberanforderungen sind hier noch nicht freigeschaltet.'});
  const key = process.env.PROPSTACK_GUIDES_API_KEY || process.env.PROPSTACK_INQUIRY_API_KEY || process.env.PROPSTACK_API_KEY;
  if (!key) return res.status(503).json({error:'Die Ratgeberanforderung ist gerade nicht verfügbar. Bitte kontaktieren Sie uns direkt.'});

  if (req.method === 'GET') {
    try {
      await noteType(key);
      return res.status(200).json({availableGuides:[GUIDE], token:issueToken(key), deliveryReady:false});
    } catch (error) {
      console.error('Guide request readiness check failed:', error.message);
      return res.status(503).json({error:'Die Ratgeberanforderung wird noch eingerichtet. Bitte versuchen Sie es später erneut.', ...(error.guideConfiguration ? {guideConfiguration:error.guideConfiguration} : {})});
    }
  }
  if (req.headers?.origin !== `https://${host}` && !(local && req.headers?.origin === `http://${host}`)) {
    return res.status(403).json({error:'Anfrage nicht erlaubt.'});
  }
  if (!req.headers?.['content-type']?.startsWith('application/json') || !req.body || typeof req.body !== 'object' || JSON.stringify(req.body).length > 3000) {
    return res.status(400).json({error:'Ungültige Anfrage.'});
  }
  const {guide, email:rawEmail, token, website} = req.body;
  const email = normalise(rawEmail);
  const requestId = verifyToken(token, key);
  if (guide !== GUIDE || typeof rawEmail !== 'string' || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || website || !requestId) {
    return res.status(400).json({error:'Bitte prüfen Sie Ihre E-Mail-Adresse. Falls das Formular länger geöffnet war, laden Sie die Seite erneut.'});
  }
  if (limited(req, key)) {
    res.setHeader('Retry-After', '900');
    return res.status(429).json({error:'Bitte warten Sie einige Minuten, bevor Sie erneut anfragen.'});
  }
  const lock = sign(`${email}:${GUIDE}`, key);
  try {
    if (!pending.has(lock)) {
      const work = (async () => recordRequest(key, email, await noteType(key), requestId))();
      pending.set(lock, work);
    }
    await pending.get(lock);
    return res.status(200).json({ok:true, message:received, deliveryReady:false});
  } catch (error) {
    console.error('Guide request could not be confirmed:', error.message);
    return res.status(502).json({error:'Ihre Anforderung konnte gerade nicht bestätigt werden. Bitte kontaktieren Sie uns direkt, bevor Sie sie erneut absenden.'});
  } finally {
    pending.delete(lock);
  }
}

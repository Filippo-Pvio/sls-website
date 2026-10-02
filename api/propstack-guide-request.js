import {createHmac, randomUUID, timingSafeEqual} from 'node:crypto';
import {GUIDE_MARKETING_CONSENT_TEXT, GUIDE_MARKETING_CONSENT_VERSION} from '../lib/guide-consent.mjs';
import {newsletterConfig, requestNewsletter} from '../lib/guide-newsletter.mjs';

const GUIDE = 'VERKAUF';
const NOTE = 'SLS_RATGEBER_VERKAUF_ANGEFORDERT';
const TITLE = 'Immobilie verkaufen. Mit einem guten Gefühl.';
const received = 'Vielen Dank! Sie erhalten Ihren Ratgeber in Kürze per E-Mail.';
const REVIEW = 'SLS_RATGEBER_VERKAUF_PRUEFUNG';
const reviewMessage = 'Ihre Anforderung wurde gespeichert. Wir konnten Ihre Angaben jedoch nicht eindeutig zuordnen. Bitte prüfen Sie Ihren Vor- und Nachnamen sowie Ihre E-Mail-Adresse. Sind die Angaben korrekt, kontaktieren Sie uns bitte kurz zur Klärung.';
const normaliseName = value => String(value || '').normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('de-DE');
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
  if (!response.ok) {
    const detail = await response.text();
    const fields = ['first_name','last_name','email','name','client','note_type_id'].filter(field => new RegExp(`\\b${field}\\b`, 'i').test(detail));
    // Only endpoint, status and known field names; never log response values or contact details.
    throw new Error(`Propstack ${payload ? 'POST' : 'GET'} ${path.split('?')[0].replace(/\/\d+/g, '/:id')} failed (${response.status}); validation fields: ${fields.join(',') || 'unspecified'}`);
  }
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
  // SLS category 741093 was checked against the live API. Its category is "for_notes";
  // Propstack's published examples also use "note" for note categories.
  const matches = types.filter(type => Number(type.id) === 741093 && normalise(type.name) === normalise(NOTE) && ['note','for_notes'].includes(normalise(type.category)));
  if (matches.length !== 1) throw new Error('Guide note category missing or ambiguous');
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

async function recordRequest(key, email, firstName, lastName, categoryId, requestId, marketingConsent = false) {
  const query = new URLSearchParams({email, archived:'-1', with_meta:'1', per:'100'});
  const contacts = rows(await propstack(`contacts?${query}`, key));
  // A secondary/shared email must not trigger delivery to a different primary address.
  if (contacts.length > 1 || (contacts.length === 1 && normalise(contacts[0].email) !== email)) {
    throw new Error('Contact could not be uniquely matched');
  }
  let contactId = Number(contacts[0]?.id);
  if (!contacts.length) {
    // Existing contacts are reused above. Supply names only for a new contact; never change consent fields.
    const contact = await propstack('contacts', key, {client:{email, first_name:firstName, last_name:lastName}});
    contactId = Number(contact.id);
  }
  if (!validId(contactId)) throw new Error('Contact ID missing');
  const verified = await propstack(`contacts/${contactId}`, key);
  if (Number(verified.id) !== contactId || normalise(verified.email) !== email) throw new Error('Contact verification failed');

  const needsReview = !normaliseName(verified.first_name) || !normaliseName(verified.last_name)
    || normaliseName(verified.first_name) !== normaliseName(firstName)
    || normaliseName(verified.last_name) !== normaliseName(lastName);
  const outcome = needsReview ? 'review_required' : 'recorded';
  // Separate review notes have no dispatch category. Never overwrite a contact to force a match.
  const fingerprint = sign(JSON.stringify([email, normaliseName(firstName), normaliseName(lastName), outcome, needsReview && marketingConsent]), key);
  const activityQuery = new URLSearchParams({client_id:String(contactId), item_type:'note', expand:'1', order:'desc', per:'100'});
  if (!needsReview) activityQuery.set('category_id', String(categoryId));
  const activities = rows(await propstack(`activities?${activityQuery}`, key));
  const marker = `SLS-Anforderungs-ID: ${requestId}`;
  const reviewMarker = `SLS-Prüfkennung: ${fingerprint}`;
  const alreadyRecorded = activities.some(activity => {
    const task = activity.activatable || activity.task || activity;
    if (needsReview) {
      if ((task.title || activity.title) !== REVIEW || !String(task.body || activity.body || '').includes(reviewMarker)) return false;
    } else if (Number(activity.category_id ?? task.note_type_id) !== categoryId) return false;
    const sameRequest = String(task.body || activity.body || '').includes(marker);
    const created = Date.parse(activity.created_at || task.created_at || '');
    const recent = Number.isFinite(created) && Date.now() - created >= 0 && Date.now() - created < 10 * 60 * 1000;
    return sameRequest || recent;
  });
  if (alreadyRecorded) return {outcome, contactId};

  const retryKey = sign(`${fingerprint}:${requestId}`, key);
  if (uncertain.has(retryKey)) throw new Error('Previous note write needs reconciliation');
  // Retrying a timed-out write automatically could launch the future email process twice.
  uncertain.set(retryKey, Date.now() + 30 * 60 * 1000);
  const result = await propstack('tasks', key, {task:{
    title:needsReview ? REVIEW : NOTE,
    ...(needsReview ? {} : {note_type_id:categoryId}),
    client_ids:[contactId],
    body:[
      '<strong>Ratgeberanforderung über die SLS Website</strong>',
      ...(needsReview ? [
        '<strong>PRÜFUNG ERFORDERLICH – KEIN VERSAND FREIGEGEBEN</strong>',
        'Die angegebenen Namen stimmen nicht eindeutig mit dem vorhandenen Kontakt überein. Kontakt unverändert. Keine Versand-Triggernotiz angelegt.',
        'Vor personalisiertem Versand Angaben mit der anfordernden Person klären. Danach Kontakt und neuere Anforderungen prüfen, gegebenenfalls Namen manuell berichtigen und Versand einmalig freigeben. Diese Prüfnotiz allein darf keinen Versand auslösen.',
        reviewMarker
      ] : []),
      `Ratgeber: ${TITLE}`,
      'Datei: SLS-Immobilie-verkaufen.pdf · Ausgabe Oktober 2026',
      `Angegebener Name: ${escapeHtml(firstName)} ${escapeHtml(lastName)}`,
      `E-Mail für den angeforderten Versand: ${escapeHtml(email)}`,
      `Eingang: ${new Date().toISOString()}`,
      'Quelle: /downloads/',
      'Zweck dieser Ratgebernotiz: Bearbeitung und Versand des ausdrücklich angeforderten Ratgebers. Diese Notiz ist kein Nachweis einer bestätigten Newsletter-Anmeldung.',
      ...(marketingConsent ? [
        'Freiwillige Marketing-Checkbox: aktiviert. Double-Opt-in noch nicht bestätigt; keine Marketingfreigabe durch die Formularübermittlung.',
        `Einwilligungstext (Version ${GUIDE_MARKETING_CONSENT_VERSION}): ${escapeHtml(GUIDE_MARKETING_CONSENT_TEXT)}`,
        ...(needsReview ? ['Auch die Newsletter-Anmeldung bleibt bis zur Klärung der Namensabweichung zurückgestellt.'] : [])
      ] : ['Freiwillige Marketing-Checkbox: nicht aktiviert. Keine neue Werbeeinwilligung; bestehende Einstellungen bleiben unverändert.']),
      'Datenschutzhinweis im Formular: Ratgeberanforderung, Version 2026-10-02.',
      marker
    ].join('<br>')
  }});
  if (!validId(result?.id || result?.activity_id)) throw new Error('Note confirmation missing');
  uncertain.delete(retryKey);
  return {outcome, contactId};
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
      const marketingConfig = await newsletterConfig(key, propstack).catch(() => null);
      return res.status(200).json({availableGuides:[GUIDE], token:issueToken(key), deliveryReady:true, marketingAvailable:Boolean(marketingConfig), consentVersion:GUIDE_MARKETING_CONSENT_VERSION});
    } catch (error) {
      console.error('Guide request readiness check failed:', error.message);
      return res.status(503).json({error:'Die Ratgeberanforderung wird noch eingerichtet. Bitte versuchen Sie es später erneut.'});
    }
  }
  if (req.headers?.origin !== `https://${host}` && !(local && req.headers?.origin === `http://${host}`)) {
    return res.status(403).json({error:'Anfrage nicht erlaubt.'});
  }
  if (!req.headers?.['content-type']?.startsWith('application/json') || !req.body || typeof req.body !== 'object' || JSON.stringify(req.body).length > 3000) {
    return res.status(400).json({error:'Ungültige Anfrage.'});
  }
  const {guide, email:rawEmail, firstName:rawFirstName, lastName:rawLastName, token, website, marketingConsent = false, consentVersion} = req.body;
  if (typeof marketingConsent !== 'boolean' || (marketingConsent && consentVersion !== GUIDE_MARKETING_CONSENT_VERSION)) {
    return res.status(400).json({error:'Bitte laden Sie das Formular erneut, um Ihre Newsletter-Auswahl zu bestätigen.'});
  }
  const firstName = typeof rawFirstName === 'string' ? rawFirstName.trim() : '';
  const lastName = typeof rawLastName === 'string' ? rawLastName.trim() : '';
  if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100 || /[\x00-\x1f\x7f]/.test(firstName + lastName)) {
    return res.status(400).json({error:'Bitte geben Sie Ihren Vor- und Nachnamen an (jeweils höchstens 100 Zeichen).'});
  }
  const email = normalise(rawEmail);
  const requestId = verifyToken(token, key);
  if (guide !== GUIDE || typeof rawEmail !== 'string' || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || website || !requestId) {
    return res.status(400).json({error:'Bitte prüfen Sie Ihre E-Mail-Adresse. Falls das Formular länger geöffnet war, laden Sie die Seite erneut.'});
  }
  if (limited(req, key)) {
    res.setHeader('Retry-After', '900');
    return res.status(429).json({error:'Bitte warten Sie einige Minuten, bevor Sie erneut anfragen.'});
  }
  const marketingConfig = marketingConsent ? await newsletterConfig(key, propstack).catch(() => null) : null;
  if (marketingConsent && !marketingConfig) return res.status(503).json({error:'Die Newsletter-Anmeldung ist noch nicht verfügbar. Sie können den Ratgeber ohne Newsletter-Anmeldung anfordern.'});
  const lock = sign(`${email}:${GUIDE}`, key);
  // Serialize all requests for an address, but do not reuse the result for different names.
  const previous = pending.get(lock);
  const work = (async () => {
    if (previous) await previous.catch(() => {});
    const result = await recordRequest(key, email, firstName, lastName, await noteType(key), requestId, marketingConsent);
    let newsletterStatus = marketingConsent ? 'review_required' : 'not_requested';
    if (marketingConsent && result.outcome === 'recorded') {
      try {
        newsletterStatus = await requestNewsletter({key, contactId:result.contactId, email, firstName, lastName, requestId, config:marketingConfig, propstack});
      } catch (error) {
        console.error('Newsletter confirmation request needs checking:', error.message);
        // Guide dispatch was already recorded. Do not present a total failure or encourage resending it.
        newsletterStatus = 'needs_check';
      }
    }
    return {outcome:result.outcome, newsletterStatus};
  })();
  pending.set(lock, work);
  try {
    const {outcome, newsletterStatus} = await work;
    const newsletterMessage = newsletterStatus === 'confirmation_requested'
      ? ' Für weitere Tipps und Angebote erhalten Sie eine separate Bestätigungsmail. Bitte bestätigen Sie darin Ihre Anmeldung.'
      : newsletterStatus === 'needs_check' ? ' Ihre zusätzliche Newsletter-Anmeldung konnte noch nicht bestätigt werden. Bitte kontaktieren Sie uns hierzu; Ihre Ratgeberanforderung ist bereits aufgenommen.' : '';
    return res.status(200).json({ok:true, status:outcome, newsletterStatus, message:outcome === 'review_required' ? reviewMessage : received + newsletterMessage, deliveryReady:true});
  } catch (error) {
    console.error('Guide request could not be confirmed:', error.message);
    return res.status(502).json({error:'Ihre Anforderung konnte gerade nicht bestätigt werden. Bitte kontaktieren Sie uns direkt, bevor Sie sie erneut absenden.'});
  } finally {
    if (pending.get(lock) === work) pending.delete(lock);
  }
}

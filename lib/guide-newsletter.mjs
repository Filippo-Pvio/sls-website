import {createHmac} from 'node:crypto';
import {GUIDE_MARKETING_CONSENT_TEXT, GUIDE_MARKETING_CONSENT_VERSION} from './guide-consent.mjs';

export const GUIDE_NEWSLETTER_SETUP = Object.freeze({snippetId:1115618, senderEmail:'service@sls.de'});

const REQUEST_TITLE = 'SLS_NEWSLETTER_DOI_ANGEFORDERT';
const SENT_TITLE = 'SLS_NEWSLETTER_DOI_VERSAND_BESTAETIGT';
const validId = value => /^\d+$/.test(String(value || '')) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const rows = result => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  throw new Error('Unexpected newsletter activity response');
};

export function newsletterConfig(env = process.env) {
  // The sender/template are configured, but public signup stays closed until the confirmation test passes.
  if (env.PROPSTACK_GUIDES_DOI_VERIFIED !== 'true') return null;
  const snippetId = env.PROPSTACK_GUIDES_DOI_SNIPPET_ID || GUIDE_NEWSLETTER_SETUP.snippetId;
  if (!validId(snippetId)) return null;
  if (env.PROPSTACK_GUIDES_DOI_BROKER_ID) {
    if (!validId(env.PROPSTACK_GUIDES_DOI_BROKER_ID)) return null;
    return {brokerId:Number(env.PROPSTACK_GUIDES_DOI_BROKER_ID), snippetId:Number(snippetId)};
  }
  return {senderEmail:GUIDE_NEWSLETTER_SETUP.senderEmail, snippetId:Number(snippetId)};
}

export async function resolveNewsletterSender(key, senderEmail, propstack) {
  const brokers = [];
  for (let page = 1; page <= 20; page++) {
    const response = await propstack(`brokers?per=100&page=${page}`,key);
    const batch = rows(response);
    const fresh = batch.filter(broker => !brokers.some(existing => String(existing.id) === String(broker.id)));
    brokers.push(...fresh);
    const total = Number(response?.meta?.total_count);
    if (!fresh.length || (Number.isFinite(total) ? brokers.length >= total : batch.length < 100)) break;
    if (page === 20) throw new Error('Sender lookup incomplete');
  }
  const matches = brokers.filter(broker => String(broker.email || '').trim().toLowerCase() === senderEmail.toLowerCase());
  if (matches.length !== 1 || !validId(matches[0].id)) throw new Error('Newsletter sender could not be uniquely resolved');
  return Number(matches[0].id);
}

export async function requestNewsletter({key, contactId, email, firstName, lastName, requestId, config, propstack}) {
  if (!config) throw new Error('Newsletter confirmation is not configured');
  const fingerprint = createHmac('sha256',key).update(JSON.stringify(['sls-newsletter', email, firstName.normalize('NFC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('de-DE'), lastName.normalize('NFC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('de-DE'), GUIDE_MARKETING_CONSENT_VERSION])).digest('base64url');
  const marker = `SLS-Newsletter-Anforderungs-ID: ${requestId}`;
  const identity = `SLS-Newsletter-Kennung: ${fingerprint}`;
  const query = new URLSearchParams({client_id:String(contactId), item_type:'note', expand:'1', order:'desc', per:'100'});
  const activities = rows(await propstack(`activities?${query}`,key));
  const matching = title => activities.some(activity => {
    const task = activity.activatable || activity.task || activity;
    const body = String(task.body || activity.body || '');
    const created = Date.parse(activity.created_at || task.created_at || '');
    const recent = Number.isFinite(created) && Date.now() - created >= 0 && Date.now() - created < 10 * 60 * 1000;
    return (task.title || activity.title) === title && body.includes(identity) && (body.includes(marker) || recent);
  });
  if (matching(SENT_TITLE)) return 'confirmation_requested';
  // A persisted intention with no confirmed send may represent a timeout after sending.
  // Do not send again blindly, even after a server restart.
  if (matching(REQUEST_TITLE)) return 'needs_check';
  const brokerId = config.brokerId || await resolveNewsletterSender(key,config.senderEmail,propstack);
  const evidence = await propstack('tasks',key,{task:{title:REQUEST_TITLE,client_ids:[contactId],body:[
    '<strong>Freiwillige Newsletter-Anmeldung – Bestätigung noch ausstehend</strong>',
    `Name: ${escapeHtml(firstName)} ${escapeHtml(lastName)}`,
    `E-Mail: ${escapeHtml(email)}`,
    `Zeitpunkt der Formularübermittlung: ${new Date().toISOString()}`,
    'Quelle: SLS Website /downloads/ – Marketing-Checkbox aktiv angekreuzt.',
    `Einwilligungstext, Version ${GUIDE_MARKETING_CONSENT_VERSION}: ${escapeHtml(GUIDE_MARKETING_CONSENT_TEXT)}`,
    'Noch kein Nachweis einer bestätigten E-Mail-Adresse. Diese Notiz darf keine Werbeserie starten. Newsletter und Kontakterlaubnis erst durch die bestätigte Anmeldung freigeben. Die Einwilligung betrifft ausschließlich die beschriebenen E-Mails, keine Telefonwerbung oder Immobilien-Suchprofile.',
    identity,marker
  ].join('<br>')}});
  if (!validId(evidence?.id || evidence?.activity_id)) throw new Error('Newsletter evidence not confirmed');
  const sent = await propstack('messages',key,{message:{broker_id:brokerId,snippet_id:config.snippetId,to:[email],client_ids:[contactId]}});
  if (sent?.ok === false || !validId(sent?.id)) throw new Error('Newsletter confirmation mail not confirmed');
  // This is a send receipt, NOT consent confirmation. Propstack handles the recipient's confirmation.
  try {
    const receipt = await propstack('tasks',key,{task:{title:SENT_TITLE,client_ids:[contactId],body:[
      '<strong>Bestätigungsmail zum Versand an Propstack übergeben</strong>',
      `Propstack-Nachrichten-ID: ${Number(sent.id)}`,
      `Zeitpunkt: ${new Date().toISOString()}`,
      'Double-Opt-in weiterhin unbestätigt. Versandannahme ist weder Zustellnachweis noch Marketingfreigabe.',
      identity,marker
    ].join('<br>')}});
    if (!validId(receipt?.id || receipt?.activity_id)) throw new Error('Newsletter send receipt not confirmed');
  } catch {
    // The email was accepted. Keep the persisted intention to prevent blind automatic resend.
    console.error('Newsletter confirmation mail accepted, send receipt needs reconciliation');
  }
  return 'confirmation_requested';
}

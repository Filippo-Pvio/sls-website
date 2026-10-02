import {createHmac} from 'node:crypto';
import {GUIDE_MARKETING_CONSENT_TEXT, GUIDE_MARKETING_CONSENT_VERSION} from './guide-consent.mjs';

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
  // Enable only after the actual Propstack confirmation form and withdrawal have been checked.
  if (env.PROPSTACK_GUIDES_DOI_VERIFIED !== 'true'
      || !validId(env.PROPSTACK_GUIDES_DOI_BROKER_ID)
      || !validId(env.PROPSTACK_GUIDES_DOI_SNIPPET_ID)) return null;
  return {brokerId:Number(env.PROPSTACK_GUIDES_DOI_BROKER_ID), snippetId:Number(env.PROPSTACK_GUIDES_DOI_SNIPPET_ID)};
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
  const sent = await propstack('messages',key,{message:{broker_id:config.brokerId,snippet_id:config.snippetId,to:[email],client_ids:[contactId]}});
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

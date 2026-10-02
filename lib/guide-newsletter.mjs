import {createHmac} from 'node:crypto';
import {GUIDE_MARKETING_CONSENT_TEXT, GUIDE_MARKETING_CONSENT_VERSION} from './guide-consent.mjs';

export const NEWSLETTER_NOTE = 'SLS_NEWSLETTER_DOI_ANGEFORDERT';
const uncertain = new Map();
const validId = value => /^\d+$/.test(String(value || '')) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const rows = result => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  throw new Error('Unexpected newsletter activity response');
};

// The user has configured the note automation in Propstack. Resolve its exact
// category before enabling the preview checkbox; missing/ambiguous categories fail closed.
export async function newsletterConfig(key, propstack) {
  const types = [];
  for (let page = 1; page <= 20; page++) {
    const response = await propstack(`activity_types?per=100&page=${page}`, key);
    const batch = rows(response);
    const fresh = batch.filter(type => !types.some(existing => String(existing.id) === String(type.id)));
    types.push(...fresh);
    const total = Number(response?.meta?.total_count);
    if (!fresh.length || (Number.isFinite(total) ? types.length >= total : batch.length < 100)) break;
    if (page === 20) throw new Error('Newsletter category lookup incomplete');
  }
  const matches = types.filter(type => type.name === NEWSLETTER_NOTE && ['note','for_notes'].includes(type.category));
  if (matches.length !== 1 || !validId(matches[0].id)) return null;
  return {noteTypeId:Number(matches[0].id)};
}

export async function requestNewsletter({key, contactId, email, firstName, lastName, salutation, requestId, config, propstack}) {
  if (!validId(config?.noteTypeId)) throw new Error('Newsletter confirmation is not configured');
  const fingerprint = createHmac('sha256',key).update(JSON.stringify(['sls-newsletter', email, firstName.normalize('NFC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('de-DE'), lastName.normalize('NFC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('de-DE'), GUIDE_MARKETING_CONSENT_VERSION])).digest('base64url');
  const marker = `SLS-Newsletter-Anforderungs-ID: ${requestId}`;
  const identity = `SLS-Newsletter-Kennung: ${fingerprint}`;
  const query = new URLSearchParams({client_id:String(contactId), item_type:'note', expand:'1', order:'desc', per:'100'});
  const activities = rows(await propstack(`activities?${query}`,key));
  const matching = activities.find(activity => {
    const task = activity.activatable || activity.task || activity;
    const body = String(task.body || activity.body || '');
    const created = Date.parse(activity.created_at || task.created_at || '');
    const recent = Number.isFinite(created) && Date.now() - created >= 0 && Date.now() - created < 10 * 60 * 1000;
    return (task.title || activity.title) === NEWSLETTER_NOTE && body.includes(identity) && (body.includes(marker) || recent);
  });
  if (matching) {
    const task = matching.activatable || matching.task || matching;
    // Old uncategorized API-send attempts are not proof of an automation trigger.
    return Number(matching.category_id ?? task.note_type_id) === config.noteTypeId ? 'confirmation_requested' : 'needs_check';
  }
  for (const [id, until] of uncertain) if (until < Date.now()) uncertain.delete(id);
  const retryKey = `${fingerprint}:${requestId}`;
  if (uncertain.has(retryKey)) return 'needs_check';
  // A timeout may occur after Propstack stored the trigger. Never blindly repeat it.
  uncertain.set(retryKey, Date.now() + 30 * 60 * 1000);
  const evidence = await propstack('tasks',key,{task:{title:NEWSLETTER_NOTE,note_type_id:config.noteTypeId,client_ids:[contactId],body:[
    '<strong>Freiwillige Newsletter-Anmeldung – Bestätigung noch ausstehend</strong>',
    `Anrede: ${salutation === 'mr' ? 'Herr' : 'Frau'}`,
    `Name: ${escapeHtml(firstName)} ${escapeHtml(lastName)}`,
    `E-Mail: ${escapeHtml(email)}`,
    `Zeitpunkt der Formularübermittlung: ${new Date().toISOString()}`,
    'Quelle: SLS Website /downloads/ – Marketing-Checkbox aktiv angekreuzt.',
    `Einwilligungstext, Version ${GUIDE_MARKETING_CONSENT_VERSION}: ${escapeHtml(GUIDE_MARKETING_CONSENT_TEXT)}`,
    'Diese Notiz löst ausschließlich die separate Bestätigungsmail über die eingerichtete Propstack-Automatisierung aus. Textbaustein 1115618, Absender service@sls.de.',
    'Noch kein Nachweis einer bestätigten E-Mail-Adresse. Diese Notiz darf keine Werbeserie starten. Newsletter und Kontakterlaubnis erst durch die bestätigte Anmeldung freigeben. Die Einwilligung betrifft ausschließlich die beschriebenen E-Mails, keine Telefonwerbung oder Immobilien-Suchprofile.',
    identity,marker
  ].join('<br>')}});
  if (!validId(evidence?.id || evidence?.activity_id)) throw new Error('Newsletter evidence not confirmed');
  uncertain.delete(retryKey);
  // Propstack owns sending and confirmation. A recorded trigger proves neither
  // delivery nor consent; the website never updates any contact permission field.
  return 'confirmation_requested';
}

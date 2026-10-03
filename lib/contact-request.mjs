export const CONTACT_TOPICS = Object.freeze({
  buyerfinder: {label:'Ich möchte passende Kaufinteressenten finden.', title:'Website | Käuferfinder | Eigentümeranfrage'},
  sale: {label:'Ich möchte verkaufen.', title:'Website Kontakt – Verkaufswunsch'},
  search: {label:'Ich suche eine Immobilie.', title:'Website Kontakt – Immobiliensuche'},
  valuation: {label:'Ich möchte wissen, was meine Immobilie wert ist.', title:'Website Kontakt – Bewertungsanfrage'},
  general: {label:'Ich möchte etwas anderes besprechen.', title:'Website Kontakt – Allgemeine Anfrage'}
});
export const CALLBACK_TITLE = 'Website Kontakt – Rückruf gewünscht';
export const CONTACT_WINDOWS = Object.freeze({morning:'Vormittags · 9–12 Uhr', midday:'Mittags · 12–14 Uhr', afternoon:'Nachmittags · 14–16 Uhr', late:'Später Nachmittag · 16–18 Uhr', evening:'Abends · 18–20 Uhr', flexible:'Zeitlich flexibel'});
export const CONTACT_PRIVACY_VERSION = '2026-10-03';
export const CONTACT_PRIVACY_TEXT = 'Ich habe die Datenschutzhinweise gelesen und stimme der Verarbeitung meiner Angaben zur Bearbeitung meiner Anfrage zu.';
const clean = (v,max) => typeof v === 'string' ? v.trim().slice(0,max) : '';
export function parseContactRequest(body) {
  const request = {topic:clean(body.topic,20), firstName:clean(body.firstName,100), lastName:clean(body.lastName,100), email:clean(body.email,254).toLowerCase(), phone:clean(body.phone,60), place:clean(body.place,150), message:clean(body.message,3000), method:clean(body.method,20), window:clean(body.window,20)};
  if (!Object.hasOwn(CONTACT_TOPICS,request.topic) || !request.firstName || !request.lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email) || !['email','callback'].includes(request.method) || body.privacy !== true || body.privacyVersion !== CONTACT_PRIVACY_VERSION) throw new Error('Bitte prüfen Sie Ihr Anliegen, die Pflichtfelder und die Datenschutzhinweise.');
  if (request.method === 'callback' && (!request.phone || !Object.hasOwn(CONTACT_WINDOWS,request.window))) throw new Error('Bitte geben Sie Ihre Telefonnummer und einen bevorzugten Rückrufzeitraum an.');
  if (request.topic === 'general' && !request.message) throw new Error('Bitte beschreiben Sie kurz Ihr Anliegen.');
  if (request.topic === 'buyerfinder') {
    const type=clean(body.propertyType,30), area=Number(body.area), rooms=Number(body.rooms);
    const price=body.price==='' || body.price==null ? null : Number(body.price);
    if (!['house','apartment','multi','land','commercial'].includes(type) || !request.place || !Number.isFinite(area) || area<=0 || area>1000000 || !Number.isFinite(rooms) || rooms<0 || rooms>1000 || ((type==='house'||type==='apartment'||type==='multi') && rooms<1) || (price!==null && (!Number.isFinite(price)||price<=0||price>1000000000))) throw new Error('Bitte prüfen Sie Immobilienart, Ort, Fläche, Zimmer und Preisvorstellung.');
    request.property={type,area,rooms,price};
  }
  if (request.method !== 'callback') request.window = '';
  return request;
}
const escape = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function contactNoteBody(request,id) {
  return [
    '<strong>Kontaktanfrage über die SLS Website</strong>',
    `Anliegen: ${escape(CONTACT_TOPICS[request.topic].label)}`,
    `Name: ${escape(request.firstName)} ${escape(request.lastName)}`,
    `E-Mail: ${escape(request.email)}`,
    `Telefon: ${escape(request.phone || 'Nicht angegeben')}`,
    `Gewünschter Kontaktweg: ${request.method === 'callback' ? 'Telefonischer Rückruf' : 'E-Mail'}`,
    ...(request.method === 'callback' ? [`Bevorzugtes Rückrufzeitfenster: ${escape(CONTACT_WINDOWS[request.window])}`, 'Zeitfenster ist ein Kundenwunsch, kein verbindlicher Termin.'] : []),
    ...(request.place ? [`Ort / Lage: ${escape(request.place)}`] : []),
    `Nachricht: ${escape(request.message || 'Keine zusätzliche Nachricht').replace(/\n/g,'<br>')}`,
    `Eingang: ${new Date().toISOString()}`,
    ...(request.property ? [
      `Immobilienart: ${escape({house:'Haus',apartment:'Wohnung',multi:'Mehrfamilienhaus',land:'Grundstück',commercial:'Gewerbe'}[request.property.type])}`,
      `${request.property.type==='land' ? 'Grundstücksfläche' : request.property.type==='commercial' ? 'Nutzfläche' : 'Wohnfläche'}: ${request.property.area} m²`,
      `Zimmer: ${request.property.rooms || 'Nicht zutreffend'}`,
      `Preisvorstellung: ${request.property.price===null ? 'Noch offen' : request.property.price+' EUR'}`,
      'Persönlicher Nachfragecheck angefragt. Ein vorab angezeigter Suchprofilabgleich ist eine unverbindliche Ersteinschätzung und keine bestätigte Kaufabsicht.'
    ] : []),
    `Quelle: ${request.topic==='buyerfinder' ? '/kaeuferfinder/' : '/kontakt/'}`,
    `Datenschutzhinweise aktiv bestätigt (Version ${CONTACT_PRIVACY_VERSION}): ${escape(CONTACT_PRIVACY_TEXT)}`,
    'Datenschutzerklärung: https://sls.de/datenschutz/',
    'Zweck: Bearbeitung dieser Kontaktanfrage. Keine Newsletter- oder allgemeine Werbeeinwilligung. Bestehende Kontaktdaten und Einwilligungen bleiben unverändert.',
    `SLS-Kontaktanfrage-ID: ${id}`
  ].join('<br>');
}

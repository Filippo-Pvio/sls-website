export const CAREER_RECIPIENT = 'bewerbung@sls.de';
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 3 * 1024 * 1024;
export const MAX_BODY_BYTES = 4 * 1024 * 1024 + 24000;
export const FILE_FIELDS = ['cv', 'letter', 'certificates', 'other'];
export const AREAS = ['Initiativbewerbung', 'Immobilienberatung & Vertrieb', 'Telesales', 'Organisation & Back Office', 'Marketing & Kommunikation'];
const invalid = message => { throw Object.assign(new Error(message), {status:400}); };
const line = (v, max, required = false) => {
  if (v == null && !required) return '';
  if (typeof v !== 'string' || v.length > max || /[\x00-\x1f\x7f]/.test(v)) invalid('Bitte prüfen Sie Ihre Kontaktdaten.');
  const result = v.normalize('NFC').trim();
  if (required && !result) invalid('Bitte füllen Sie die Pflichtfelder aus.');
  return result;
};
function validDocx(buffer) {
  // Read the ZIP directory without extracting or expanding applicant files.
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0 || buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6)) return false;
  const count = buffer.readUInt16LE(end + 10), size = buffer.readUInt32LE(end + 12), offset = buffer.readUInt32LE(end + 16);
  if (!count || count > 2000 || offset + size !== end || end + 22 + buffer.readUInt16LE(end + 20) !== buffer.length) return false;
  let pos = offset, expanded = 0; const names = [];
  for (let n = 0; n < count; n++) {
    if (pos + 46 > end || buffer.readUInt32LE(pos) !== 0x02014b50) return false;
    const flags = buffer.readUInt16LE(pos + 8), length = buffer.readUInt16LE(pos + 28), extra = buffer.readUInt16LE(pos + 30), comment = buffer.readUInt16LE(pos + 32);
    if (flags & 1 || pos + 46 + length + extra + comment > end) return false;
    expanded += buffer.readUInt32LE(pos + 24);
    if (expanded > 40 * 1024 * 1024) return false;
    const name = buffer.subarray(pos + 46, pos + 46 + length).toString('utf8');
    if (name.includes('..') || name.startsWith('/') || /vbaProject|embeddings\/|\.exe$|\.js$|\.vbs$/i.test(name)) return false;
    names.push(name); pos += 46 + length + extra + comment;
  }
  return pos === end && names.includes('[Content_Types].xml') && names.includes('word/document.xml');
}
function fileContent(file) {
  if (!file || typeof file !== 'object') invalid('Bitte wählen Sie gültige Bewerbungsunterlagen aus.');
  const name = line(file.name, 140, true);
  if (/[\\/<>]/.test(name)) invalid('Bitte verwenden Sie einen einfachen Dateinamen.');
  const extension = name.split('.').pop().toLowerCase();
  if (!['pdf','doc','docx'].includes(extension)) invalid('Bitte laden Sie PDF-, DOC- oder DOCX-Dateien hoch.');
  if (typeof file.content !== 'string' || file.content.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.content)) invalid('Eine Datei ist zu groß oder beschädigt.');
  const bytes = Buffer.from(file.content, 'base64');
  if (!bytes.length || bytes.length > MAX_FILE_BYTES || bytes.toString('base64') !== file.content) invalid('Eine Datei ist zu groß oder beschädigt.');
  let type;
  if (extension === 'pdf') {
    const text = bytes.toString('latin1');
    if (!text.startsWith('%PDF-') || !text.slice(-2048).includes('%%EOF') || /\/(JavaScript|JS|Launch|EmbeddedFile)\b/.test(text)) invalid('Bitte verwenden Sie eine PDF-Datei ohne aktive oder eingebettete Inhalte.');
    type = 'application/pdf';
  } else if (extension === 'doc') {
    if (!bytes.subarray(0,8).equals(Buffer.from('d0cf11e0a1b11ae1','hex')) || !bytes.includes(Buffer.from('WordDocument','utf16le')) || bytes.includes(Buffer.from('_VBA_PROJECT','utf16le'))) invalid('Bitte verwenden Sie ein gültiges Word-Dokument ohne Makros.');
    type = 'application/msword';
  } else {
    if (bytes.length < 22 || !validDocx(bytes)) invalid('Bitte verwenden Sie eine gültige DOCX-Datei ohne Makros oder eingebettete Dateien.');
    type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return {name, content:file.content, type, size:bytes.length};
}
export function parseApplication(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('Die Bewerbung konnte nicht gelesen werden.');
  const firstName = line(body.firstName,80,true), lastName = line(body.lastName,100,true), email = line(body.email,254,true), phone = line(body.phone,40);
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) invalid('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
  const area = line(body.area,80) || AREAS[0];
  if (!AREAS.includes(area)) invalid('Bitte wählen Sie einen Tätigkeitsbereich aus.');
  const message = body.message == null ? '' : body.message;
  if (typeof message !== 'string' || message.length > 3000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(message)) invalid('Bitte kürzen oder prüfen Sie Ihre Nachricht.');
  if (body.privacy !== true) invalid('Bitte bestätigen Sie, dass Sie die Datenschutzhinweise gelesen haben.');
  if (typeof body.website !== 'string' || body.website.trim()) invalid('Die Bewerbung konnte nicht verarbeitet werden.');
  if (!Array.isArray(body.files) || body.files.length < 1 || body.files.length > 4) invalid('Bitte laden Sie mindestens Ihren Lebenslauf hoch.');
  const fields = new Set(); let total = 0;
  const files = body.files.map(file => {
    if (!FILE_FIELDS.includes(file.field) || fields.has(file.field)) invalid('Bitte laden Sie je Uploadbereich eine Datei hoch.');
    fields.add(file.field); const clean = fileContent(file); total += clean.size;
    return {field:file.field,...clean};
  });
  if (!fields.has('cv')) invalid('Bitte laden Sie Ihren Lebenslauf hoch.');
  if (total > MAX_TOTAL_BYTES) invalid('Ihre Unterlagen dürfen zusammen höchstens 3 MB groß sein.');
  return {firstName,lastName,email,phone,area,message:message.trim(),files};
}
export function careerConfigured(env) {
  const guid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
  return env.CAREER_PRIVACY_APPROVED === '1' && guid.test(env.CAREER_M365_TENANT_ID || '') && guid.test(env.CAREER_M365_CLIENT_ID || '') && String(env.CAREER_M365_CLIENT_SECRET || '').length >= 16 && String(env.CAREER_TOKEN_SECRET || '').length >= 32;
}
export async function sendApplication(application, reference, {env=process.env, request=fetch}={}) {
  const tokenResponse = await request(`https://login.microsoftonline.com/${env.CAREER_M365_TENANT_ID}/oauth2/v2.0/token`, {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, redirect:'error', signal:AbortSignal.timeout(10000),
    body:new URLSearchParams({client_id:env.CAREER_M365_CLIENT_ID,client_secret:env.CAREER_M365_CLIENT_SECRET,scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'})
  });
  if (!tokenResponse.ok) throw new Error('Mail authentication unavailable');
  const token = await tokenResponse.json();
  if (!token.access_token) throw new Error('Mail authentication unavailable');
  const labels = {cv:'Lebenslauf',letter:'Anschreiben',certificates:'Zeugnisse',other:'Weitere Unterlagen'};
  const message = {
    subject:`Bewerbung · ${application.area} · ${reference}`,
    body:{contentType:'Text',content:[`Bewerbung über die SLS Immobilienpartner Karriereseite`,`Referenz: ${reference}`,`Name: ${application.firstName} ${application.lastName}`,`E-Mail: ${application.email}`,`Telefon: ${application.phone || 'nicht angegeben'}`,`Bereich: ${application.area}`,`\nNachricht:\n${application.message || 'nicht angegeben'}`,`\nUnterlagen:\n${application.files.map(f=>`${labels[f.field]}: ${f.name}`).join('\n')}`,`\nDatenschutzhinweise zur Kenntnis genommen. Kein Bewerberpool- oder Werbeeinverständnis.`,`Nach Abschluss des Verfahrens Löschfrist im Personalpostfach und in allen Kopien vormerken.`].join('\n')},
    toRecipients:[{emailAddress:{address:CAREER_RECIPIENT}}], replyTo:[{emailAddress:{address:application.email}}],
    attachments:application.files.map(file=>({'@odata.type':'#microsoft.graph.fileAttachment',name:`${labels[file.field]}-${file.name}`,contentType:file.type,contentBytes:file.content}))
  };
  // Only the fixed SLS recruitment mailbox can send or receive this application's mail.
  const response = await request(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(CAREER_RECIPIENT)}/sendMail`, {method:'POST',headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(20000),body:JSON.stringify({message,saveToSentItems:false})});
  if (response.status !== 202) throw new Error('Mail acceptance unconfirmed');
}

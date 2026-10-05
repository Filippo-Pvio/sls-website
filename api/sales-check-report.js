const BRAND = {
  blue: [0.204, 0.357, 0.431],
  coral: [1, 0.349, 0.435],
  dark: [0.14, 0.22, 0.26],
  muted: [0.38, 0.46, 0.50],
  light: [0.94, 0.96, 0.97],
  white: [1,1,1]
};

const clampText = (value, max = 4000) => String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const latin = value => String(value ?? '')
  .replace(/[–—]/g, '-').replace(/[„“”]/g, '"').replace(/[’]/g, "'").replace(/…/g, '...')
  .replace(/€/g, 'EUR').replace(/→/g, '->');

const pdfEscape = value => latin(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const bytes = value => Uint8Array.from([...String(value)].map(ch => {
  const code = ch.charCodeAt(0);
  return code <= 255 ? code : 63;
}));
const concat = arrays => {
  const length = arrays.reduce((sum, item) => sum + item.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  arrays.forEach(item => { out.set(item, offset); offset += item.length; });
  return out;
};
const wrap = (value, max = 82) => {
  const words = latin(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach(word => {
    const candidate = line ? line + ' ' + word : word;
    if (candidate.length > max && line) { lines.push(line); line = word; }
    else line = candidate;
  });
  if (line) lines.push(line);
  return lines.length ? lines : [''];
};

function buildPdf(report, contact) {
  const pages = [[]];
  let page = 0;
  let y = 735;

  const addRaw = cmd => pages[page].push({ raw: cmd });
  const ensure = height => {
    if (y - height >= 64) return;
    pages.push([]); page += 1; y = 760;
    header(false);
  };
  const color = arr => arr.join(' ');
  const line = (text, { size = 10, bold = false, x = 54, leading = 14, fill = BRAND.dark } = {}) => {
    ensure(leading + 4);
    pages[page].push({ text: pdfEscape(text), size, bold, x, y, fill });
    y -= leading;
  };
  const wrapped = (text, opts = {}) => wrap(text, opts.max || 82).forEach(row => line(row, opts));
  const gap = amount => { ensure(amount); y -= amount; };
  const rect = (x, ry, w, h, fill) => addRaw(color(fill) + ' rg\n' + x + ' ' + ry + ' ' + w + ' ' + h + ' re f\n');

  function header(first = true) {
    rect(0, 762, 595, 80, BRAND.blue);
    rect(0, 758, 595, 4, BRAND.coral);
    pages[page].push({ text: 'SLS', size: 28, bold: true, x: 54, y: 800, fill: BRAND.white });
    pages[page].push({ text: 'IMMOBILIENPARTNER', size: 8, bold: true, x: 54, y: 783, fill: BRAND.white });
    pages[page].push({ text: first ? 'PERSÖNLICHE VERKAUFSANALYSE' : 'VERKAUFSANALYSE · FORTSETZUNG', size: 9, bold: true, x: 342, y: 791, fill: BRAND.white });
    y = 724;
  }

  header(true);
  line('Ihre persönliche Verkaufsanalyse', { size: 21, bold: true, leading: 30, fill: BRAND.blue });
  wrapped('Ihre individuelle Übersicht zeigt, welche Punkte vor Vermarktung, Notartermin und Übergabe noch geklärt werden sollten – kompakt, priorisiert und mit Bezugsquellen.', { size: 10, leading: 15, fill: BRAND.muted, max: 84 });
  gap(10);

  rect(54, y - 58, 487, 58, BRAND.light);
  line('Auswertung fuer', { size: 8, bold: true, x: 68, leading: 13, fill: BRAND.muted });
  line((contact.firstName + ' ' + contact.lastName).trim(), { size: 12, bold: true, x: 68, leading: 15, fill: BRAND.blue });
  line('Immobilie: ' + (report.type || 'Immobilie') + '   |   Situation: ' + (report.situation || 'Verkauf') + '   |   Stand: ' + (report.date || ''), { size: 8, x: 68, leading: 15, fill: BRAND.muted });
  gap(12);

  const contradictions = Array.isArray(report.contradictions) ? report.contradictions : [];
  if (contradictions.length) {
    line('Bitte gegenprüfen', { size: 13, bold: true, leading: 20, fill: BRAND.coral });
    contradictions.forEach(item => {
      wrapped(clampText(item.title, 180), { size: 10, bold: true, leading: 14, fill: BRAND.blue });
      wrapped(clampText(item.text, 900), { size: 9, x: 64, leading: 13, fill: BRAND.dark, max: 78 });
      gap(6);
    });
    gap(4);
  }

  const phases = Array.isArray(report.phases) ? report.phases : [];
  if (!phases.length) {
    line('Aktuell keine offenen Punkte aus dem Check', { size: 13, bold: true, leading: 19, fill: BRAND.blue });
    wrapped('Die abgefragten Punkte wirken weitgehend geklärt. Vor dem nächsten Schritt sollten Unterlagen und Nachweise dennoch noch einmal auf Aktualität und Vollständigkeit geprüft werden.', { size: 9, leading: 14, fill: BRAND.dark });
    gap(8);
  }

  phases.forEach(section => {
    line(clampText(section.label, 120), { size: 13, bold: true, leading: 20, fill: BRAND.blue });
    (Array.isArray(section.items) ? section.items : []).forEach(item => {
      const prefix = item.status === 'critical' ? 'WICHTIG' : item.status === 'unsure' ? 'UNSICHER' : 'OFFEN';
      wrapped(prefix + ': ' + clampText(item.label, 240), { size: 10, bold: item.status === 'critical', x: 62, leading: 14, fill: item.status === 'critical' ? BRAND.coral : BRAND.dark, max: 78 });
      wrapped('Nächster Schritt: ' + clampText(item.label, 220) + ' prüfen, beschaffen oder verbindlich klären.', { size: 8, x: 72, leading: 12, fill: BRAND.muted, max: 74 });
      if (item.source) wrapped('Bezugsquelle: ' + clampText(item.source, 300), { size: 8, x: 72, leading: 12, fill: BRAND.muted, max: 74 });
      gap(5);
    });
    gap(7);
  });

  line('Wichtiger Hinweis', { size: 11, bold: true, leading: 17, fill: BRAND.blue });
  wrapped('Diese Auswertung dient als praktische Orientierung. Sie ersetzt keine individuelle rechtliche, steuerliche oder finanzielle Beratung. Anforderungen von Banken, Notariaten oder Behörden können im Einzelfall abweichen.', { size: 8, leading: 12, fill: BRAND.muted });
  gap(14);
  line('Sie möchten die offenen Punkte persönlich einordnen?', { size: 10, bold: true, leading: 15, fill: BRAND.blue });
  wrapped('SLS Immobilienpartner begleitet Sie vom ersten Überblick bis zur Übergabe – persönlich, strukturiert und mit einem klaren nächsten Schritt.', { size: 8, leading: 12, fill: BRAND.muted, max: 82 });
  gap(8);
  line('SLS Immobilienpartner GmbH  ·  www.sls.de  ·  service@sls.de  ·  02369 742 80 20', { size: 8, bold: true, fill: BRAND.blue });

  const objects = [];
  const count = 4 + pages.length * 2;
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Kids [ ' + pages.map((_, i) => (5 + i * 2) + ' 0 R').join(' ') + ' ] /Count ' + pages.length + ' >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  pages.forEach((items, i) => {
    const pageId = 5 + i * 2;
    const contentId = 6 + i * 2;
    let stream = '';
    items.forEach(item => {
      if (item.raw) { stream += item.raw; return; }
      stream += color(item.fill) + ' rg\nBT /' + (item.bold ? 'F2' : 'F1') + ' ' + item.size + ' Tf 1 0 0 1 ' + item.x + ' ' + item.y + ' Tm (' + item.text + ') Tj ET\n';
    });
    const streamBytes = bytes(stream);
    objects[pageId] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + contentId + ' 0 R >>';
    objects[contentId] = { streamBytes };
  });

  const chunks = [Uint8Array.from([37,80,68,70,45,49,46,52,10,37,226,227,207,211,10])];
  const offsets = [0];
  let cursor = chunks[0].length;
  for (let i = 1; i <= count; i++) {
    offsets[i] = cursor;
    const head = bytes(i + ' 0 obj\n');
    let body;
    if (typeof objects[i] === 'object') {
      const h = bytes('<< /Length ' + objects[i].streamBytes.length + ' >>\nstream\n');
      const t = bytes('\nendstream');
      body = concat([h, objects[i].streamBytes, t]);
    } else body = bytes(objects[i]);
    const tail = bytes('\nendobj\n');
    const obj = concat([head, body, tail]);
    chunks.push(obj); cursor += obj.length;
  }
  const xrefOffset = cursor;
  let xref = 'xref\n0 ' + (count + 1) + '\n0000000000 65535 f \n';
  for (let i = 1; i <= count; i++) xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  xref += 'trailer\n<< /Size ' + (count + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF';
  chunks.push(bytes(xref));
  return concat(chunks);
}

const htmlEscape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function buildEmailHtml(contact) {
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
  const logoUrl = 'https://raw.githubusercontent.com/Filippo-Pvio/sls-website/main/assets/logo-sls-horizontal-transparent.png';
  return '<!doctype html><html><body style="margin:0;background:#f3f6f7;font-family:Arial,Helvetica,sans-serif;color:#24383f">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0">Ihre persönliche SLS Verkaufsanalyse ist da.</div>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f7;padding:32px 12px"><tr><td align="center">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;background:#ffffff;border-collapse:separate;border-spacing:0;border-radius:18px;overflow:hidden;box-shadow:0 12px 38px rgba(36,56,63,.10)">' +
    '<tr><td style="padding:30px 38px 24px;border-top:5px solid #ff596f;background:#ffffff">' +
      '<img src="' + logoUrl + '" width="220" alt="SLS Immobilienpartner" style="display:block;width:220px;max-width:70%;height:auto;border:0">' +
    '</td></tr>' +
    '<tr><td style="padding:16px 38px 10px">' +
      '<div style="font-size:12px;line-height:1.3;letter-spacing:1.6px;color:#ff596f;font-weight:700;text-transform:uppercase">Ihre persönliche Verkaufsanalyse</div>' +
      '<h1 style="font-family:Georgia,Times,serif;font-size:31px;line-height:1.2;color:#345b6e;margin:12px 0 20px;font-weight:500">Guten Tag ' + htmlEscape(fullName) + ',</h1>' +
      '<p style="font-size:15px;line-height:1.7;margin:0 0 16px;color:#344b55">vielen Dank für Ihre Angaben im SLS Verkaufscheck. Im Anhang finden Sie Ihre persönliche Verkaufsanalyse als PDF.</p>' +
      '<p style="font-size:15px;line-height:1.7;margin:0 0 22px;color:#344b55">Die Auswertung ordnet Ihre offenen Punkte nach Verkaufsphase, zeigt konkrete nächste Schritte und nennt – soweit möglich – die passende Bezugsquelle.</p>' +
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#f5f7f6;border-radius:12px"><tr><td style="padding:18px 20px">' +
        '<div style="font-size:13px;font-weight:700;color:#345b6e;margin-bottom:7px">In Ihrer PDF finden Sie:</div>' +
        '<div style="font-size:14px;line-height:1.65;color:#536a74">• Vor der Vermarktung klären<br>• Vor dem Notartermin klären<br>• Vor Übergabe / nach Kaufpreisfälligkeit klären</div>' +
      '</td></tr></table>' +
      '<a href="https://sls.de/kontakt/" style="display:inline-block;background:#345b6e;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:999px;font-size:14px;font-weight:700">Verkauf mit SLS besprechen</a>' +
    '</td></tr>' +
    '<tr><td style="padding:30px 38px 34px">' +
      '<div style="height:1px;background:#e3eaed;margin-bottom:24px"></div>' +
      '<div style="font-size:14px;line-height:1.7;color:#345b6e;font-weight:700">SLS Immobilienpartner GmbH</div>' +
      '<div style="font-size:13px;line-height:1.7;color:#5d7078;margin-top:4px">02369 742 80 20 &nbsp;·&nbsp; <a href="mailto:service@sls.de" style="color:#345b6e;text-decoration:none">service@sls.de</a> &nbsp;·&nbsp; <a href="https://sls.de/" style="color:#345b6e;text-decoration:none">www.sls.de</a></div>' +
      '<div style="font-size:12px;line-height:1.65;color:#7a8b92;margin-top:10px">Dorsten · Ubierweg 2 · 46286 Dorsten<br>Düsseldorf · Königsallee 19 · 40213 Düsseldorf</div>' +
      '<div style="font-size:11px;line-height:1.55;color:#8a989e;margin-top:18px">Diese Auswertung dient der Orientierung und ersetzt keine individuelle rechtliche, steuerliche oder finanzielle Beratung.</div>' +
    '</td></tr>' +
    '<tr><td style="background:#345b6e;height:10px;font-size:0;line-height:0">&nbsp;</td></tr>' +
    '</table></td></tr></table></body></html>';
}

async function rateLimit(req, email) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return true;
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const hour = Math.floor(Date.now() / 3600000);
  const keys = [
    'sales-check:ip:' + ip + ':' + hour,
    'sales-check:mail:' + String(email || '').toLowerCase() + ':' + hour
  ];
  try {
    for (const key of keys) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(['INCR', key])
      });
      if (!response.ok) continue;
      const data = await response.json();
      const count = Number(data?.result || 0);
      if (count === 1) {
        await fetch(url, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify(['EXPIRE', key, 3700])
        }).catch(() => {});
      }
      if (count > 4) return false;
    }
  } catch (error) {
    console.error('sales-check-report: rate limit unavailable', error);
  }
  return true;
}

async function getGraphAccessToken() {
  const tenantId = process.env.MS_GRAPH_TENANT_ID;
  const clientId = process.env.MS_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) {
    const error = new Error('Microsoft Graph credentials missing');
    error.code = 'GRAPH_CONFIG_MISSING';
    throw error;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch('https://login.microsoftonline.com/' + encodeURIComponent(tenantId) + '/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    console.error('sales-check-report: graph token error', response.status, data?.error || data?.error_description || 'unknown');
    const error = new Error('Microsoft Graph token unavailable');
    error.code = 'GRAPH_AUTH_FAILED';
    throw error;
  }
  return data.access_token;
}

async function sendViaMicrosoftGraph({ to, subject, html, attachmentBase64 }) {
  const sender = process.env.MS_GRAPH_SENDER || 'service@sls.de';
  const accessToken = await getGraphAccessToken();
  const payload = {
    message: {
      subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: [{ emailAddress: { address: to } }],
      attachments: [{
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: 'SLS-Verkaufsanalyse.pdf',
        contentType: 'application/pdf',
        contentBytes: attachmentBase64
      }]
    },
    saveToSentItems: true
  };

  const response = await fetch('https://graph.microsoft.com/v1.0/users/' + encodeURIComponent(sender) + '/sendMail', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('sales-check-report: graph sendMail error', response.status, text.slice(0, 800));
    const error = new Error('Microsoft Graph send failed');
    error.code = 'GRAPH_SEND_FAILED';
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Methode nicht erlaubt.' });
  }

  const contact = {
    firstName: clampText(req.body?.contact?.firstName, 80),
    lastName: clampText(req.body?.contact?.lastName, 80),
    email: clampText(req.body?.contact?.email, 160).toLowerCase(),
    phone: clampText(req.body?.contact?.phone, 60)
  };
  const report = req.body?.report && typeof req.body.report === 'object' ? req.body.report : null;

  if (!contact.firstName || !contact.lastName || !validEmail(contact.email) || !report) {
    return res.status(400).json({ message: 'Bitte prüfen Sie Ihre Kontaktdaten und versuchen Sie es erneut.' });
  }

  if (!(await rateLimit(req, contact.email))) {
    return res.status(429).json({ message: 'Bitte warten Sie etwas, bevor Sie eine weitere Auswertung anfordern.' });
  }

  if (!process.env.MS_GRAPH_TENANT_ID || !process.env.MS_GRAPH_CLIENT_ID || !process.env.MS_GRAPH_CLIENT_SECRET) {
    console.error('sales-check-report: Microsoft Graph credentials missing');
    return res.status(503).json({ message: 'Der E-Mail-Versand wird gerade eingerichtet. Bitte versuchen Sie es später erneut.' });
  }

  try {
    const pdf = buildPdf(report, contact);
    const pdfBase64 = Buffer.from(pdf).toString('base64');

    await sendViaMicrosoftGraph({
      to: contact.email,
      subject: 'Ihre persönliche SLS Verkaufsanalyse',
      html: buildEmailHtml(contact),
      attachmentBase64: pdfBase64
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('sales-check-report:', error);
    const status = error?.code === 'GRAPH_CONFIG_MISSING' ? 503 : 502;
    return res.status(status).json({ message: 'Die E-Mail konnte gerade nicht versendet werden. Bitte versuchen Sie es später erneut.' });
  }
}

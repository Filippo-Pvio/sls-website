import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const BRAND = {
  blue: rgb(0.204, 0.357, 0.431),
  coral: rgb(1, 0.349, 0.435),
  dark: rgb(0.14, 0.22, 0.26),
  muted: rgb(0.38, 0.46, 0.50),
  light: rgb(0.965, 0.973, 0.972),
  line: rgb(0.88, 0.91, 0.92),
  white: rgb(1, 1, 1)
};

const clampText = (value, max = 4000) => String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const pdfText = value => String(value ?? '')
  .replace(/[–—]/g, '-')
  .replace(/[„“”]/g, '"')
  .replace(/[’]/g, "'")
  .replace(/…/g, '...')
  .replace(/→/g, '->')
  .trim();

function wrapPdfText(value, font, size, maxWidth) {
  const words = pdfText(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

async function buildPdf(report, contact) {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  let logo = null;
  try {
    const response = await fetch('https://raw.githubusercontent.com/Filippo-Pvio/sls-website/main/assets/logo-sls-horizontal-transparent.png');
    if (response.ok) logo = await pdfDoc.embedPng(await response.arrayBuffer());
  } catch (error) {
    console.error('sales-check-report: logo unavailable', error);
  }

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const M = 52;
  const CONTENT_W = PAGE_W - M * 2;
  const FOOTER_H = 66;

  let page;
  let y = 0;

  const drawFooter = target => {
    const note = 'Hinweis: Diese Auswertung dient der Orientierung und ersetzt keine individuelle rechtliche, steuerliche oder finanzielle Beratung.';
    target.drawText(note, { x: M, y: 58, size: 6.3, font: regular, color: BRAND.muted });
    target.drawLine({ start: { x: M, y: 45 }, end: { x: PAGE_W - M, y: 45 }, thickness: 0.7, color: BRAND.line });
    target.drawText('SLS Immobilienpartner GmbH', { x: M, y: 28, size: 7.6, font: bold, color: BRAND.blue });
    const right = 'www.sls.de  |  service@sls.de  |  02369 742 80 20';
    target.drawText(right, { x: PAGE_W - M - regular.widthOfTextAtSize(right, 7.4), y: 28, size: 7.4, font: regular, color: BRAND.muted });
  };

  const drawHeader = (target, first) => {
    target.drawRectangle({ x: 0, y: PAGE_H - 5, width: PAGE_W, height: 5, color: BRAND.coral });
    if (logo) {
      const dims = logo.scale(1);
      const logoW = 148;
      const logoH = logoW * (dims.height / dims.width);
      target.drawImage(logo, { x: M, y: PAGE_H - 46 - logoH / 2, width: logoW, height: logoH });
    } else {
      target.drawText('SLS IMMOBILIENPARTNER', { x: M, y: PAGE_H - 39, size: 15, font: bold, color: BRAND.blue });
    }
    const kicker = first ? 'PERSÖNLICHE VERKAUFSANALYSE' : 'VERKAUFSANALYSE | FORTSETZUNG';
    target.drawText(kicker, {
      x: PAGE_W - M - bold.widthOfTextAtSize(kicker, 8.6),
      y: PAGE_H - 37,
      size: 8.6,
      font: bold,
      color: BRAND.blue
    });
    target.drawLine({ start: { x: M, y: PAGE_H - 66 }, end: { x: PAGE_W - M, y: PAGE_H - 66 }, thickness: 0.7, color: BRAND.line });
    drawFooter(target);
  };

  const addPage = first => {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    drawHeader(page, first);
    y = PAGE_H - 93;
  };

  const ensure = needed => {
    if (y - needed >= FOOTER_H + 24) return;
    addPage(false);
  };

  const drawWrapped = (text, {
    x = M, size = 9, font = regular, color = BRAND.dark,
    maxWidth = CONTENT_W, leading = size * 1.35
  } = {}) => {
    const lines = wrapPdfText(text, font, size, maxWidth);
    ensure(lines.length * leading);
    for (const row of lines) {
      page.drawText(row, { x, y, size, font, color });
      y -= leading;
    }
    return lines.length;
  };

  const gap = amount => {
    ensure(amount);
    y -= amount;
  };

  const drawMetaCard = () => {
    const h = 58;
    ensure(h + 10);
    page.drawRectangle({ x: M, y: y - h + 8, width: CONTENT_W, height: h, color: BRAND.light, borderColor: BRAND.line, borderWidth: 0.6 });
    page.drawText('AUSWERTUNG FÜR', { x: M + 16, y: y - 7, size: 7.0, font: bold, color: BRAND.muted });
    const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
    page.drawText(name, { x: M + 16, y: y - 23, size: 11.8, font: bold, color: BRAND.blue });
    const meta = 'Immobilie: ' + (report.type || 'Immobilie') + '   |   Situation: ' + (report.situation || 'Verkauf') + '   |   Stand: ' + (report.date || '');
    page.drawText(meta, { x: M + 16, y: y - 40, size: 7.3, font: regular, color: BRAND.muted });
    y -= h + 8;
  };

  const statusInfo = status => {
    if (status === 'critical') return { label: 'WICHTIG', accent: BRAND.coral, note: 'Vor dem nächsten Verkaufsschritt verbindlich klären.' };
    if (status === 'unsure') return { label: 'NOCH UNKLAR', accent: BRAND.blue, note: 'Aktualität oder Vollständigkeit bitte gegenprüfen.' };
    return { label: 'OFFEN', accent: BRAND.muted, note: 'Für die weitere Vermarktung bzw. Abwicklung vorbereiten.' };
  };

  const drawItemCard = item => {
    const info = statusInfo(item.status);
    const title = clampText(item.label, 260);
    const source = item.source ? 'Bezugsquelle: ' + clampText(item.source, 320) : '';
    const titleLines = wrapPdfText(title, bold, 9.6, CONTENT_W - 46);
    const noteLines = wrapPdfText(info.note, regular, 7.8, CONTENT_W - 46);
    const sourceLines = source ? wrapPdfText(source, regular, 7.6, CONTENT_W - 46) : [];
    const h = 16 + titleLines.length * 11.8 + noteLines.length * 9.8 + sourceLines.length * 9.6 + 11;
    ensure(h + 7);

    const top = y;
    page.drawRectangle({ x: M, y: top - h, width: CONTENT_W, height: h, color: BRAND.light, borderColor: BRAND.line, borderWidth: 0.55 });
    page.drawRectangle({ x: M, y: top - h, width: 4, height: h, color: info.accent });
    page.drawText(info.label, { x: M + 14, y: top - 15, size: 7.0, font: bold, color: info.accent });

    let cy = top - 31;
    for (const row of titleLines) {
      page.drawText(row, { x: M + 14, y: cy, size: 9.6, font: bold, color: BRAND.dark });
      cy -= 11.8;
    }
    for (const row of noteLines) {
      page.drawText(row, { x: M + 14, y: cy - 1, size: 7.8, font: regular, color: BRAND.muted });
      cy -= 9.8;
    }
    if (sourceLines.length) {
      cy -= 2;
      for (const row of sourceLines) {
        page.drawText(row, { x: M + 14, y: cy, size: 7.6, font: regular, color: BRAND.blue });
        cy -= 9.6;
      }
    }
    y = top - h - 5;
  };

  addPage(true);

  page.drawText('Ihre persönliche Verkaufsanalyse', { x: M, y, size: 24.5, font: serif, color: BRAND.blue });
  y -= 31;
  drawWrapped('Die wichtigsten offenen Punkte aus Ihrem Verkaufscheck - nach Verkaufsphase sortiert und mit konkreten Bezugsquellen.', {
    size: 9.5, color: BRAND.muted, leading: 13.2
  });
  gap(10);
  drawMetaCard();

  const contradictions = Array.isArray(report.contradictions) ? report.contradictions : [];
  if (contradictions.length) {
    page.drawRectangle({ x: M, y: y - 3, width: 22, height: 2, color: BRAND.coral });
    page.drawText('Bitte gegenprüfen', { x: M + 30, y: y - 6, size: 6.8, font: bold, color: BRAND.muted });
    y -= 18;
    contradictions.forEach(item => {
      const title = clampText(item.title, 180);
      const text = clampText(item.text, 900);
      drawWrapped(title, { size: 9.3, font: bold, color: BRAND.dark, leading: 12.4 });
      drawWrapped(text, { size: 7.8, color: BRAND.muted, leading: 10.5 });
      gap(6);
    });
    gap(3);
  }

  const phases = Array.isArray(report.phases) ? report.phases : [];
  if (!phases.length) {
    ensure(72);
    page.drawRectangle({ x: M, y: y - 54, width: CONTENT_W, height: 54, color: BRAND.light, borderColor: BRAND.line, borderWidth: 0.6 });
    page.drawText('Aktuell keine offenen Punkte aus dem Check', { x: M + 16, y: y - 20, size: 10.2, font: bold, color: BRAND.blue });
    page.drawText('Prüfen Sie Unterlagen und Nachweise vor dem nächsten Schritt dennoch noch einmal auf Aktualität.', { x: M + 16, y: y - 38, size: 7.8, font: regular, color: BRAND.muted });
    y -= 65;
  } else {
    for (const section of phases) {
      ensure(36);
      page.drawText(clampText(section.label, 120), { x: M, y, size: 14.2, font: serif, color: BRAND.blue });
      y -= 18;
      for (const item of (Array.isArray(section.items) ? section.items : [])) drawItemCard(item);
      gap(3);
    }
  }

  ensure(96);
  page.drawRectangle({ x: M, y: y - 74, width: CONTENT_W, height: 74, color: BRAND.blue });
  page.drawText('Gut vorbereitet in den nächsten Schritt.', { x: M + 18, y: y - 21, size: 11.2, font: bold, color: BRAND.white });
  const cta = 'Wenn Sie offene Punkte gemeinsam einordnen möchten, begleiten wir Sie persönlich von der Vorbereitung bis zur Übergabe.';
  let cy = y - 39;
  for (const row of wrapPdfText(cta, regular, 8.2, CONTENT_W - 36)) {
    page.drawText(row, { x: M + 18, y: cy, size: 8.2, font: regular, color: BRAND.white });
    cy -= 11;
  }
  page.drawText('02369 742 80 20  |  service@sls.de  |  www.sls.de', { x: M + 18, y: y - 62, size: 7.6, font: bold, color: BRAND.white });
  y -= 82;

  const out = await pdfDoc.save({ useObjectStreams: false });
  return Uint8Array.from(out);
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
    const pdf = await buildPdf(report, contact);
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

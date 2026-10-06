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
  let officeBackground = null;
  let dennisPortrait = null;
  let filippoPortrait = null;
  let mischaPortrait = null;
  try {
    const response = await fetch('https://raw.githubusercontent.com/Filippo-Pvio/sls-website/main/assets/logo-sls-horizontal-transparent.png');
    if (response.ok) logo = await pdfDoc.embedPng(await response.arrayBuffer());
  } catch (error) {
    console.error('sales-check-report: logo unavailable', error);
  }
  try {
    const response = await fetch('https://raw.githubusercontent.com/Filippo-Pvio/sls-website/main/assets/verkaufsanalyse-office-bg.jpg');
    if (response.ok) officeBackground = await pdfDoc.embedJpg(await response.arrayBuffer());
  } catch (error) {
    console.error('sales-check-report: office background unavailable', error);
  }

  const embedRemoteJpg = async (url, label) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await pdfDoc.embedJpg(await response.arrayBuffer());
    } catch (error) {
      console.error('sales-check-report: ' + label + ' unavailable', error);
      return null;
    }
  };

  dennisPortrait = await embedRemoteJpg(
    'https://raw.githubusercontent.com/Filippo-Pvio/sls-website/main/assets/images/magazin/dennis.jpg',
    'Dennis portrait'
  );
  filippoPortrait = await embedRemoteJpg(
    'https://raw.githubusercontent.com/Filippo-Pvio/sls-website/main/assets/images/magazin/filippo.jpg',
    'Filippo portrait'
  );
  mischaPortrait = await embedRemoteJpg(
    'https://raw.githubusercontent.com/Filippo-Pvio/sls-website/main/assets/images/magazin/mischa.jpg',
    'Mischa portrait'
  );

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const M = 52;
  const CONTENT_W = PAGE_W - M * 2;
  const FOOTER_H = 66;

  let page;
  let y = 0;
  let analysisPageNumber = 0;

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
    analysisPageNumber += 1;
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

  const itemCardMetrics = item => {
    const info = statusInfo(item.status);
    const title = clampText(item.label, 260);
    const source = item.source ? 'Bezugsquelle: ' + clampText(item.source, 320) : '';
    const titleLines = wrapPdfText(title, bold, 9.6, CONTENT_W - 46);
    const noteLines = wrapPdfText(info.note, regular, 7.8, CONTENT_W - 46);
    const sourceLines = source ? wrapPdfText(source, regular, 7.6, CONTENT_W - 46) : [];
    const h = 16 + titleLines.length * 11.8 + noteLines.length * 9.8 + sourceLines.length * 9.6 + 11;
    return { info, titleLines, noteLines, sourceLines, h };
  };

  const drawItemCard = item => {
    const { info, titleLines, noteLines, sourceLines, h } = itemCardMetrics(item);
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

  const drawFullBleed = (target, image, opacity = 1) => {
    if (!image) return;
    const dims = image.scale(1);
    const scale = Math.max(PAGE_W / dims.width, PAGE_H / dims.height);
    const drawW = dims.width * scale;
    const drawH = dims.height * scale;
    target.drawImage(image, {
      x: (PAGE_W - drawW) / 2,
      y: (PAGE_H - drawH) / 2,
      width: drawW,
      height: drawH,
      opacity
    });
  };

  const drawCoverPage = () => {
    const target = pdfDoc.addPage([PAGE_W, PAGE_H]);
    drawFullBleed(target, officeBackground, 1);
    target.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: BRAND.white, opacity: officeBackground ? 0.48 : 1 });
    target.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: BRAND.coral });

    if (logo) {
      const dims = logo.scale(1);
      const logoW = 255;
      const logoH = logoW * (dims.height / dims.width);
      target.drawImage(logo, {
        x: (PAGE_W - logoW) / 2,
        y: 600,
        width: logoW,
        height: logoH
      });
    } else {
      const fallback = 'SLS IMMOBILIENPARTNER';
      target.drawText(fallback, {
        x: (PAGE_W - bold.widthOfTextAtSize(fallback, 22)) / 2,
        y: 620,
        size: 22,
        font: bold,
        color: BRAND.blue
      });
    }

    const claim1 = 'Wir verkaufen Ihre Immobilie,';
    const claim2 = 'als wäre sie unsere eigene.';
    target.drawText(claim1, {
      x: (PAGE_W - serif.widthOfTextAtSize(claim1, 20.5)) / 2,
      y: 495,
      size: 20.5,
      font: serif,
      color: BRAND.blue
    });
    target.drawText(claim2, {
      x: (PAGE_W - serif.widthOfTextAtSize(claim2, 20.5)) / 2,
      y: 465,
      size: 20.5,
      font: serif,
      color: BRAND.coral
    });

    const cardX = 75;
    const cardY = 105;
    const cardW = PAGE_W - 150;
    const cardH = 185;
    target.drawRectangle({
      x: cardX,
      y: cardY,
      width: cardW,
      height: cardH,
      color: BRAND.white,
      opacity: 0.92,
      borderColor: BRAND.line,
      borderWidth: 0.6
    });
    target.drawRectangle({ x: cardX, y: cardY + cardH - 4, width: cardW, height: 4, color: BRAND.coral });

    const kicker = 'IHRE PERSÖNLICHE VERKAUFSANALYSE';
    target.drawText(kicker, {
      x: cardX + 24,
      y: cardY + 145,
      size: 8.2,
      font: bold,
      color: BRAND.coral
    });
    target.drawText('Ihre persönliche', {
      x: cardX + 24,
      y: cardY + 105,
      size: 23,
      font: serif,
      color: BRAND.blue
    });
    target.drawText('Verkaufsanalyse', {
      x: cardX + 24,
      y: cardY + 76,
      size: 23,
      font: serif,
      color: BRAND.blue
    });

    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ');
    const meta = [fullName, report.date ? 'Stand ' + report.date : ''].filter(Boolean).join('  |  ');
    target.drawText('Erstellt auf Basis Ihres SLS Verkaufschecks', {
      x: cardX + 24,
      y: cardY + 42,
      size: 8.7,
      font: regular,
      color: BRAND.muted
    });
    if (meta) {
      target.drawText(meta, {
        x: cardX + 24,
        y: cardY + 22,
        size: 8.1,
        font: bold,
        color: BRAND.blue
      });
    }
  };

  const drawPersonalPage = () => {
    const target = pdfDoc.addPage([PAGE_W, PAGE_H]);
    drawFullBleed(target, officeBackground, 1);
    target.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: BRAND.white, opacity: officeBackground ? 0.64 : 1 });

    const panelX = 55;
    const panelY = 68;
    const panelW = PAGE_W - 110;
    const panelH = PAGE_H - 136;
    target.drawRectangle({
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      color: BRAND.white,
      opacity: 0.93,
      borderColor: BRAND.line,
      borderWidth: 0.5
    });

    const titleY = PAGE_H - 126;
    const titleA = 'Wir begleiten Sie ';
    target.drawText(titleA, { x: panelX + 30, y: titleY, size: 20.5, font: serif, color: BRAND.dark });
    const titleAX = panelX + 30 + serif.widthOfTextAtSize(titleA, 20.5);
    target.drawText('persönlich', { x: titleAX, y: titleY, size: 20.5, font: serif, color: BRAND.coral });

    const people = [
      { image: dennisPortrait, name: 'Dennis Sahlmen' },
      { image: filippoPortrait, name: 'Filippo Livera' },
      { image: mischaPortrait, name: 'Mischa Stratmann' }
    ];
    const cardGap = 18;
    const imageW = (panelW - 60 - cardGap * 2) / 3;
    const imageH = 116;
    const imageY = PAGE_H - 292;

    people.forEach((person, index) => {
      const x = panelX + 30 + index * (imageW + cardGap);
      if (person.image) {
        const dims = person.image.scale(1);
        const scale = Math.min(imageW / dims.width, imageH / dims.height);
        const w = dims.width * scale;
        const h = dims.height * scale;
        target.drawRectangle({ x, y: imageY, width: imageW, height: imageH, color: BRAND.light });
        target.drawImage(person.image, {
          x: x + (imageW - w) / 2,
          y: imageY + (imageH - h) / 2,
          width: w,
          height: h
        });
      } else {
        target.drawRectangle({ x, y: imageY, width: imageW, height: imageH, color: BRAND.light });
      }
      const nameSize = 9.2;
      target.drawText(person.name, {
        x: x + (imageW - serif.widthOfTextAtSize(person.name, nameSize)) / 2,
        y: imageY - 19,
        size: nameSize,
        font: serif,
        color: BRAND.blue
      });
      const role = 'Geschäftsführer';
      target.drawText(role, {
        x: x + (imageW - regular.widthOfTextAtSize(role, 7.2)) / 2,
        y: imageY - 34,
        size: 7.2,
        font: regular,
        color: BRAND.muted
      });
    });

    const message = 'Das gesamte Team hinter SLS steht Ihnen mit Expertise und persönlichem Einsatz zur Seite.';
    const msgLines = wrapPdfText(message, serif, 12.2, panelW - 100);
    let msgY = imageY - 82;
    msgLines.forEach(row => {
      target.drawText(row, {
        x: panelX + (panelW - serif.widthOfTextAtSize(row, 12.2)) / 2,
        y: msgY,
        size: 12.2,
        font: serif,
        color: BRAND.dark
      });
      msgY -= 17;
    });

    target.drawText('Unser gesamtes Team finden Sie hier:', {
      x: panelX + 30,
      y: 280,
      size: 9.0,
      font: regular,
      color: BRAND.muted
    });
    target.drawText('www.SLS.de/team', {
      x: panelX + 30,
      y: 252,
      size: 14.2,
      font: bold,
      color: BRAND.blue
    });
    target.drawLine({ start: { x: panelX + 30, y: 247 }, end: { x: panelX + 142, y: 247 }, thickness: 1, color: BRAND.coral });

    const partnerLead = 'Werden auch Sie ';
    target.drawText(partnerLead, { x: panelX + 30, y: 190, size: 13.6, font: serif, color: BRAND.dark });
    const partnerX = panelX + 30 + serif.widthOfTextAtSize(partnerLead, 13.6);
    target.drawText('Immobilienpartner.', { x: partnerX, y: 190, size: 13.6, font: serif, color: BRAND.coral });
    target.drawLine({ start: { x: panelX + 30, y: 167 }, end: { x: panelX + 30, y: 132 }, thickness: 1.1, color: BRAND.blue });
    target.drawText('Wenn Sie den besten Preis erzielen wollen, sind wir bereit.', {
      x: panelX + 42, y: 158, size: 8.7, font: regular, color: BRAND.muted
    });
    target.drawText('Lernen Sie uns kennen. Es lohnt sich.', {
      x: panelX + 42, y: 141, size: 8.7, font: regular, color: BRAND.muted
    });
  };

  const drawClosingPage = () => {
    const target = pdfDoc.addPage([PAGE_W, PAGE_H]);
    target.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: BRAND.white });

    if (logo) {
      const dims = logo.scale(1);
      const logoW = 300;
      const logoH = logoW * (dims.height / dims.width);
      target.drawImage(logo, {
        x: (PAGE_W - logoW) / 2,
        y: 655,
        width: logoW,
        height: logoH
      });
    }

    const centerText = (text, yPos, size, font, color) => {
      target.drawText(text, {
        x: (PAGE_W - font.widthOfTextAtSize(text, size)) / 2,
        y: yPos,
        size,
        font,
        color
      });
    };

    centerText('Ihr Zuhause ist besonders.', 566, 17.6, serif, BRAND.blue);
    centerText('Der Verkauf sollte es auch sein.', 542, 17.6, serif, BRAND.blue);
    centerText('Lassen Sie uns sprechen -', 494, 12.3, regular, BRAND.blue);
    centerText('unverbindlich, ehrlich und persönlich.', 472, 12.3, bold, BRAND.blue);

    const leftX = 205;
    const rightX = 342;
    target.drawText('RUHRGEBIET', { x: leftX, y: 410, size: 8.0, font: bold, color: BRAND.blue });
    target.drawText('RHEINLAND', { x: rightX, y: 410, size: 8.0, font: bold, color: BRAND.blue });
    target.drawText('Büro Dorsten', { x: leftX - 18, y: 388, size: 12.0, font: serif, color: BRAND.coral });
    target.drawText('Büro Düsseldorf', { x: rightX - 16, y: 388, size: 12.0, font: serif, color: BRAND.coral });
    target.drawLine({ start: { x: 304, y: 330 }, end: { x: 304, y: 405 }, thickness: 0.8, color: BRAND.blue });

    const contactSize = 8.8;
    ['Ubierweg 2', '46286 Dorsten', '', '02369 742 80 20', 'dorsten@sls.de'].forEach((row, i) => {
      if (row) target.drawText(row, { x: leftX - 8, y: 354 - i * 14, size: contactSize, font: regular, color: BRAND.blue });
    });
    ['Königsallee 19', '40213 Düsseldorf', '', '0211 90 999 950', 'duesseldorf@sls.de'].forEach((row, i) => {
      if (row) target.drawText(row, { x: rightX - 2, y: 354 - i * 14, size: contactSize, font: regular, color: BRAND.blue });
    });

    centerText('www.SLS.de', 230, 19, serif, BRAND.blue);
    target.drawLine({ start: { x: 235, y: 222 }, end: { x: 360, y: 222 }, thickness: 1.2, color: BRAND.coral });
    centerText('Dennis Sahlmen  |  Filippo Livera  |  Mischa Stratmann', 185, 7.8, regular, BRAND.muted);

    centerText('SLS Immobilienpartner GmbH', 80, 6.8, regular, BRAND.blue);
    centerText('Amtsgericht Gelsenkirchen, HRB 18432', 68, 6.6, regular, BRAND.blue);
    centerText('Geschäftsführende Gesellschafter: Dennis Sahlmen, Filippo Livera, Mischa Stratmann', 56, 6.4, regular, BRAND.blue);
    centerText('Erlaubnis nach § 34c Gewerbeordnung (GewO) vom 15.07.2024 - Kreis Recklinghausen', 44, 6.2, regular, BRAND.blue);
    target.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 28, color: rgb(0.47, 0.62, 0.70) });
  };

  const drawMarketingPage = () => {
    const target = pdfDoc.addPage([PAGE_W, PAGE_H]);

    if (officeBackground) {
      const dims = officeBackground.scale(1);
      const areaY = 72;
      const areaH = PAGE_H - areaY;
      const scale = Math.max(PAGE_W / dims.width, areaH / dims.height);
      const bgW = dims.width * scale;
      const bgH = dims.height * scale;
      target.drawImage(officeBackground, {
        x: (PAGE_W - bgW) / 2 - 10,
        y: areaY + (areaH - bgH) / 2,
        width: bgW,
        height: bgH
      });
      target.drawRectangle({ x: 0, y: areaY, width: PAGE_W, height: areaH, color: BRAND.white, opacity: 0.85 });
    }

    target.drawRectangle({ x: 0, y: PAGE_H - 5, width: PAGE_W, height: 5, color: BRAND.coral });

    if (logo) {
      const dims = logo.scale(1);
      const logoW = 148;
      const logoH = logoW * (dims.height / dims.width);
      target.drawImage(logo, { x: M, y: PAGE_H - 46 - logoH / 2, width: logoW, height: logoH });
    } else {
      target.drawText('SLS IMMOBILIENPARTNER', { x: M, y: PAGE_H - 39, size: 15, font: bold, color: BRAND.blue });
    }

    const kicker = 'IHR VERKAUF MIT SLS';
    target.drawText(kicker, {
      x: PAGE_W - M - bold.widthOfTextAtSize(kicker, 8.6),
      y: PAGE_H - 37,
      size: 8.6,
      font: bold,
      color: BRAND.blue
    });
    target.drawLine({ start: { x: M, y: PAGE_H - 66 }, end: { x: PAGE_W - M, y: PAGE_H - 66 }, thickness: 0.7, color: BRAND.line });

    let my = PAGE_H - 105;
    target.drawText('So begleiten wir Sie zum', { x: M, y: my, size: 23, font: serif, color: BRAND.blue });
    my -= 27;
    target.drawText('erfolgreichen Verkauf.', { x: M, y: my, size: 23, font: serif, color: BRAND.coral });
    my -= 28;

    const intro = 'Ihre Analyse zeigt, welche Punkte noch offen sind. Im gemeinsamen Verkaufsprozess übernehmen wir genau diese Themen - und führen Sie strukturiert bis zur Übergabe.';
    for (const row of wrapPdfText(intro, regular, 9.2, CONTENT_W)) {
      target.drawText(row, { x: M, y: my, size: 9.2, font: regular, color: BRAND.muted });
      my -= 13;
    }
    my -= 8;

    const steps = [
      ['01', 'Persönliches Erstgespräch', 'Ziele verstehen und den passenden Verkaufsweg gemeinsam festlegen.'],
      ['02', 'Bewertung & Preisstrategie', 'Markt, Immobilie und realistische Preisposition fundiert einordnen.'],
      ['03', 'Unterlagen & Vorbereitung', 'Dokumente beschaffen und den Verkauf professionell vorbereiten.'],
      ['04', 'Präsentation & Freigabe', 'Exposé, Fotografie, Grundrisse und digitale Präsentation abstimmen.'],
      ['05', 'Vermarktung & Besichtigungen', 'Passende Käufer erreichen und Einzelbesichtigungen gezielt durchführen.'],
      ['06', 'Auswahl & Verhandlung', 'Bonität prüfen, Angebote einordnen und den bestmöglichen Abschluss verhandeln.'],
      ['07', 'Notar & Übergabe', 'Notartermin vorbereiten, Abwicklung begleiten und bis zur Übergabe an Ihrer Seite bleiben.']
    ];

    const colGap = 18;
    const colW = (CONTENT_W - colGap) / 2;
    const cardH = 64;
    const leftX = M;
    const rightX = M + colW + colGap;
    const startY = my;

    const drawProcessIcon = (kind, cx, cy) => {
      const line = (x1, y1, x2, y2, thickness = 0.68) =>
        target.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color: BRAND.blue });

      target.drawCircle({ x: cx, y: cy, size: 8.7, color: BRAND.white, borderColor: BRAND.line, borderWidth: 0.55 });

      if (kind === 0) {
        target.drawEllipse({ x: cx, y: cy + 1, xScale: 4.6, yScale: 3.4, borderColor: BRAND.blue, borderWidth: 0.8 });
        line(cx - 1.5, cy - 2.1, cx - 4.0, cy - 5.0);
      } else if (kind === 1) {
        line(cx - 5, cy - 2, cx - 5, cy + 3);
        line(cx - 5, cy + 3, cx + 5, cy + 3);
        line(cx + 5, cy + 3, cx + 5, cy - 2);
        line(cx - 6, cy + 3, cx, cy + 7);
        line(cx, cy + 7, cx + 6, cy + 3);
        line(cx - 1.5, cy - 1, cx + 4, cy - 1);
      } else if (kind === 2) {
        target.drawRectangle({ x: cx - 4.5, y: cy - 5.5, width: 9, height: 11, borderColor: BRAND.blue, borderWidth: 0.8 });
        line(cx - 2.8, cy + 2, cx + 2.8, cy + 2);
        line(cx - 2.8, cy - 0.7, cx + 2.8, cy - 0.7);
        line(cx - 2.8, cy - 3.4, cx + 1.5, cy - 3.4);
      } else if (kind === 3) {
        target.drawRectangle({ x: cx - 5.5, y: cy - 3.8, width: 11, height: 7.6, borderColor: BRAND.blue, borderWidth: 0.8 });
        target.drawCircle({ x: cx, y: cy, size: 2.2, borderColor: BRAND.blue, borderWidth: 0.8 });
        line(cx - 3.6, cy + 4.2, cx - 1.3, cy + 4.2);
      } else if (kind === 4) {
        line(cx - 5.5, cy + 2.5, cx + 2, cy + 5.5);
        line(cx - 5.5, cy - 2.5, cx + 2, cy - 5.5);
        line(cx + 2, cy + 5.5, cx + 2, cy - 5.5);
        line(cx - 5.5, cy + 2.5, cx - 5.5, cy - 2.5);
        line(cx - 3.5, cy - 2.7, cx - 2.5, cy - 6.2);
      } else if (kind === 5) {
        line(cx - 5.5, cy + 2.2, cx - 1.0, cy + 2.2);
        line(cx - 1.0, cy + 2.2, cx + 1.5, cy + 4.5);
        line(cx + 1.5, cy + 4.5, cx + 5.5, cy + 0.5);
        line(cx - 5.5, cy - 2.2, cx - 1.0, cy - 2.2);
        line(cx - 1.0, cy - 2.2, cx + 1.5, cy - 4.5);
        line(cx + 1.5, cy - 4.5, cx + 5.5, cy - 0.5);
      } else {
        target.drawCircle({ x: cx - 2.5, y: cy + 1.5, size: 3.0, borderColor: BRAND.blue, borderWidth: 0.8 });
        line(cx + 0.3, cy - 0.4, cx + 5.5, cy - 5.4);
        line(cx + 3.5, cy - 3.5, cx + 5.8, cy - 1.2);
      }
    };

    const drawStep = (x, topY, step, iconIndex) => {
      target.drawRectangle({
        x,
        y: topY - cardH,
        width: colW,
        height: cardH,
        color: BRAND.white,
        opacity: 0.82,
        borderColor: BRAND.line,
        borderWidth: 0.38
      });
      target.drawRectangle({ x, y: topY - cardH, width: 3.2, height: cardH, color: BRAND.coral });
      target.drawText(step[0], { x: x + colW - 26, y: topY - 15, size: 6.4, font: bold, color: BRAND.coral });

      const titleLines = wrapPdfText(step[1], bold, 8.6, colW - 60);
      const bodyLines = wrapPdfText(step[2], regular, 7.3, colW - 60);
      const titleLeading = 10.6;
      const bodyLeading = 9.4;
      const blockH = titleLines.length * titleLeading + 5 + bodyLines.length * bodyLeading;
      let textY = topY - Math.max(20, (cardH - blockH) / 2 + 7);

      drawProcessIcon(iconIndex, x + 19, topY - cardH / 2);

      titleLines.forEach(row => {
        target.drawText(row, { x: x + 40, y: textY, size: 8.6, font: bold, color: BRAND.dark });
        textY -= titleLeading;
      });
      textY -= 4;
      bodyLines.forEach(row => {
        target.drawText(row, { x: x + 40, y: textY, size: 7.3, font: regular, color: BRAND.muted });
        textY -= bodyLeading;
      });
    };

    steps.slice(0, 4).forEach((step, i) => drawStep(leftX, startY - i * (cardH + 6), step, i));
    steps.slice(4).forEach((step, i) => drawStep(rightX, startY - i * (cardH + 6), step, i + 4));

    const benefitsTop = startY - 4 * (cardH + 6) + 1;
    target.drawText('Was Sie dabei von uns erwarten können', { x: M, y: benefitsTop, size: 10.6, font: bold, color: BRAND.blue });

    const benefits = [
      'Professionelle Präsentation',
      'Maximale Reichweite & Top-Platzierung',
      'Bonitätsprüfung von Interessenten',
      'Persönliche Betreuung & Live-Reporting'
    ];

    const benefitGap = 8;
    const benefitW = (CONTENT_W - benefitGap * 3) / 4;
    const benefitY = benefitsTop - 35;

    benefits.forEach((text, index) => {
      const bx = M + index * (benefitW + benefitGap);

      target.drawRectangle({
        x: bx,
        y: benefitY,
        width: benefitW,
        height: 30,
        color: BRAND.white,
        opacity: 0.84,
        borderColor: BRAND.line,
        borderWidth: 0.38
      });
      target.drawCircle({ x: bx + 12, y: benefitY + 15, size: 5.2, color: BRAND.coral });
      target.drawLine({ start: { x: bx + 9.8, y: benefitY + 15 }, end: { x: bx + 11.4, y: benefitY + 13.3 }, thickness: 0.7, color: BRAND.white });
      target.drawLine({ start: { x: bx + 11.4, y: benefitY + 13.3 }, end: { x: bx + 14.3, y: benefitY + 17.0 }, thickness: 0.7, color: BRAND.white });

      const rows = wrapPdfText(text, regular, 6.55, benefitW - 25);
      let ty = benefitY + 18;
      rows.slice(0, 2).forEach(rowText => {
        target.drawText(rowText, { x: bx + 22, y: ty, size: 6.55, font: regular, color: BRAND.dark });
        ty -= 7.8;
      });
    });

    const ctaY = 112;
    target.drawRectangle({ x: M, y: ctaY, width: CONTENT_W, height: 110, color: BRAND.blue });
    const claimSize = 13.0;
    const claimX = M + 20;
    const claimY = ctaY + 76;
    const claimStart = 'Wir verkaufen ';
    const claimHighlight = 'Ihre Immobilie';
    target.drawText(claimStart, { x: claimX, y: claimY, size: claimSize, font: bold, color: BRAND.white });
    const highlightX = claimX + bold.widthOfTextAtSize(claimStart, claimSize);
    target.drawText(claimHighlight, { x: highlightX, y: claimY, size: claimSize, font: bold, color: BRAND.coral });
    const commaX = highlightX + bold.widthOfTextAtSize(claimHighlight, claimSize);
    target.drawText(',', { x: commaX, y: claimY, size: claimSize, font: bold, color: BRAND.white });
    target.drawText('als wäre sie unsere eigene.', { x: claimX, y: ctaY + 55, size: claimSize, font: bold, color: BRAND.white });
    target.drawText('Lassen Sie uns darüber sprechen, wie wir Ihre Immobilie optimal vermarkten.', { x: claimX, y: ctaY + 34, size: 8.2, font: regular, color: BRAND.white });
    target.drawText('02369 742 80 20  |  service@sls.de  |  www.sls.de', { x: claimX, y: ctaY + 16, size: 7.8, font: bold, color: BRAND.white });

    target.drawLine({ start: { x: M, y: 66 }, end: { x: PAGE_W - M, y: 66 }, thickness: 0.7, color: BRAND.line });
    target.drawText('SLS Immobilienpartner GmbH', { x: M, y: 45, size: 7.6, font: bold, color: BRAND.blue });
    const offices = 'Dorsten  |  Düsseldorf  |  Ruhrgebiet & Rheinland';
    target.drawText(offices, { x: PAGE_W - M - regular.widthOfTextAtSize(offices, 7.2), y: 45, size: 7.2, font: regular, color: BRAND.muted });
  };

  drawCoverPage();
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
    gap(6);
    page.drawRectangle({ x: M, y: y - 3, width: 22, height: 2, color: BRAND.coral });
    page.drawText('Bitte gegenprüfen', { x: M + 30, y: y - 6, size: 6.8, font: bold, color: BRAND.muted });
    y -= 22;
    contradictions.forEach(item => {
      const title = clampText(item.title, 180);
      const text = clampText(item.text, 900);
      drawWrapped(title, { size: 9.3, font: bold, color: BRAND.dark, leading: 12.4 });
      drawWrapped(text, { size: 7.8, color: BRAND.muted, leading: 10.5 });
      gap(6);
    });
    gap(7);
  }

  const phases = Array.isArray(report.phases) ? report.phases : [];
  if (!phases.length) {
    ensure(72);
    page.drawRectangle({ x: M, y: y - 54, width: CONTENT_W, height: 54, color: BRAND.light, borderColor: BRAND.line, borderWidth: 0.6 });
    page.drawText('Aktuell keine offenen Punkte aus dem Check', { x: M + 16, y: y - 20, size: 10.2, font: bold, color: BRAND.blue });
    page.drawText('Prüfen Sie Unterlagen und Nachweise vor dem nächsten Schritt dennoch noch einmal auf Aktualität.', { x: M + 16, y: y - 38, size: 7.8, font: regular, color: BRAND.muted });
    y -= 65;
  } else {
    for (let sectionIndex = 0; sectionIndex < phases.length; sectionIndex += 1) {
      const section = phases[sectionIndex];
      const sectionItems = Array.isArray(section.items) ? section.items : [];

      if (sectionIndex > 0) gap(13);

      const firstCardHeight = sectionItems.length ? itemCardMetrics(sectionItems[0]).h : 0;
      ensure(24 + firstCardHeight + 8);

      page.drawText(clampText(section.label, 120), { x: M, y, size: 14.2, font: serif, color: BRAND.blue });
      y -= 23;

      for (const item of sectionItems) drawItemCard(item);
      gap(5);
    }
  }

  // Use remaining space on a continued analysis page for a concise, personalized priority summary.
  if (analysisPageNumber > 1) {
    const priorityRank = { critical: 0, unsure: 1, open: 2 };
    const priorityItems = phases
      .flatMap((section, sectionIndex) =>
        (Array.isArray(section.items) ? section.items : []).map((item, itemIndex) => ({
          ...item,
          phaseLabel: section.label,
          sectionIndex,
          itemIndex
        }))
      )
      .sort((a, b) =>
        (priorityRank[a.status] ?? 9) - (priorityRank[b.status] ?? 9) ||
        a.sectionIndex - b.sectionIndex ||
        a.itemIndex - b.itemIndex
      )
      .filter((item, index, all) => all.findIndex(other => other.label === item.label) === index)
      .slice(0, 3);

    const priorityBlockHeight = priorityItems.length ? 50 + priorityItems.length * 54 : 0;
    if (priorityItems.length && y - priorityBlockHeight >= FOOTER_H + 30) {
      gap(10);
      page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 0.7, color: BRAND.line });
      y -= 21;
      page.drawText('Ihre nächsten Prioritäten', { x: M, y, size: 13.6, font: serif, color: BRAND.blue });
      y -= 17;
      page.drawText('Damit Sie jetzt gezielt weiterkommen, würden wir diese Punkte zuerst angehen:', {
        x: M,
        y,
        size: 7.9,
        font: regular,
        color: BRAND.muted
      });
      y -= 15;

      priorityItems.forEach((item, index) => {
        const accent = item.status === 'critical' ? BRAND.coral : item.status === 'unsure' ? BRAND.blue : BRAND.muted;
        const top = y;
        const h = 47;
        page.drawRectangle({ x: M, y: top - h, width: CONTENT_W, height: h, color: BRAND.light, borderColor: BRAND.line, borderWidth: 0.5 });
        page.drawRectangle({ x: M, y: top - h, width: 3, height: h, color: accent });
        page.drawText(String(index + 1).padStart(2, '0'), { x: M + 13, y: top - 18, size: 7.0, font: bold, color: accent });

        const titleLines = wrapPdfText(clampText(item.label, 180), bold, 8.8, CONTENT_W - 80);
        let py = top - 18;
        titleLines.slice(0, 2).forEach(row => {
          page.drawText(row, { x: M + 39, y: py, size: 8.8, font: bold, color: BRAND.dark });
          py -= 10.5;
        });

        const phase = clampText(item.phaseLabel || '', 90);
        if (phase) {
          page.drawText(phase, { x: M + 39, y: top - 37, size: 6.8, font: regular, color: BRAND.muted });
        }
        y = top - h - 5;
      });

      if (y - 66 >= FOOTER_H + 28) {
        gap(12);
        const noteTop = y;
        const noteH = 54;
        page.drawRectangle({
          x: M,
          y: noteTop - noteH,
          width: CONTENT_W,
          height: noteH,
          color: BRAND.light,
          borderColor: BRAND.line,
          borderWidth: 0.5
        });
        page.drawText('Sie möchten diese Punkte gemeinsam einordnen?', {
          x: M + 16,
          y: noteTop - 20,
          size: 9.2,
          font: bold,
          color: BRAND.blue
        });
        page.drawText('Wir zeigen Ihnen, welche Themen zuerst gelöst werden sollten und wie wir Sie dabei unterstützen.', {
          x: M + 16,
          y: noteTop - 38,
          size: 7.5,
          font: regular,
          color: BRAND.muted
        });
        y = noteTop - noteH - 5;
      }
    }
  }

  drawMarketingPage();
  drawPersonalPage();
  drawClosingPage();

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

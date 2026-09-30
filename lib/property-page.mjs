import {buildPropertySeo} from '../assets/property-seo.mjs';

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
// Embedded JSON must never be able to close its script element.
const scriptJson=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const messages={
  404:['Immobilie nicht gefunden','Unter dieser Adresse ist kein Immobilienangebot verfügbar.'],
  410:['Diese Immobilie ist nicht mehr verfügbar.','Das Angebot wurde aus der aktuellen Vermarktung genommen. Entdecken Sie unsere aktuellen Immobilien.'],
  502:['Immobilie derzeit nicht abrufbar','Das Angebot kann gerade nicht geladen werden. Bitte versuchen Sie es später erneut.'],
  503:['Immobilie derzeit nicht abrufbar','Das Angebot kann gerade nicht geladen werden. Bitte versuchen Sie es später erneut.']
};

export function renderPropertyPage(template,result){
  const property=result.status===200?result.body?.items?.[0]:null;
  const status=property?200:(messages[result.status]?result.status:502);
  const seo=property?buildPropertySeo(property):null;
  const [heading,description]=property?[seo.data.name,seo.description]:messages[status];
  const title=seo?.title||`${heading} | SLS Immobilienpartner`;
  const facts=property?(property.objectFacts||[]).map(({label,value,kind})=>{
    const shown=kind==='area'?`${new Intl.NumberFormat('de-DE').format(value)} m²`:value;
    return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(shown)}</dd></div>`;
  }).join(''):'';
  const photo=seo?.data.image?.[0];
  const content=`<section class="pp-panel"><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(description)}</p>${photo?`<img src="${escapeHtml(photo)}" alt="${escapeHtml(heading)}" style="max-width:100%;height:auto">`:''}${facts?`<h2>Objektdaten</h2><dl class="pp-facts">${facts}</dl>`:''}${property?.description?`<h2>Objektbeschreibung</h2><p class="pp-text">${escapeHtml(property.description)}</p>`:''}${property?.courtage?`<p>Käuferprovision: ${escapeHtml(property.courtage)}</p>`:''}${property?.courtageNote?`<p>${escapeHtml(property.courtageNote)}</p>`:''}${status>=500?'<p><a href="">Erneut laden</a></p>':''}<p><a class="pp-button" href="/immobilien/">Aktuelle Immobilien ansehen</a></p>${property?'<noscript><p>Für Bildergalerie, Favoriten und das Anfrageformular aktivieren Sie bitte JavaScript.</p></noscript>':''}</section>`;
  const metadata=seo?`<link rel="canonical" href="${escapeHtml(seo.canonical)}"><script id="pp-property-jsonld" type="application/ld+json">${scriptJson(seo.data)}</script>`:'';
  const bootstrap={status,...(property?{property}:{})};
  const html=template
    .replace(/<title>[\s\S]*?<\/title>/,()=>`<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/,()=>`<meta name="description" content="${escapeHtml(description)}">`)
    .replace('</head>',()=>`${metadata}</head>`)
    .replace('class="property-preview"','class="property-preview pp-is-detail"')
    .replace('<div id="pp-search">','<div id="pp-search" hidden>')
    .replace('<div id="pp-detail" hidden>','<div id="pp-detail">')
    .replace('<div id="pp-detail-content"></div>',()=>`<div id="pp-detail-content">${content}</div>`)
    .replace('</body>',()=>`<script id="pp-server-data" type="application/json">${scriptJson(bootstrap)}</script></body>`);
  return {status,html};
}

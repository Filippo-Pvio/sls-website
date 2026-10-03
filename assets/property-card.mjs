import {objectPath} from './property-seo.mjs';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const format=n=>n==null?'Preis auf Anfrage':new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
  const area=n=>n==null?'–':`${new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n)} m²`;
  const photo=(src,alt,loading="lazy")=>src?`<img src="${esc(src)}" alt="${esc(alt)}" loading="${loading}"${loading==="eager"?' fetchpriority="low"':''}>`:'<span class="pp-fallback">SLS Immobilienpartner</span>';
  const energyNotRequired=energy=>/^(?:wird\s+)?nicht\s+benötigt[.!]?$/i.test(String(energy.availability||'').trim());
export const propertyCardHtml=(p,{href=objectPath(p),heading='h2',favorite=''}={})=>{
    const energy=p.energy||{};
    const energyLine=energyNotRequired(energy)?'Energieausweis wird nicht benötigt':energy.kind&&energy.value!=null&&energy.fuel&&energy.buildingYear&&energy.rating
      ?`${esc(energy.kind)} · ${esc(new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(energy.value))} kWh/(m²·a) · ${esc(energy.fuel)} · ${energy.yearFromCertificate?'Baujahr':'Baujahr lt. Objektdaten'} ${esc(energy.buildingYear)} · Klasse ${esc(energy.rating)}`
      :'Energieangaben auf Anfrage';
    return `<article class="pp-card-shell" data-property-id="${esc(p.id)}"><a class="pp-card" href="${esc(href)}"><div class="pp-image">${photo(p.images?.[0],p.title)}<span class="pp-chip">${esc(p.status||'Verfügbar')}</span></div><div class="pp-card-content"><span class="pp-city">${p.reference?`${esc(p.reference)} · `:''}${esc(p.city)}</span><${heading}>${esc(p.title)}</${heading}><div class="pp-stats"><span>${area(p.area)}</span>${p.rooms!=null?`<span>${esc(p.rooms)} Zimmer</span>`:''}<span>${esc(p.type)}</span></div><span class="pp-price">${format(p.price)}</span>${p.courtage?`<small class="pp-card-courtage">Käuferprovision: ${esc(p.courtage)}</small>`:''}<small class="pp-card-energy">${energyLine}</small></div></a>${favorite}</article>`;
  };

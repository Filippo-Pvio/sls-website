import {objectPath} from './property-seo.mjs';
const criteria=document.querySelector('#buy-profile-form');
criteria.addEventListener('submit',event=>{event.preventDefault();document.querySelector('[data-search-profile-open]').click()});

const grid=document.querySelector('#buy-listings');
const money=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const number=new Intl.NumberFormat('de-DE',{maximumFractionDigits:1});
const el=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;if(text)node.textContent=text;return node};
try{
 const response=await fetch('/api/propstack-properties?per=9&page=1',{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Feed unavailable');
 const data=await response.json();
 const items=(data.items||[]).filter(p=>/^\d+$/.test(String(p.id))&&p.title&&/^https:\/\//.test(p.images?.[0]||'')).slice(0,3);
 if(!items.length)throw new Error('No offers');
 grid.replaceChildren(...items.map(p=>{
  const link=el('a','buy-card');link.href=objectPath(p);
  const image=el('img','');image.src=p.images[0];image.alt=p.title;image.loading='lazy';image.decoding='async';
  const body=el('div','buy-card-body');
  body.append(el('p','eyebrow',[p.type,p.city].filter(Boolean).join(' · ')),el('h3','',p.title),el('p','',[p.area?`${number.format(p.area)} m²`:null,p.rooms?`${number.format(p.rooms)} Zimmer`:null].filter(Boolean).join(' · ')),el('strong','',p.price>0?money.format(p.price):'Preis auf Anfrage'));
  if(p.courtage)body.append(el('p','',`Käuferprovision: ${p.courtage}`));
  body.append(el('span','buy-card-link','Immobilie ansehen →'));link.append(image,body);return link;
 }));
}catch{grid.replaceChildren(el('p','','Unsere Auswahl ist gerade nicht verfügbar. Über „Alle Immobilien ansehen“ gelangen Sie zur Immobiliensuche.'));}

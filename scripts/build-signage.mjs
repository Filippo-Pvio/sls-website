import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {buildSignageContent,signageTopics,mixedProgramme} from '../lib/signage-content.mjs';
const root=new URL('../',import.meta.url);
const read=async file=>JSON.parse(await readFile(new URL(file,root),'utf8'));
const profiles=await read('content/team/profiles.json');
// Same extra published profile used by the website's team and reference pages.
if(!profiles.some(p=>p.slug==='filippo-livera'))profiles.splice(1,0,{slug:'filippo-livera',name:'Filippo Livera',role:'Geschäftsführer · Immobilienmakler',portrait:'/assets/imported/Filippo-Livera-768x768.jpg',heading:'Persönlich für Ihre Immobilie da.'});
const data=buildSignageContent(profiles,await read('content/team/reviews.json'),await read('content/videos/property-tours.generated.json'));
await writeFile(new URL('assets/schaufenster-content.json',root),JSON.stringify({topics:data,programme:mixedProgramme},null,2)+'\n');
const base=await readFile(new URL('schaufenster/immobilienbewertung/index.html',root),'utf8');
for(const [key,title] of Object.entries(signageTopics)){
 const first=data[key][0];if(!first)throw Error('Missing signage content: '+key);
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let html=base.replace('<html lang="de" data-sls-signage>','<html lang="de" data-sls-signage data-signage-topic="'+key+'">')
 .replace(/<title>.*?<\/title>/,'<title>'+esc(title)+' im Schaufenster · SLS Immobilienpartner</title>')
 .replace('/assets/schaufenster-bewertung.js','/assets/schaufenster-themen.js').replace('</head>','<link rel="stylesheet" href="/assets/schaufenster-themen.css"></head>')
 .replace('Immobilienbewertung mit SLS',esc(title)+' mit SLS').replace('Einblicke in die Immobilienbewertung',esc(title))
 .replace('<span class="offer-badge">Immobilienbewertung</span>','<span class="offer-badge">'+esc(title)+'</span>')
 .replace('Digital beginnen. Persönlich weiterdenken.','SLS Immobilienpartner')
 .replace('Was ist Ihre Immobilie heute wert?',()=>esc(first.title)).replace('Jetzt online einschätzen.',()=>esc(first.accent))
 .replace(/<p class="valuation-copy"[^>]*>.*?<\/p>/,'<p class="valuation-copy" id="valuation-copy">'+esc(first.copy)+'</p>')
 .replace(/<div class="valuation-points">.*?<\/div>/,'<div class="valuation-points" id="topic-tags"></div>')
 .replace(/<p class="valuation-note">[\s\S]*?<\/p>/,'<p class="valuation-note" id="topic-note"></p>')
 .replace(/<div class="invitation">.*?<\/div>/,'<div class="invitation"><span id="topic-invitation">Mehr erfahren auf dem Smartphone</span><strong id="topic-destination">sls.de</strong></div>')
 .replace('href="https://sls.de/immobilienbewertung/"','href="'+esc(first.target.startsWith('/')?'https://sls.de'+first.target:first.target)+'"')
 .replace('aria-label="Immobilienbewertung auf dem Smartphone starten"','aria-label="Mehr auf dem Smartphone erfahren"')
 .replace(/<strong>Was ist Ihr Zuhause wert\?<br>Jetzt QR-Code scannen\.<\/strong>/,'<strong id="topic-qr-label">Mehr erfahren<br>Jetzt QR-Code scannen.</strong>')
 .replace('<span>Online-Bewertung starten</span>','<span>Einfach mit dem Smartphone scannen</span>')
 .replace('</section>\n    <section class="information">','</section>\n    <img id="spotlight" alt="" hidden><div id="video-stage" hidden></div>\n    <section class="information">');
 const dir=new URL('schaufenster/'+key+'/',root);await mkdir(dir,{recursive:true});await writeFile(new URL('index.html',dir),html);
}
console.log('Schaufenster: sechs Themen aus öffentlichen Websiteinhalten aufgebaut.');

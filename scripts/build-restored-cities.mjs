import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {escapeHtml as esc,origin} from '../lib/seo.mjs';
const root=new URL('../',import.meta.url);
const cities=JSON.parse(await readFile(new URL('content/seo/restored-cities.json',root),'utf8'));
const template=await readFile(new URL('immobilienmakler-dorsten/index.html',root),'utf8');
for(const city of cities){
 const slug=city.url.split('/').filter(Boolean)[0],name=esc(city.city),scene=`local-relaunch-20261026/${slug.replace('immobilienmakler-','')}`;
 let html=template.replaceAll('immobilienmakler-dorsten',slug).replaceAll('Dorsten',city.city);
 html=html.replace('class="buy-page market-city-page"','class="buy-page market-city-page restored-city-page"')
  .replace('</head>','<link rel="stylesheet" href="/assets/restored-pages.css"></head>');
 const hero=`<section class="buy-intro city-hero"><div class="buy-hero-scenes" aria-hidden="true"><img class="hero-scene hero-scene-current is-visible" src="/assets/images/${scene}-1536.webp" srcset="/assets/images/${scene}-900.webp 900w, /assets/images/${scene}-1536.webp 1536w" sizes="100vw" width="1536" height="864" alt="" fetchpriority="high" decoding="async"></div><div class="wrap"><h1>Ihr Immobilienmakler<br>in ${name}.</h1><p class="lead">${esc(city.text||city.localIntro)}</p><div class="page-actions"><a class="button button-light" href="/immobilienbewertung/">Immobilie bewerten</a><a class="button button-ghost" href="#kontakt">Verkauf besprechen</a></div></div><p class="editorial-image-credit">KI-generiertes Symbolbild</p></section>`;
 html=html.replace(/<section class="buy-intro city-hero"[^>]*>[\s\S]*?<\/section>/,()=>hero);
 const blocks=city.sections.map(s=>`<article data-city-reveal><h3>${esc(s.heading)}</h3><p>${esc(s.text)}</p><p class="city-takeaway">${esc(s.takeaway||'Die Eigenschaften Ihrer konkreten Immobilie bilden die Grundlage.')}</p></article>`).join('');
 const sources=(city.sources||[]).map((url,i)=>`<li><a href="${esc(url)}" target="_blank" rel="noopener">Kommunale Quelle ${i+1}</a></li>`).join('');
 const local=`<section class="section" id="wohnlagen"><div class="wrap"><div class="city-section-head" data-city-reveal><h2>Ihre Immobilie in ${name}.<br>Auf die Details kommt es an.</h2><p>${esc(city.localIntro)}</p></div><div class="city-locations">${blocks}</div><p class="city-small">Die genannten Bereiche sind Beispiele. Wir besprechen die Betreuung Ihrer konkreten Adresse und Ihr Vorhaben persönlich.</p>${sources?`<details class="city-source"><summary>Quellen zur örtlichen Einordnung</summary><ul>${sources}</ul></details>`:''}</div></section>`;
 html=html.replace(/<section class="section" id="(?:dorsten|wohnlagen)"[\s\S]*?<\/section>/,()=>local);
 html=html.replace(/<figure class="city-image"[^>]*>[\s\S]*?<\/figure>/,()=>'<figure class="city-image" data-city-reveal><img src="/assets/images/guides-hero/besichtigung-1536.webp" srcset="/assets/images/guides-hero/besichtigung-900.webp 900w, /assets/images/guides-hero/besichtigung-1536.webp 1536w" sizes="(max-width: 850px) 100vw, 50vw" width="1536" height="1024" loading="lazy" decoding="async" alt="Gespräch bei der Vorbereitung eines Immobilienverkaufs"></figure>');
 html=html.replace(/<details><summary>Begleiten Sie auch Immobilien in Lembeck[\s\S]*?<\/details>/,()=>`<details><summary>Begleiten Sie Immobilien im gesamten Gebiet von ${name}?</summary><p>Wir besprechen mit Ihnen die konkrete Lage, Ihr Vorhaben und den passenden Ansprechpartner. Die oben genannten Bereiche geben eine erste Orientierung und sind keine abschließende Aufzählung.</p></details>`);
 html=html.replace(/<meta property="og:image" content="[^"]*">/,()=>`<meta property="og:image" content="${origin}/assets/images/${scene}-1536.webp">`);
 html=html.replaceAll(`city=${city.city}&amp;marketCity=1`,`city=${encodeURIComponent(city.city)}&amp;marketCity=1`);
 const directory=new URL(city.url.slice(1),root);await mkdir(directory,{recursive:true});await writeFile(new URL('index.html',directory),html);
}
console.log(`Built ${cities.length} complete city pages from the established Dorsten layout.`);

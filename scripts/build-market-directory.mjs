import {readFile,writeFile} from 'node:fs/promises';
import {marketAreas} from '../lib/market-area-directory.mjs';
import {escapeHtml as esc,scriptJson} from '../lib/seo.mjs';
const file=new URL('../standorte/index.html',import.meta.url);
let page=await readFile(file,'utf8');
const cards=marketAreas.map(area=>`<article class="network-partner" data-category="${esc(area.regions.join(' '))}"><h3><a href="${esc(area.url)}">${esc(area.city)}</a></h3><p>${esc(area.text)}</p><a class="network-link" href="${esc(area.url)}" aria-label="Immobilienberatung in ${esc(area.city)}">Immobilienberatung <span aria-hidden="true">→</span></a></article>`).join('');
page=page.replace(/(<section class="section network-directory"[\s\S]*?<div class="network-partners">)[\s\S]*?(<\/div><\/div><\/section>)/,(_,start,end)=>start+cards+end)
 .replace(/<p class="network-count">[^<]*<\/p>/,()=>`<p class="network-count">${marketAreas.length} Marktgebiete</p>`)
 .replace(/<script type="application\/json" id="market-area-search-config">[\s\S]*?<\/script>/,()=>`<script type="application/json" id="market-area-search-config">${scriptJson(marketAreas)}</script>`)
 .replace(/<section\b[^>]*data-restored-markets[^>]*>[\s\S]*?<\/section>/g,'');
await writeFile(file,page);console.log(`Integrated ${marketAreas.length} market areas into cards, filters and place search.`);

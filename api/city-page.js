import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {publicCatalogResult} from './propstack-properties.js';
import {publicReferenceCatalogResult} from './propstack-sold-references.js';
import {matchesMarketCity} from '../assets/market-city-match.mjs';
import {propertyCardHtml} from '../assets/property-card.mjs';
import {referenceCardHtml} from '../assets/reference-seo.mjs';
import {prepareSiteSeo} from '../lib/site-seo.mjs';
import {prepareConsentHtml} from '../lib/consent-html.mjs';
import {robotsFor} from '../lib/seo.mjs';
const cities=[...JSON.parse(readFileSync(new URL('../content/marktgebiete/cities.json',import.meta.url),'utf8')),...JSON.parse(readFileSync(new URL('../content/seo/restored-cities.json',import.meta.url),'utf8'))];
export default async function handler(req,res){
 res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','private, no-store');
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return res.status(405).end();}
 const pathname=new URL(req.url,'https://sls.de').pathname;
 const city=cities.find(city=>city.url===pathname||city.url===`/${req.query?.city}/`);
 if(!city){res.setHeader('X-Robots-Tag',robotsFor(req,{status:404}));return res.status(404).end('Marktgebiet nicht gefunden');}
 let html=prepareSiteSeo(readFileSync(join(process.cwd(),city.url,'index.html'),'utf8'),city.url);
 const [active,references]=await Promise.all([publicCatalogResult(),publicReferenceCatalogResult()]);
 for(const [kind,result,selector,size] of [['active',active,'data-city-active',3],['references',references,'data-city-references',2]]){
  const selected=result.items.filter(item=>matchesMarketCity(item,city.city)).slice(0,size);
  const cards=selected.map(item=>kind==='active'?propertyCardHtml(item,{heading:'h3'}):referenceCardHtml(item)).join('');
  const message=result.status!==200?'Die Immobilien können gerade nicht geladen werden.':selected.length?'':kind==='active'?`Derzeit sind keine aktuellen Angebote in ${city.city} verfügbar.`:`Derzeit sind keine öffentlichen Referenzen in ${city.city} verfügbar.`;
  html=html.replace(new RegExp(`(<div\\b[^>]*\\b${selector}[^>]*>)[\\s\\S]*?<\\/div>`),(_,open)=>open+cards+'</div>')
   .replace(new RegExp(`(<p\\b[^>]*data-city-status="${kind}"[^>]*>)[\\s\\S]*?<\\/p>`),(_,open)=>open+message+'</p>');
 }
 html=html.replace(/<noscript><p>Aktivieren Sie JavaScript,[\s\S]*?<\/p><\/noscript>/g,'');
 res.setHeader('X-Robots-Tag',robotsFor(req));return res.status(200).end(req.method==='HEAD'?'':prepareConsentHtml(html));
}

import {propertyCardHtml} from '../assets/property-card.mjs';
import {objectPath} from '../assets/property-seo.mjs';
import {referencePath,referenceCardHtml} from '../assets/reference-seo.mjs';
import {origin,organizationId,escapeHtml,scriptJson,breadcrumb,replaceMetadata} from './seo.mjs';

export const allowedFilters=['city','marketCity','type','subtype','price','area','rooms','query','sort'];
export function pageNumber(value){return value===null||value===undefined?1:/^[1-9]\d{0,3}$/.test(String(value))?Number(value):null;}
export function pagination(base,page,count,query=new URLSearchParams()){
 const link=(n,label)=>{const params=new URLSearchParams(query);if(n>1)params.set('page',String(n));else params.delete('page');return `<a href="${escapeHtml(base+(params.size?'?'+params:''))}">${escapeHtml(label)}</a>`;};
 if(count<2)return '';
 const shown=new Set([1,count,...Array.from({length:5},(_,i)=>page-2+i).filter(n=>n>0&&n<=count)]);
 return `<nav class="mag-pagination seo-pagination" aria-label="Ergebnisseiten">${page>1?link(page-1,'← Zurück'):''}${[...shown].sort((a,b)=>a-b).map(n=>n===page?`<span aria-current="page">${n}</span>`:link(n,String(n))).join('')}${page<count?link(page+1,'Weiter →'):''}</nav>`;
}
export function renderCatalogPage(template,{kind='properties',items,total,page=1,query=new URLSearchParams(),robots}){
 const refs=kind==='references',size=refs?12:9,base=refs?'/referenzen/':'/immobilien/';
 const params=new URLSearchParams(query);if(page>1)params.set('page',String(page));
 const canonical=origin+base+(params.size?'?'+params:'');
 const title=`${refs?'Verkaufte Immobilien und Referenzen':'Immobilien kaufen'}${page>1?` – Seite ${page}`:''} | SLS Immobilienpartner`;
 const description=refs?'Erfolgreich vermittelte Immobilien von SLS Immobilienpartner im Ruhrgebiet und Rheinland.':'Aktuelle Häuser, Wohnungen und Anlageimmobilien von SLS Immobilienpartner entdecken.';
 const path=refs?referencePath:objectPath;
 const data={'@context':'https://schema.org','@graph':[{'@type':'CollectionPage','@id':canonical+'#webpage',name:title,url:canonical,publisher:{'@id':organizationId},mainEntity:{'@type':'ItemList',itemListElement:items.map((item,i)=>({'@type':'ListItem',position:(page-1)*size+i+1,name:item.title,url:origin+path(item)}))}},breadcrumb([['Startseite','/'],[refs?'Referenzen':'Immobilien',base]])]};
 let html=replaceMetadata(template,{title,description,canonical,robots,image:items[0]?.image||items[0]?.images?.[0],data});
 const cards=items.map(item=>refs?referenceCardHtml(item):propertyCardHtml(item)).join('')||'<p>Derzeit sind keine passenden Immobilien verfügbar.</p>';
 if(refs){
  html=html.replace(/(<div\b[^>]*id="references-grid"[^>]*>)[\s\S]*?<\/div>/,(_,open)=>open+cards+'</div>')
   .replace(/(<nav\b[^>]*id="references-pagination"[^>]*>)[\s\S]*?<\/nav>/,()=>`<div class="references-pagination" id="references-pagination">${pagination(base,page,Math.ceil(total/size))}</div>`)
   .replace(/(<p\b[^>]*id="references-status"[^>]*>)[\s\S]*?<\/p>/,(_,open)=>open+`${total} vermittelte Immobilien</p>`);
 }else{
  html=html.replace('<div id="pp-results" class="pp-grid" aria-live="polite"></div>',()=>`<div id="pp-results" class="pp-grid" aria-live="polite">${cards}</div>`)
   .replace('Immobilien werden geladen …',`${total} Immobilien`)
   .replace('</main>',()=>`${pagination(base,page,Math.ceil(total/size),query)}</main>`);
 }
 return html.replace('</body>',()=>`<script id="sls-catalog-data" type="application/json">${scriptJson({kind,page,total,items})}</script></body>`);
}

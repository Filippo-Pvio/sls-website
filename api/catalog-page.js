import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import properties, {publicCatalogResult} from './propstack-properties.js';
import {queryProperties} from '../lib/property-catalog.mjs';
import {publicReferenceCatalogResult} from './propstack-sold-references.js';
import {prepareConsentHtml} from '../lib/consent-html.mjs';
import {prepareSiteSeo} from '../lib/site-seo.mjs';
import {allowedFilters,pageNumber,renderCatalogPage} from '../lib/catalog-pages.mjs';
import {robotsFor} from '../lib/seo.mjs';
import {propertyDetailResult} from './propstack-properties.js';
import {objectPath} from '../assets/property-seo.mjs';

export default async function handler(req,res){
 res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','private, no-store');
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return res.status(405).end();}
 const url=new URL(req.url,'https://sls.de');
 const refs=url.pathname==='/referenzen/'||req.query?.kind==='references';
 const base=refs?'/referenzen/':'/immobilien/';
 const query=new URLSearchParams();for(const key of allowedFilters)if(url.searchParams.has(key))query.set(key,url.searchParams.get(key).slice(0,160));
 const id=url.searchParams.get('objekt');
 if(!refs&&id){const result=await propertyDetailResult(id);if(result.status===200){res.setHeader('Location',objectPath(result.body.items[0]));return res.status(308).end();}res.setHeader('X-Robots-Tag',robotsFor(req,{status:result.status}));return res.status(result.status).end('Immobilie nicht verfügbar');}
 const page=pageNumber(url.searchParams.get('page'));
 if(!page){res.setHeader('X-Robots-Tag',robotsFor(req,{status:404}));return res.status(404).end('Seite nicht gefunden');}
 const privatePage=['demo','favoriten','ansicht'].some(key=>url.searchParams.has(key))||[...query.keys()].some(key=>key!=='sort')||query.get('sort')&&query.get('sort')!=='default';
 // Propstack rejects some out-of-range pages before returning their totals.
 // Validate later pages against the bounded public snapshot first.
 if(!refs&&page>1&&!url.searchParams.has('demo')&&!url.searchParams.has('favoriten')){
  const snapshot=await publicCatalogResult();
  if(snapshot.status===200&&(page-1)*9>=queryProperties(snapshot.items,Object.fromEntries(query)).length){res.setHeader('X-Robots-Tag',robotsFor(req,{status:404}));return res.status(404).end('Seite nicht gefunden');}
 }
 let status=200,items=[],total=0;
 if(!privatePage||!url.searchParams.has('demo')&&!url.searchParams.has('favoriten')){
  if(refs){const result=await publicReferenceCatalogResult();status=result.status;total=result.items.length;items=result.items.slice((page-1)*12,page*12);}
  else{
   const response={setHeader(){},status(value){status=value;return this;},json(data){items=data.items||[];total=data.total||0;}};
   await properties({method:'GET',query:{...Object.fromEntries(query),page:String(page)}},response);
  }
 }
 if(status===200&&page>1&&!items.length){res.setHeader('X-Robots-Tag',robotsFor(req,{status:404}));return res.status(404).end('Seite nicht gefunden');}
 const robots=robotsFor(req,{status,privatePage});res.setHeader('X-Robots-Tag',robots);
 let html=prepareSiteSeo(readFileSync(join(process.cwd(),base,'index.html'),'utf8'),base);
 if(status!==200){res.setHeader('Retry-After','60');html=html.replace('</main>','<p class="wrap" role="status">Die Immobilien sind gerade nicht abrufbar. Bitte versuchen Sie es später erneut.</p></main>');}
 html=renderCatalogPage(html,{kind:refs?'references':'properties',items,total,page,query,robots});
 res.status(status);return res.end(req.method==='HEAD'?'':prepareConsentHtml(html));
}

import {loadReferenceDetail} from '../lib/reference-detail.mjs';
import {referenceDetailMain} from '../lib/reference-detail-page.mjs';
import {readFileSync} from 'node:fs';
import {publicReferenceCatalogResult} from './propstack-sold-references.js';
import {prepareSiteSeo} from '../lib/site-seo.mjs';
import {prepareConsentHtml} from '../lib/consent-html.mjs';
import {referencePath} from '../assets/reference-seo.mjs';
import {origin,organizationId,escapeHtml,breadcrumb,replaceMetadata,robotsFor} from '../lib/seo.mjs';
export default async function handler(req,res){
 res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','private, no-store');
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return res.status(405).end();}
 const pathname=new URL(req.url,origin).pathname;
 const slug=pathname.match(/^\/referenz\/([^/]+)\/?$/)?.[1]||req.query?.slug||'';
 const id=/-(\d+)$/.exec(slug)?.[1];
 const result=id?await publicReferenceCatalogResult():{status:404,items:[]};
 let item=result.items.find(item=>item.id===id);
 let status=result.status!==200?result.status:item?200:404;
 if(item&&pathname.startsWith('/referenz/')&&pathname!==referencePath(item)){res.setHeader('Location',referencePath(item));return res.status(308).end();}
 if(item){try{item=await loadReferenceDetail(item,process.env.PROPSTACK_PUBLIC_API_KEY||process.env.PROPSTACK_API_KEY)}catch{/* Retain the already public reference photo when detail access is unavailable. */}}
 if(!item&&status===200)status=404;
 const robots=robotsFor(req,{status,privatePage:!pathname.startsWith('/referenz/')});res.setHeader('X-Robots-Tag',robots);
 if(status>=500)res.setHeader('Retry-After','60');
 const title=item?`${item.title} – Referenz in ${item.city} | SLS Immobilienpartner`:'Referenz nicht verfügbar | SLS Immobilienpartner';
 const description=item?`Diese Immobilie in ${item.city} wurde durch SLS Immobilienpartner erfolgreich vermittelt.`:status>=500?'Die Referenz ist vorübergehend nicht abrufbar.':'Unter dieser Adresse ist keine Referenz verfügbar.';
 const canonical=item?origin+referencePath(item):null;
 const data=item?{'@context':'https://schema.org','@graph':[{'@type':'WebPage','@id':canonical+'#webpage',url:canonical,name:title,description,publisher:{'@id':organizationId},about:{'@type':'Place',name:item.title,address:{'@type':'PostalAddress',addressLocality:item.city,addressCountry:'DE'}}},breadcrumb([['Startseite','/'],['Referenzen','/referenzen/'],[item.title,referencePath(item)]])]}:undefined;
 let html=prepareSiteSeo(readFileSync(new URL('../referenzen/index.html',import.meta.url),'utf8'),'/referenzen/');
 html=html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/,()=>referenceDetailMain(item))
  .replace('class="buy-page references-page"','class="buy-page reference-detail-page"')
  .replace('</head>','<link rel="stylesheet" href="/assets/reference-detail.css"></head>')
  .replace(/<script\b[^>]*src="\/assets\/references[^"\s]*"[^>]*><\/script>/g,'')
  .replace('</body>','<script src="/assets/reference-detail.js" defer></script></body>');
 html=replaceMetadata(html,{title,description,canonical,robots,image:item?.image,data});res.status(status);return res.end(req.method==='HEAD'?'':prepareConsentHtml(html));
}

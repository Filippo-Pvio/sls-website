import {publicCatalogResult} from './propstack-properties.js';
import {publicReferenceCatalogResult} from './propstack-sold-references.js';
import {objectPath} from '../assets/property-seo.mjs';
import {referencePath} from '../assets/reference-seo.mjs';
import {origin,escapeHtml} from '../lib/seo.mjs';
export default async function handler(req,res){
 res.setHeader('Content-Type','application/xml; charset=utf-8');
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return res.status(405).end();}
 const refs=new URL(req.url,origin).pathname==='/sitemap-referenzen.xml'||req.query?.kind==='references';
 const result=await (refs?publicReferenceCatalogResult():publicCatalogResult());
 if(result.status!==200){res.setHeader('Cache-Control','no-store');res.setHeader('Retry-After','60');return res.status(503).end('Sitemap vorübergehend nicht verfügbar');}
 const size=refs?12:9,base=refs?'/referenzen/':'/immobilien/',path=refs?referencePath:objectPath;
 const urls=[...result.items.map(path),...Array.from({length:Math.max(0,Math.ceil(result.items.length/size)-1)},(_,i)=>base+'?page='+(i+2))];
 const body=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<url><loc>${escapeHtml(origin+url)}</loc></url>`).join('')}</urlset>`;
 res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=600');return res.status(200).end(req.method==='HEAD'?'':body);
}

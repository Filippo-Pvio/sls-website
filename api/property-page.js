import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {propertyDetailResult} from './propstack-properties.js';
import {renderPropertyPage} from '../lib/property-page.mjs';
import {prepareSiteSeo} from '../lib/site-seo.mjs';
import {robotsFor} from '../lib/seo.mjs';
import {objectPath} from '../assets/property-seo.mjs';

let template;
export default async function handler(req,res){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','private, no-store');
  if(!['GET','HEAD'].includes(req.method)){
    res.setHeader('Allow','GET, HEAD');
    return res.status(405).end();
  }
  // Prefer the requested property path over conflicting query parameters.
  const pathname=new URL(req.url,'https://preview.invalid').pathname;
  const pathSlug=pathname.match(/^\/immobilie\/([^/]+)\/?$/)?.[1];
  const slug=pathSlug||(typeof req.query?.slug==='string'?req.query.slug:'');
  const id=/^[^/]+-(\d+)$/.exec(slug)?.[1];
  const result=id?await propertyDetailResult(id):{status:404,body:{}};
  if(result.status===200&&pathSlug&&pathname!==objectPath(result.body.items[0])){
    res.setHeader('Location',objectPath(result.body.items[0]));return res.status(308).end();
  }
  template??=readFileSync(join(process.cwd(),'immobilien/index.html'),'utf8');
  const robots=robotsFor(req,{status:result.status,privatePage:!pathSlug});
  res.setHeader('X-Robots-Tag',robots);
  const page=renderPropertyPage(prepareSiteSeo(template,'/immobilien/'),result,{robots});
  if(page.status>=500)res.setHeader('Retry-After','60');
  res.status(page.status);
  return res.end(req.method==='HEAD'?'':page.html);
}

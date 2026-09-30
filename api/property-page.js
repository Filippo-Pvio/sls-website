import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {propertyDetailResult} from './propstack-properties.js';
import {renderPropertyPage} from '../lib/property-page.mjs';

let template;
export default async function handler(req,res){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
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
  template??=readFileSync(join(process.cwd(),'immobilien/index.html'),'utf8');
  const page=renderPropertyPage(template,result);
  if(page.status>=500)res.setHeader('Retry-After','60');
  res.status(page.status);
  return res.end(req.method==='HEAD'?'':page.html);
}

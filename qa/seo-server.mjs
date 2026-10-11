// Isolated read-only browser fixture. Every POST is rejected before reaching a handler.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import catalog from '../api/catalog-page.js';
import detail from '../api/property-page.js';
import reference from '../api/reference-page.js';
import city from '../api/city-page.js';
import sitemap from '../api/catalog-sitemap.js';
import retired from '../api/retired-page.js';
import properties from '../api/propstack-properties.js';
import references from '../api/propstack-sold-references.js';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'.site-output');
const config=JSON.parse(await readFile(path.join(root,'vercel.json'),'utf8'));
process.env.PROPSTACK_API_KEY='local-seo-browser-fixture';process.env.VERCEL_ENV='preview';
const row=(id,status=7)=>({id,title:`Wohnung ${id}`,unit_id:`SLS ${id}`,city:'Dorsten',zip_code:'46286',marketing_type:'BUY',archived:false,status:{id:status,name:status===7?'Vermarktung':'Verkauft'},price:150000,living_space:80,number_of_rooms:3,rs_type:'APARTMENT',images:[{is_private:false,medium_url:'https://example.org/public.jpg',big_url:'https://example.org/public.jpg'}],description_note:'Ein öffentliches Testangebot mit Beschreibung und Objektdaten.'});
global.fetch=async input=>{
 const u=new URL(input);
 if(u.hostname!=='api.propstack.de')throw Error('External fetch blocked in fixture');
 if(u.pathname.endsWith('property_statuses'))return {ok:true,json:async()=>[{id:7,name:'Vermarktung'},{id:8,name:'Verkauft'}]};
 if(u.pathname.endsWith('brokers'))return {ok:true,json:async()=>[]};
 if(u.pathname.endsWith('/units')){
  const sold=u.searchParams.get('status')==='8',per=Number(u.searchParams.get('per')||100),page=Number(u.searchParams.get('page')||1);
  let rows=Array.from({length:sold?13:25},(_,i)=>row(i+1,sold?8:7));
  if(u.searchParams.has('property_ids'))rows=rows.filter(r=>String(r.id)===u.searchParams.get('property_ids'));
  return {ok:true,json:async()=>({data:rows.slice((page-1)*per,page*per),meta:{total_count:rows.length}})};
 }
 const id=Number(u.pathname.split('/').pop());return id>0&&id<=25?{ok:true,json:async()=>row(id)}:{ok:false,status:404};
};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.xml':'application/xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf'};
createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  const url=new URL(req.url,'http://localhost'),pathname=url.pathname;
  req.query=Object.fromEntries(url.searchParams);res.status=code=>{res.statusCode=code;return res};res.json=body=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
  const redirect=config.redirects.find(r=>r.source===pathname&&!r.has);
  if(redirect){res.writeHead(308,{Location:redirect.destination}).end();return;}
  const retiredRoute=config.rewrites.some(r=>r.source===pathname&&r.destination==='/api/retired-page');
  if(retiredRoute)return retired(req,res);
  if(pathname==='/immobilien/'||pathname==='/referenzen/')return catalog(req,res);
  if(pathname.startsWith('/immobilie/'))return detail(req,res);
  if(pathname.startsWith('/referenz/'))return reference(req,res);
  if(config.rewrites.some(r=>r.source===pathname&&r.destination.startsWith('/api/city-page')))return city(req,res);
  if(['/sitemap-immobilien.xml','/sitemap-referenzen.xml'].includes(pathname))return sitemap(req,res);
  if(/^\/api\/propstack-properties\/?$/.test(pathname))return properties(req,res);
  if(/^\/api\/propstack-sold-references\/?$/.test(pathname))return references(req,res);
  if(pathname.startsWith('/api/'))return res.status(503).json({available:false,items:[],references:[]});
  let file=path.resolve(output,'.'+decodeURIComponent(pathname));if(!file.startsWith(output+path.sep)&&file!==output)return res.status(404).end();
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.statusCode=200;res.end(req.method==='HEAD'?'':await readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
}).listen(4283,'127.0.0.1',()=>console.log('SEO read-only fixture: http://127.0.0.1:4283'));

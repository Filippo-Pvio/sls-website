import {readFile,writeFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {origin,escapeHtml} from '../lib/seo.mjs';
const root=path.resolve(import.meta.dirname,'..');
const site=await readFile(path.join(root,'assets/site.js'),'utf8');
const header={innerHTML:''},footer={innerHTML:'',classList:{add(){}}};
const context={window:{location:{pathname:'/'}},location:{pathname:'/'},document:{body:{classList:{contains:()=>false}},querySelector:selector=>selector==='[data-site-header]'?header:footer},Date};
vm.runInNewContext(site.slice(0,site.indexOf('// Resolve the real closing surface')),context);
await writeFile(path.join(root,'config/site-navigation.json'),JSON.stringify({header:header.innerHTML,footer:footer.innerHTML},null,2)+'\n');
const {prepareSiteSeo}=await import('../lib/site-seo.mjs');
export const output=path.join(root,'.site-output');
export async function buildSeo(){
 const articles=JSON.parse(await readFile(path.join(root,'content/magazin/articles.json'),'utf8'));
 const pages=[];
 for(const file of (await readdir(output,{recursive:true})).filter(file=>file==='index.html'||file.endsWith('/index.html')).sort()){
   const url=file==='index.html'?'/':'/'+file.slice(0,-10);
   let html=await readFile(path.join(output,file),'utf8');
   html=prepareSiteSeo(html,url);await writeFile(path.join(output,file),html);
   if(/<meta[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html))continue;
   let lastmod=articles.find(a=>url===`/${a.slug}/`)?.dateModified;
   if(!lastmod){try{lastmod=execFileSync('git',['log','-1','--format=%cs','--',file],{cwd:root,encoding:'utf8'}).trim();}catch{}}
   pages.push({url,lastmod});
 }
 const urls=pages.map(p=>`  <url><loc>${escapeHtml(origin+p.url)}</loc>${p.lastmod?`<lastmod>${p.lastmod}</lastmod>`:''}</url>`).join('\n');
 await writeFile(path.join(output,'sitemap-static.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
 await writeFile(path.join(output,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['static','immobilien','referenzen'].map(kind=>`<sitemap><loc>${origin}/sitemap-${kind}.xml</loc></sitemap>`).join('')}</sitemapindex>\n`);
 console.log(`SEO built: ${pages.length} indexable static pages, full navigation and linked entity data.`);
}

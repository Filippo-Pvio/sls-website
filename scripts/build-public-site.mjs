import {prepareConsentHtml} from '../lib/consent-html.mjs';
import {readdir,cp,mkdir,rm,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'.site-output');
await import('./build-restored-cities.mjs');
await import('./build-videos.mjs');
const excluded=new Set(['output','api','lib','config','docs','qa','scripts','services','integrations','node_modules','content','qa-artifacts','test-results','playwright-report']);
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
for(const entry of await readdir(root,{withFileTypes:true})){
 if(entry.name.startsWith('.')||excluded.has(entry.name))continue;
 if(entry.isDirectory())await cp(path.join(root,entry.name),path.join(output,entry.name),{recursive:true,filter:source=>!source.endsWith('.md')});
 else if(/\.(?:html|xml|txt|ico|webmanifest)$/.test(entry.name))await cp(path.join(root,entry.name),path.join(output,entry.name));
}
console.log('Public site built without backend sources, tests or internal documentation.');

for(const file of await readdir(output,{recursive:true}))if(file.endsWith('.html')){const name=path.join(output,file);await writeFile(name,prepareConsentHtml(await readFile(name,'utf8')));}
const {buildSeo}=await import('./build-seo.mjs');
await buildSeo();
// Vercel serves existing static files before fallback rewrites. Keep templates
// in the function bundle, but remove their public copies so SSR wins routing.
const routes=JSON.parse(await readFile(path.join(root,'vercel.json'),'utf8'));
for(const route of routes.rewrites||[])if(/^\/api\/(?:catalog-page|city-page)(?:\?|$)/.test(route.destination)){
 await rm(path.join(output,route.source,'index.html'),{force:true});
}

const {buildTrackingQa}=await import('./build-tracking-qa.mjs');
await buildTrackingQa({root,output});

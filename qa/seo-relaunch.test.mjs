import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import catalog from '../api/catalog-page.js';
import detail from '../api/property-page.js';
import reference from '../api/reference-page.js';
import city from '../api/city-page.js';
import sitemap from '../api/catalog-sitemap.js';
import retired from '../api/retired-page.js';
import {objectPath} from '../assets/property-seo.mjs';
import {referencePath} from '../assets/reference-seo.mjs';
import {robotsFor,scriptJson} from '../lib/seo.mjs';

const row=(id,status=7)=>({id,title:`Wohnung ${id}`,unit_id:`SLS ${id}`,city:'Dorsten',zip_code:'46286',marketing_type:'BUY',archived:false,status:{id:status,name:status===7?'Vermarktung':'Verkauft'},price:150000,living_space:80,number_of_rooms:3,rs_type:'APARTMENT',images:[{is_private:false,medium_url:'https://example.org/public.jpg',big_url:'https://example.org/public.jpg'},{is_private:true,big_url:'https://example.org/private.jpg'}],description:'Öffentliches Angebot'});
async function run(handler,url,{host='sls.de',method='GET',offline=false}={}){
 const previous=global.fetch,key=process.env.PROPSTACK_API_KEY;
 process.env.PROPSTACK_API_KEY='seo-fixture-'+(offline?'offline':'public');
 const calls=[];
 global.fetch=async(input,options)=>{
  assert.equal(options?.method,undefined,'All SEO queries must be read-only');
  const u=new URL(input);calls.push(u);
  if(offline)throw Error('synthetic outage');
  if(u.pathname.endsWith('property_statuses'))return {ok:true,json:async()=>[{id:7,name:'Vermarktung'},{id:8,name:'Verkauft'},{id:9,name:'Reserviert'}]};
  if(u.pathname.endsWith('/units')){
   const sold=u.searchParams.get('status')==='8';
   let rows=Array.from({length:sold?13:25},(_,i)=>row(i+1,sold?8:7));
   if(u.searchParams.has('property_ids'))rows=rows.filter(r=>String(r.id)===u.searchParams.get('property_ids'));
   const page=Number(u.searchParams.get('page')||1),per=Number(u.searchParams.get('per')||100);
   return {ok:true,json:async()=>({data:rows.slice((page-1)*per,page*per),meta:{total_count:rows.length}})};
  }
  if(/\/units\/\d+$/.test(u.pathname))return {ok:true,json:async()=>row(Number(u.pathname.split('/').pop()))};
  throw Error('Unexpected upstream route');
 };
 const res={headers:{},status(value){this.code=value;return this},setHeader(key,value){this.headers[key.toLowerCase()]=value},end(body=''){this.body=body;return this}};
 try{await handler({url,method,headers:{host},query:Object.fromEntries(new URL(url,'https://sls.de').searchParams)},res);return {...res,calls};}
 finally{global.fetch=previous;if(key===undefined)delete process.env.PROPSTACK_API_KEY;else process.env.PROPSTACK_API_KEY=key;}
}
test('production HTML exposes linked objects without JavaScript; later pages have distinct canonicals and content',async()=>{
 const first=await run(catalog,'/immobilien/'),second=await run(catalog,'/immobilien/?page=2');
 assert.equal(first.code,200);assert.match(first.headers['x-robots-tag'],/^index/);
 assert.equal((first.body.match(/class="pp-card-shell"/g)||[]).length,9);
 assert.match(first.body,/wohnung-1-dorsten-sls-1-1/);assert.doesNotMatch(second.body,/data-property-id="1"/);
 assert.match(second.body,/https:\/\/sls.de\/immobilien\/\?page=2/);assert.match(second.body,/Seite 2/);assert.match(first.body,/href="\/immobilien\/\?page=2"/);
 assert.doesNotMatch(first.body,/private.jpg|seo-fixture/);
});
test('previews, private filters and API failures never become indexable; invalid/out-of-range pages return real statuses',async()=>{
 for(const [url,host] of [['/immobilien/','preview.vercel.app'],['/immobilien/?favoriten=1','sls.de'],['/immobilien/?city=Dorsten','sls.de']])assert.match((await run(catalog,url,{host})).headers['x-robots-tag'],/^noindex/);
 assert.equal((await run(catalog,'/immobilien/?page=0')).code,404);assert.equal((await run(catalog,'/immobilien/?page=9')).code,404);
 const failed=await run(catalog,'/immobilien/',{offline:true});assert.equal(failed.code,502);assert.match(failed.headers['x-robots-tag'],/^noindex/);assert.equal(failed.headers['retry-after'],'60');
 assert.equal(robotsFor({headers:{host:'preview.vercel.app','x-forwarded-host':'sls.de'}}),'noindex, follow');
});
test('correct property paths index only on production; wrong slugs redirect and there is only one H1',async()=>{
 const p={id:'1',title:'Wohnung 1',city:'Dorsten',reference:'SLS 1'};
 const page=await run(detail,objectPath(p));assert.equal(page.code,200);assert.match(page.headers['x-robots-tag'],/^index/);assert.equal((page.body.match(/<h1\b/g)||[]).length,1);
 assert.match(page.body,/https:\/\/sls.de\/#organization/);
 const wrong=await run(detail,'/immobilie/falsch-1/');assert.equal(wrong.code,308);assert.equal(wrong.headers.location,objectPath(p));
 const preview=await run(detail,objectPath(p),{host:'preview.vercel.app'});assert.match(preview.headers['x-robots-tag'],/^noindex/);
 assert.equal((await run(detail,'/immobilie/nicht-vorhanden-999/')).code,410);
});
test('reference pages are public-only historical evidence without active Offer markup; reference navigation is crawlable',async()=>{
 const list=await run(catalog,'/referenzen/?page=2');assert.equal(list.code,200);assert.match(list.body,/href="\/referenz\//);assert.match(list.body,/href="\/referenzen\/"/);
 const item={id:'1',title:'Wohnung 1',city:'Dorsten'};
 const page=await run(reference,referencePath(item));assert.equal(page.code,200);assert.match(page.body,/bereits vermittelte Immobilie/);assert.doesNotMatch(page.body,/"@type":"Offer"|private.jpg|150000/);
 assert.equal((await run(reference,'/referenz/falsch-1/')).code,308);
 assert.equal((await run(reference,'/referenz/nicht-vorhanden-999/')).code,404);
});
test('city source HTML contains actual local evidence and links, plus organization and service relationships',async()=>{
 const page=await run(city,'/immobilienmakler-dorsten/');assert.equal(page.code,200);assert.match(page.body,/href="\/immobilie\//);assert.match(page.body,/href="\/referenz\//);assert.match(page.body,/"@type":"Service"/);assert.match(page.body,/"@type":"City"/);
 assert.equal((await run(city,'/immobilienmakler-erfunden/')).code,404);
});
test('dynamic XML lists only public catalog objects and pagination, and outages return 503 rather than an empty sitemap',async()=>{
 const active=await run(sitemap,'/sitemap-immobilien.xml');assert.equal(active.code,200);assert.equal((active.body.match(/<loc>/g)||[]).length,27);
 assert.match(active.body,/immobilien\/\?page=2/);assert.doesNotMatch(active.body,/private|vercel.app|api\//);
 const refs=await run(sitemap,'/sitemap-referenzen.xml');assert.equal((refs.body.match(/<loc>/g)||[]).length,14);
 assert.equal((await run(sitemap,'/sitemap-immobilien.xml',{offline:true})).code,503);
 assert.equal((await run(sitemap,'/sitemap-immobilien.xml',{method:'HEAD'})).body,'');
});
test('all generated public HTML has one H1, complete canonical/entity data and server-rendered navigation',async()=>{
 const output=new URL('../.site-output/',import.meta.url),pages=(await readdir(output,{recursive:true})).filter(p=>p==='index.html'||p.endsWith('/index.html'));
 for(const file of pages){
  const html=await readFile(new URL(file,output),'utf8');
  assert.equal((html.match(/<h1\b/g)||[]).length,1,file);
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1,file);
  assert.match(html,/<header[^>]*data-site-header[^>]*>[\s\S]*?href="\/verkaufen\/"/,file);
  for(const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g))JSON.parse(match[1]);
  assert.match(html,/https:\/\/sls.de\/#organization/,file);
 }
 const routes=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 for(const route of routes.rewrites.filter(r=>/^\/api\/(?:catalog-page|city-page)(?:\?|$)/.test(r.destination)))assert.ok(!pages.includes(route.source.slice(1)+'index.html'),`${route.source}: static output must not shadow SSR`);
 const staticXml=await readFile(new URL('sitemap-static.xml',output),'utf8');
 assert.match(staticXml,/team\/filippo-livera/);assert.match(staticXml,/immobilienmakler-heiden/);assert.match(staticXml,/verkaufscheck/);assert.doesNotMatch(staticXml,/immobilien-test|datenschutz/);
 const profile=await readFile(new URL('team/filippo-livera/index.html',output),'utf8');assert.match(profile,/"@type":"ProfilePage"/);assert.match(profile,/"@type":"Person"/);
 const shared=await readFile(new URL('buero-duesseldorf/index.html',output),'utf8');assert.match(shared,/Shared Office/);assert.doesNotMatch(shared,/openingHours|aggregateRating/);
});
test('every historic URL has an explicit migration decision; redirects never loop or chain through another redirect',async()=>{
 const report=JSON.parse(await readFile(new URL('../content/seo/migration-status.json',import.meta.url),'utf8'));
 assert.equal(report.urls.length,636);assert.ok(report.urls.every(x=>['retained','redirect','retired'].includes(x.state)));
 const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 const redirects=new Map(config.redirects.map(r=>[r.source,r.destination]));
 for(const [from,to] of redirects){assert.notEqual(from,to);assert.ok(!redirects.has(to),`${from} chains through ${to}`);}
 for(const item of report.urls.filter(r=>r.state==='retired'))assert.ok(config.rewrites.some(r=>r.source===item.source&&r.destination==='/api/retired-page'));
 const page=await run(retired,'/old-page/');assert.equal(page.code,410);assert.match(page.headers['x-robots-tag'],/^noindex/);
 assert.equal(scriptJson({text:'</script>'}).includes('</script>'),false);
});

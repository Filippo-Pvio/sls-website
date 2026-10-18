import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {canonicalMediaPath,createLegacyMediaHandler,fetchLegacyMedia,legacyLookup,MAX_MEDIA_BYTES} from '../lib/legacy-media.mjs';

const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const file='/wp-content/uploads/2026/02/Broschuere_web.pdf';
function response(){return {headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(n){this.code=n;return this;},end(body=''){this.body=body;return this;}};}
const media={status:200,type:'application/pdf',body:Buffer.from('%PDF-fixture')};

test('new property aliases distinguish identical titles by public identity and update active/reference canonicals',async()=>{
 const decisions=await read('content/seo/relaunch-decisions.json'),config=await read('vercel.json');
 for(const row of decisions.decisions){
  if(row.state==='redirect'){
   assert.ok(config.redirects.some(r=>r.source===row.source&&r.destination===row.destination&&r.permanent));
   assert.ok(!config.redirects.some(r=>r.source===row.destination),'no intermediate redirect');
  }else{
   assert.ok(!config.redirects.some(r=>r.source===row.source),'retirement must not be shadowed by a stale redirect');
   assert.ok(config.rewrites.some(r=>r.source===row.source&&r.destination==='/api/retired-page'));
  }
 }
 const twins=decisions.decisions.filter(r=>r.source.startsWith('/immobilie/nur-fuer-kurze-zeit-wo-geschichte'));
 assert.equal(twins.length,2);assert.equal(new Set(twins.map(r=>r.destination)).size,2);
 const reference=decisions.decisions.find(r=>r.destination?.endsWith('-4131762/'));assert.match(reference.destination,/^\/referenz\//);
 const legacy=await read('content/seo/legacy-urls.json'),report=await read('content/seo/migration-status.json');
 assert.equal(new Set(legacy.urls).size,650);assert.equal(report.urls.length,650);
});

test('media allowlist covers archived public assets, excludes known missing thumbnails and is internal-only',async()=>{
 const manifest=await read('content/seo/legacy-media-paths.json');
 assert.equal(manifest.paths.length,24102);assert.equal(new Set(manifest.paths).size,manifest.paths.length);
 assert.ok(manifest.paths.includes(file));assert.ok(manifest.paths.every(p=>canonicalMediaPath(encodeURI(p))===p));
 assert.ok(!manifest.paths.some(p=>p.includes('elementor/thumbs/bg_ploen-')));
 const config=await read('vercel.json');assert.ok(config.rewrites.some(r=>r.source==='/wp-content/uploads/:path*'&&r.destination==='/api/legacy-media?path=:path*'));
 assert.equal(config.functions['api/legacy-media.js'].includeFiles,'content/seo/legacy-media-paths.json');
});

test('only known upload paths can reach the origin; traversal, arbitrary URLs and writes are rejected before I/O',async()=>{
 const calls=[];const handler=createLegacyMediaHandler([file],{fetchMedia:async path=>{calls.push(path);return media;}});
 for(const path of ['/wp-admin/','/wp-content/uploads/../../private.pdf','/wp-content/uploads/%2e%2e/private.pdf','/wp-content/uploads/%00.pdf','/wp-content/uploads/x.svg','/wp-content/uploads/not-listed.pdf']){
  const res=response();await handler({method:'GET',url:path},res);assert.equal(res.code,404,path);
 }
 for(const path of ['https://evil.invalid/a.pdf','../private.pdf',['2026/02/Broschuere_web.pdf']]){
  const res=response();await handler({method:'GET',url:'/api/legacy-media',query:{path}},res);assert.equal(res.code,404);
 }
 const post=response();await handler({method:'POST',url:file},post);assert.equal(post.code,405);assert.deepEqual(calls,[]);
 const ok=response();await handler({method:'GET',url:file+'?path=../../private.pdf',headers:{cookie:'private',authorization:'secret','x-forwarded-for':'private'}},ok);
 assert.equal(ok.code,200);assert.deepEqual(calls,[file]);assert.equal(ok.headers['set-cookie'],undefined);
 assert.match(ok.headers['cache-control'],/^public/);assert.equal(ok.headers['content-type'],'application/pdf');assert.equal(ok.headers['x-content-type-options'],'nosniff');
 const head=response();await handler({method:'HEAD',url:'/api/legacy-media',query:{path:'2026/02/Broschuere_web.pdf'}},head);assert.equal(head.code,200);assert.equal(head.body,'');assert.equal(head.headers['content-length'],media.body.length);
});

test('missing media stays 404; origin failure, oversized body and timeout are noncacheable 502 responses',async()=>{
 for(const value of [{status:404},{status:301},{status:502},{status:200,body:Buffer.alloc(MAX_MEDIA_BYTES+1)}]){
  const handler=createLegacyMediaHandler([file],{fetchMedia:async()=>value});const res=response();await handler({method:'GET',url:file},res);
  assert.equal(res.code,value.status===404?404:502);assert.equal(res.headers['cache-control'],'no-store');
 }
 const handler=createLegacyMediaHandler([file],{fetchMedia:async()=>{throw Error('TLS verification failed');}});const res=response();await handler({method:'GET',url:file},res);
 assert.equal(res.code,502);assert.equal(res.headers['retry-after'],'60');assert.equal(res.body,'');
});

function transport({status=200,type='application/pdf',body=media.body,length}={},inspect=()=>{}){
 return (options,callback)=>{
  inspect(options);const req=new EventEmitter();req.destroy=()=>{};
  req.end=()=>queueMicrotask(()=>{const res=Readable.from([body]);res.statusCode=status;res.headers={'content-type':type,...(length?{'content-length':length}:{})};callback(res);});
  return req;
 };
}
test('origin reads pin DNS without disabling TLS and never forward browser state or follow redirects',async()=>{
 const result=await fetchLegacyMedia(file,{request:transport({},options=>{
  assert.equal(options.hostname,'sls.de');assert.equal(options.servername,'sls.de');assert.equal(options.rejectUnauthorized,true);assert.equal(options.method,'GET');assert.equal(options.path,file);
  assert.equal(options.headers.cookie,undefined);assert.equal(options.headers.authorization,undefined);assert.equal(options.headers['x-forwarded-for'],undefined);
  options.lookup('sls.de',{},(error,address,family)=>{assert.equal(error,null);assert.equal(address,'185.175.196.36');assert.equal(family,4);});
  options.lookup('sls.de',{all:true},(error,addresses)=>{assert.equal(error,null);assert.deepEqual(addresses,[{address:'185.175.196.36',family:4}]);});
 })});assert.equal(result.status,200);assert.deepEqual(result.body,media.body);
 let error;legacyLookup('evil.invalid',{},e=>{error=e;});assert.ok(error);
 assert.equal((await fetchLegacyMedia(file,{request:transport({status:302})})).status,502);
 await assert.rejects(fetchLegacyMedia(file,{request:transport({type:'text/html'})}));
 await assert.rejects(fetchLegacyMedia(file,{request:transport({length:MAX_MEDIA_BYTES+1})}));
 await assert.rejects(fetchLegacyMedia(file,{request:transport({body:Buffer.alloc(MAX_MEDIA_BYTES+1)})}));
});

test('an origin that never answers is stopped instead of leaving the request open',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let destroyed=false;
 const pending=fetchLegacyMedia(file,{request:()=>{
  const req=new EventEmitter();req.end=()=>{};req.destroy=()=>{destroyed=true;};return req;
 }});
 const checked=assert.rejects(pending,/Media timeout/);
 t.mock.timers.tick(10_000);await checked;assert.equal(destroyed,true);
});

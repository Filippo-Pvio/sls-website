import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

test('a reviewed successor restores a retired alias and survives repeated migration builds',async()=>{
 const fixture=await mkdtemp(path.join(tmpdir(),'sls-migration-'));
 const source='/immobilie/frueheres-angebot/',destination='/referenz/passender-nachfolger-123/';
 const discovered='/immobilie/erst-in-search-console-gefunden/';
 const json=async(file,value)=>writeFile(path.join(fixture,file),JSON.stringify(value));
 try{
  for(const dir of ['scripts','assets','content/seo','content/team','content/marktgebiete'])await mkdir(path.join(fixture,dir),{recursive:true});
  for(const file of ['scripts/build-migration.mjs','assets/property-seo.mjs','assets/reference-seo.mjs'])await copyFile(new URL('../'+file,import.meta.url),path.join(fixture,file));
  await json('vercel.json',{redirects:[],rewrites:[{source,destination:'/api/retired-page'},{source:'/immobilie/:slug/',destination:'/api/property-page'}]});
  await json('content/seo/legacy-urls.json',{retrievedAt:'2026-10-11',urls:['https://sls.de'+source]});
  await json('content/seo/legacy-property-mapping.json',[]);
  await json('content/seo/legacy-properties-review.json',[{url:'https://sls.de'+source}]);
  await json('content/seo/relaunch-decisions.json',{decisions:[{source,state:'redirect',destination},{source:discovered,state:'redirect',destination:'/immobilie/aktuelles-angebot-456/'}]});
  for(const file of ['content/team/profiles.json','content/marktgebiete/cities.json','content/seo/restored-cities.json'])await json(file,[]);
  const build=()=>execFileSync(process.execPath,['scripts/build-migration.mjs'],{cwd:fixture});
  build();
  const configText=await readFile(path.join(fixture,'vercel.json'),'utf8');
  const config=JSON.parse(configText),report=JSON.parse(await readFile(path.join(fixture,'content/seo/migration-status.json'),'utf8'));
  assert.ok(config.redirects.some(row=>row.source===source&&row.destination===destination&&row.permanent));
  assert.ok(!config.rewrites.some(row=>row.source===source),'obsolete 410 route removed');
  assert.ok(config.rewrites.some(row=>row.source==='/immobilie/:slug/'),'generic detail routing preserved');
  assert.deepEqual(report.urls.map(row=>[row.source,row.state]),[[source,'redirect'],[discovered,'redirect']]);
  build();
  assert.equal(await readFile(path.join(fixture,'vercel.json'),'utf8'),configText,'repeat generation must not reintroduce 410 or duplicate rules');
 }finally{await rm(fixture,{recursive:true,force:true});}
});

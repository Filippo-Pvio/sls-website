import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));

test('new property aliases distinguish identical titles by public identity and update active/reference canonicals',async()=>{
 const decisions=await read('content/seo/relaunch-decisions.json'),config=await read('vercel.json');
 for(const row of decisions.decisions){
  if(row.state==='redirect'){
   assert.ok(config.redirects.some(r=>r.source===row.source&&r.destination===row.destination&&r.permanent));
   assert.ok(!config.redirects.some(r=>r.source===row.destination),'no intermediate redirect');
   assert.ok(!config.rewrites.some(r=>r.source===row.source&&r.destination==='/api/retired-page'),'a restored alias must not retain a retirement rule');
  }else{
   assert.ok(!config.redirects.some(r=>r.source===row.source),'retirement must not be shadowed by a stale redirect');
   assert.ok(config.rewrites.some(r=>r.source===row.source&&r.destination==='/api/retired-page'));
   if(row.source.startsWith('/immobilie/'))assert.ok(config.rewrites.findIndex(r=>r.source===row.source)<config.rewrites.findIndex(r=>r.source==='/immobilie/:slug/'),'retirement must precede generic slug routing');
  }
 }
 const twins=decisions.decisions.filter(r=>r.source.startsWith('/immobilie/nur-fuer-kurze-zeit-wo-geschichte'));
 assert.equal(twins.length,2);assert.equal(new Set(twins.map(r=>r.destination)).size,2);
 const reference=decisions.decisions.find(r=>r.destination?.endsWith('-4131762/'));assert.match(reference.destination,/^\/referenz\//);
 const legacy=await read('content/seo/legacy-urls.json'),report=await read('content/seo/migration-status.json');
 assert.equal(new Set(legacy.urls).size,650);
 const sources=new Set([...legacy.urls.map(url=>new URL(url).pathname),...decisions.decisions.map(row=>row.source)]);
 assert.deepEqual(new Set(report.urls.map(row=>row.source)),sources);
 for(const row of decisions.decisions)assert.equal(report.urls.find(item=>item.source===row.source)?.state,row.state);
});

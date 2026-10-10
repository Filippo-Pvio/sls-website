import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {buildCompanyKnowledge} from '../scripts/build-sia-company.mjs';
const require=createRequire(import.meta.url);
const {companyAnswer,companySources}=require('../services/frag-sls/lib/company-knowledge.js');
const root=resolve(import.meta.dirname,'..');
const snapshot=JSON.parse(await readFile(resolve(root,'services/frag-sls/data/website-company.json'),'utf8'));
async function fixture(run){
 const folder=await mkdtemp(resolve(tmpdir(),'sls-sia-company-'));
 try{
  const files=new Set(snapshot.flatMap(source=>Object.keys(source.sourceHashes)));
  for(const file of files){await mkdir(dirname(resolve(folder,file)),{recursive:true});await copyFile(resolve(root,file),resolve(folder,file));}
  await mkdir(resolve(folder,'services/frag-sls/data'),{recursive:true});
  await writeFile(resolve(folder,'services/frag-sls/data/website-company.json'),'stale sentinel');
  await run(folder);
 }finally{await rm(folder,{recursive:true,force:true});}
}
const replace=async(folder,file,from,to)=>{const path=resolve(folder,file),text=await readFile(path,'utf8');assert.ok(text.includes(from),`${file} fixture replacement`);await writeFile(path,text.replaceAll(from,to));};
test('a new member and changed role/biography are reflected in the generated answers',()=>fixture(async folder=>{
 const source=await readFile(resolve(folder,'team/uwe-braun/index.html'),'utf8');
 const profile=source.replaceAll('Uwe Braun','Testperson Neubau').replaceAll('uwe-braun','testperson-neubau').replaceAll('Immobilienmakler','Immobilienberater für Neubau');
 await mkdir(resolve(folder,'team/testperson-neubau'),{recursive:true});await writeFile(resolve(folder,'team/testperson-neubau/index.html'),profile);
 await replace(folder,'team/index.html','</main>','<a href="/team/testperson-neubau/" class="team-member"><h3>Testperson Neubau</h3><p>Immobilienberater für Neubau</p></a></main>');
 await replace(folder,'team/index.html','Social Media Managerin &amp; Back Office','Leitung Kommunikation');
 await replace(folder,'team/sophia-peter/index.html','Social Media Managerin','Leitung Kommunikation');
 const records=await buildCompanyKnowledge({root:folder,releaseSha:'test-release'});
 assert.equal(records.find(source=>source.id==='company-team').members.length,snapshot.find(source=>source.id==='company-team').members.length+1);
 assert.match(companyAnswer('Wer ist Testperson Neubau?',records).answer,/Immobilienberater für Neubau/);
 assert.match(companyAnswer('Wer ist Sophia Peter?',records).answer,/Leitung Kommunikation/);
 assert.equal(records[0].releaseSha,'test-release');
 assert.deepEqual(JSON.parse(await readFile(resolve(folder,'services/frag-sls/data/website-company.json'),'utf8')),records);
}));
test('removed people disappear even if an old profile file remains on disk',()=>fixture(async folder=>{
 const file=resolve(folder,'team/index.html');const html=await readFile(file,'utf8');
 await writeFile(file,html.replace(/<a\b[^>]*href="\/team\/uwe-braun\/"[^>]*>[^]*?<\/a>/,''));
 const records=await buildCompanyKnowledge({root:folder});
 assert.ok(!records.some(source=>source.id==='company-person-uwe-braun'));
 assert.ok(!records.find(source=>source.id==='company-team').text.includes('Uwe Braun'));
 assert.equal(companySources('Wer ist Uwe Braun?',records).filter(source=>source.id.startsWith('company-person-')).length,0);
 assert.equal(companyAnswer('Wer ist Uwe Braun?',records),null);
}));
test('contact, office, region and qualification changes reach answers without fixed copies',()=>fixture(async folder=>{
 await replace(folder,'kontakt/index.html','Ubierweg 2','Teststraße 88');
 await replace(folder,'kontakt/index.html','02369 742 80 20','02369 123 45 67');
 await replace(folder,'kontakt/index.html','service@sls.de','test-service@sls.de');
 await replace(folder,'standorte/index.html','Münsterland','Testregion');
 await replace(folder,'team/index.html','Immobilienmakler (IHK)','Immobilienberater');
 const records=await buildCompanyKnowledge({root:folder});
 const answer=companyAnswer('Wo ist SLS vertreten?',records).answer;
 assert.match(answer,/Teststraße 88/);assert.match(answer,/02369 123 45 67/);assert.match(answer,/test-service@sls.de/);assert.match(answer,/Testregion/);
 assert.ok(!answer.includes('Ubierweg 2'));
 assert.ok(!companyAnswer('Wie seriös ist SLS?',records).answer.includes('IHK'));
}));
test('new explicit founding and total sales statements replace missing-data answers',()=>fixture(async folder=>{
 await replace(folder,'ueber-uns/index.html','</main>','<p>SLS Immobilienpartner wurde im Jahr 2012 gegründet.</p></main>');
 await replace(folder,'referenzen/index.html','</main>','<p>SLS Immobilienpartner hat insgesamt 1250 Immobilien verkauft.</p></main>');
 const records=await buildCompanyKnowledge({root:folder});
 assert.match(companyAnswer('Seit wann gibt es SLS?',records).answer,/2012/);
 assert.match(companyAnswer('Wie viele Immobilien hat SLS verkauft?',records).answer,/1250/);
}));
test('a missing linked profile aborts the build and never replaces the previous snapshot',()=>fixture(async folder=>{
 await rm(resolve(folder,'team/uwe-braun/index.html'));
 await assert.rejects(buildCompanyKnowledge({root:folder}),/ENOENT/);
 assert.equal(await readFile(resolve(folder,'services/frag-sls/data/website-company.json'),'utf8'),'stale sentinel');
}));
test('empty or duplicate team directories fail instead of publishing stale or conflicting people',()=>fixture(async folder=>{
 const file=resolve(folder,'team/index.html');const original=await readFile(file,'utf8');
 await writeFile(file,original.replaceAll('team-member reveal','other-card'));
 await assert.rejects(buildCompanyKnowledge({root:folder}),/empty team directory/);
 await writeFile(file,original.replace('</main>','<a class="team-member" href="/team/uwe-braun/"><h3>Uwe Braun</h3><p>Makler</p></a></main>'));
 await assert.rejects(buildCompanyKnowledge({root:folder}),/duplicate team profile/);
}));
test('both deployment projects regenerate the snapshot on every build',async()=>{
 const website=JSON.parse(await readFile(resolve(root,'vercel.json'),'utf8'));
 const backend=JSON.parse(await readFile(resolve(root,'services/frag-sls/vercel.json'),'utf8'));
 assert.equal(website.buildCommand,'node scripts/build-magazine.mjs && node scripts/build-sia-company.mjs && node scripts/build-public-site.mjs');
 assert.equal(backend.buildCommand,'node ../../scripts/build-sia-company.mjs');
 const ignore=await readFile(resolve(root,'services/frag-sls/.vercelignore'),'utf8');
 assert.ok(ignore.includes('!scripts/build-sia-company.mjs'));
 assert.ok(!ignore.split('\n').includes('scripts/'));
});

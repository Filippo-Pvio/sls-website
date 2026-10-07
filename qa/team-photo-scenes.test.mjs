import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const mapping=JSON.parse(fs.readFileSync('content/team-photos.json'));
const script=fs.readFileSync('assets/site.js','utf8').split('// TEAM-PHOTOS:END')[0];
function resolve(pathname,magazine=false){const context={window:{},location:{pathname},document:{body:{classList:{contains:()=>magazine}}}};vm.runInNewContext(script,context);return context.window.slsSceneImage;}
test('all supplied photos load at the intended sizes; rotating scenes avoid rejected logo assets',()=>{
 const resolveImage=resolve('/');
 for(const [old,photo] of Object.entries(mapping)){
  for(const width of [900,1280])assert.ok(fs.existsSync(`assets/images/${photo.scene}-${width}.webp`));
  if(old.startsWith('home/'))continue;
  assert.equal(resolveImage(`/assets/images/${old}-1536.webp`),`/assets/images/${photo.scene}-1280.webp`);
  assert.equal(resolveImage(`/assets/images/${old}-900.webp`),`/assets/images/${photo.scene}-900.webp`);
 }
 assert.equal(resolveImage('/assets/images/hero-scenes/viewing-1536.webp'),'/assets/images/hero-scenes/viewing-1536.webp');
});
test('individual profiles and magazine keep their original image behavior and files',()=>{
 for(const pathname of ['/team/mischa-stratmann/','/team/nico-hryn/','/blog/']){
  const original='/assets/images/hero-scenes/consultation-1536.webp';assert.equal(resolve(pathname,pathname==='/blog/')(original),original);
 }
 const changed=execFileSync('git',['diff','--name-only','origin/main'],{encoding:'utf8'}).split('\n');
 const magazine=new Set(JSON.parse(fs.readFileSync('content/magazin/generated.json')).map(x=>x.path));
 assert.ok(!changed.some(p=>p.startsWith('team/')||p.startsWith('assets/images/magazin/')||p.startsWith('content/magazin/')||magazine.has(p)));
});
test('central rewrite is idempotent and remains applied after city page regeneration',()=>{
 execFileSync('python3',['scripts/market-page-images.py']);
 const before=execFileSync('git',['diff'],{encoding:'utf8'});execFileSync('python3',['scripts/apply-team-photos.py']);
 assert.equal(execFileSync('git',['diff'],{encoding:'utf8'}),before);
 for(const slug of ['immobilienmakler-mettmann','immobilienmakler-gladbeck','immobilienmakler-moers'])assert.match(fs.readFileSync(slug+'/index.html','utf8'),/assets\/images\/team-scenes\//);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {marketAreas} from '../lib/market-area-directory.mjs';
const root=new URL('../',import.meta.url);
const cities=JSON.parse(fs.readFileSync(new URL('content/seo/restored-cities.json',root),'utf8'));
test('restored city pages retain their URLs and dynamic city-specific inventory without old template locations',()=>{
 for(const city of cities){
  const html=fs.readFileSync(new URL(city.url.slice(1)+'index.html',root),'utf8');
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,city.city);
  assert.ok(html.includes('restored-city-page'),city.city);
  assert.ok(html.includes(`https://sls.de${city.url}`),city.city);
  assert.ok(html.includes('data-city-properties="'+city.city+'"'),city.city);
  assert.ok(!/Lembeck|Rhade|Wulfen|immobilienmakler-dorsten/.test(html),city.city);
  assert.equal((html.match(/<details><summary>/g)||[]).length,6,city.city);
  for(const section of city.sections)assert.ok(html.includes(section.heading),city.city);
 }
});
test('every generated image reference resolves to a bounded responsive asset and carries a AI team-scene label',()=>{
 for(const path of [...cities.map(c=>c.url.slice(1)), 'wohnen-im-alter/']){
  const html=fs.readFileSync(new URL(path+'index.html',root),'utf8');
  assert.ok(html.includes('KI-generierte Teamszene'),path);
  const images=[...html.matchAll(/(?:src|srcset)="([^\"]*team-local[^\"]*)"/g)].flatMap(m=>m[1].split(',').map(v=>v.trim().split(' ')[0]));
  assert.ok(images.length>=2,path);
  for(const image of images){const stat=fs.statSync(new URL(image.slice(1),root));assert.ok(stat.size>1000&&stat.size<350000,image);}
 }
});
test('all 31 market areas are regular filter cards with no appended fallback list',()=>{
 const html=fs.readFileSync(new URL('standorte/index.html',root),'utf8');
 assert.equal(marketAreas.length,31);
 assert.equal((html.match(/class="network-partner" data-category=/g)||[]).length,31);
 assert.ok(!html.includes('data-restored-markets'));
 for(const city of cities)assert.equal(marketAreas.filter(a=>a.url===city.url).length,1);
});
test('team imagery uses known portrait references and a varied allocation without repeating a person within a page',()=>{
 const photos=JSON.parse(fs.readFileSync(new URL('content/seo/local-team-images.json',root),'utf8'));
 const profiles=JSON.parse(fs.readFileSync(new URL('content/team/profiles.json',root),'utf8'));
 const people=[];
 assert.equal(Object.keys(photos).length,8);
 for(const [route,pair] of Object.entries(photos)){
  const html=fs.readFileSync(new URL(route.slice(1)+'index.html',root),'utf8');
  assert.notEqual(pair.hero.person,pair.beratung.person,route);
  for(const photo of Object.values(pair)){
   assert.ok(profiles.some(p=>p.name===photo.person&&p.portrait===photo.portrait),photo.person);
   assert.ok(html.includes('/assets/images/'+photo.scene+'-1536.webp'),route);
   people.push(photo.person);
  }
  assert.ok(!html.includes('/assets/images/local-relaunch-20261026/'),route);
  assert.ok(!html.includes('/assets/images/guides-hero/besichtigung-'),route);
 }
 assert.equal(new Set(people).size,14);
 assert.equal(people.filter(p=>p==='Maximilian Werner').length,1);
});

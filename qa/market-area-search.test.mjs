import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { searchMarketAreas } from '../assets/market-area-search.mjs';
const cities=JSON.parse(fs.readFileSync(new URL('../content/marktgebiete/cities.json',import.meta.url)));
const config=JSON.parse(fs.readFileSync(new URL('../content/marktgebiete/search.json',import.meta.url))).areas;
const areas=cities.map(city=>({...city,...config.find(rule=>rule.url===city.url)}));
const names=q=>searchMarketAreas(areas,q).map(match=>match.area.city);
test('exact towns route to one anchor and never overwrite an existing city',()=>{
 assert.deepEqual(names('Neuss'),['Düsseldorf']);
 assert.deepEqual(names('Kaarst'),['Meerbusch']);
 assert.deepEqual(names('Hamm'),['Unna']);assert.deepEqual(names('Düsseldorf Hamm'),['Düsseldorf']);
 assert.deepEqual(names('Oer-Erkenschwick'),['Recklinghausen']);
 assert.deepEqual(names('Mönchengladbach'),['Viersen']);
 for(const city of cities)assert.deepEqual(names(city.city),[city.city]);
 const towns=areas.flatMap(area=>area.nearby);
 assert.equal(new Set(towns).size,towns.length);
 for(const area of areas)for(const town of area.nearby)assert.deepEqual(names(town),[area.city]);
});
test('umlauts, spelling, punctuation and ambiguous districts',()=>{
 assert.deepEqual(names('Duesseldorf'),['Düsseldorf']);assert.deepEqual(names('Dusseldorf'),['Düsseldorf']);
 assert.deepEqual(names('Büderich'),['Meerbusch']);assert.deepEqual(names('Buederich'),['Meerbusch']);
 assert.deepEqual(names('Krefeld Hüls'),['Krefeld']);assert.deepEqual(new Set(names('Hüls')),new Set(['Marl','Krefeld']));
 assert.deepEqual(names('Castrop Rauxel'),['Castrop-Rauxel']);assert.deepEqual(names('Fröndenberg'),['Unna']);
 assert.deepEqual(names('Wetter'),['Witten']);assert.deepEqual(names('  NEUSS  '),['Düsseldorf']);
});
test('partial search, unknown places, empty input and injection strings',()=>{
 assert.ok(names('Neu').includes('Düsseldorf'));assert.ok(names('Neu').includes('Moers'));
 assert.deepEqual(names('Köln'),[]);assert.deepEqual(names('Berlin'),[]);
 assert.equal(names('').length,24);assert.deepEqual(names('<img src=x onerror=alert(1)>'),[]);
});
test('published search data agrees with central config and all destination pages exist',()=>{
 const html=fs.readFileSync(new URL('../standorte/index.html',import.meta.url),'utf8');
 const embedded=JSON.parse(html.match(/id="market-area-search-config">(.*?)<\/script>/s)[1]);
 assert.deepEqual(embedded,areas);
 for(const area of areas)assert.ok(fs.existsSync(new URL('..'+area.url+'index.html',import.meta.url)),area.url);
});

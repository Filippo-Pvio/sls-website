import {queryProperties} from '../lib/property-catalog.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {matchesMarketCity} from '../assets/market-city-match.mjs';
import {propertyCardHtml} from '../assets/property-card.mjs';
const source=readFileSync(new URL('../assets/city-properties.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
async function run(kind,rows,{fail=false,storage}={}){
 const status={textContent:'',append(){}},heading={textContent:''},grid={children:[],setAttribute(){},replaceChildren(...nodes){this.children=nodes}};
 const section={dataset:{cityProperties:'Dorsten'},querySelector:s=>s==='h2'||s==='.city-section-head > p'?heading:s==='[role="status"]'?status:s==='[data-city-active]'?(kind==='active'?grid:null):grid};
 const document={querySelectorAll:()=>[section],createElement:()=>({append(){}})};
 vm.runInNewContext(source,{matchesMarketCity,document,URL,AbortSignal,sessionStorage:storage,matchMedia:()=>({matches:true}),propertyCardHtml,fetch:async()=>({ok:!fail,json:async()=>kind==='active'?{items:rows}:{references:rows}})});
 await new Promise(resolve=>setImmediate(resolve));
 return {status,grid};
}
const item={id:'123',title:'Haus in Dorsten',city:'Dorsten',zip:'46286',image:'https://example.com/a.webp',images:['https://example.com/a.webp'],price:200000,area:100};
test('only local references, deduplicated and limited to two',async()=>{
 const {grid}=await run('references',[item,item,{...item,id:'2',city:'Essen'},{...item,id:'3'},{...item,id:'4'}]);assert.equal(grid.children.length,2);
});
test('up to three local offers with real detail links',async()=>{
 const {grid}=await run('active',[item,{...item,id:'2'},{...item,id:'3'},{...item,id:'4'},{...item,id:'5',city:'Essen'}]);assert.equal((grid.innerHTML.match(/class="pp-card-shell"/g)||[]).length,3);assert.match(grid.innerHTML,/href="\/immobilie\//);
});
test('empty inventory is distinct from feed failure',async()=>{
 const empty=await run('active',[]);assert.match(empty.status.textContent,/keine Immobilienangebote/);
 const error=await run('active',[],{fail:true});assert.match(error.status.textContent,/nicht geladen/);assert.doesNotMatch(error.status.textContent,/keine Immobilienangebote/);
});
test('reference failures and nonlocal results do not invent local examples',async()=>{
 assert.match((await run('references',[{...item,city:'Essen'}])).status.textContent,/keine Referenzbilder/);
 assert.match((await run('references',[],{fail:true})).status.textContent,/nicht geladen/);
});
test('shared cards preserve energy and commission and escape feed text',()=>{
 const html=propertyCardHtml({...item,title:'<script>bad</script>',courtage:'3,57%',energy:{kind:'Bedarfsausweis',value:100,fuel:'Gas',buildingYear:1990,rating:'D'}},{heading:'h3'});
 assert.match(html,/<h3>&lt;script&gt;/);assert.match(html,/Käuferprovision/);assert.match(html,/100 kWh/);assert.doesNotMatch(html,/<script>/);
});

test('reload avoids both previous references when alternatives exist and removes count',async()=>{
 let saved='[]';const storage={getItem:()=>saved,setItem:(_key,value)=>{saved=value}};
 const rows=Array.from({length:6},(_,i)=>({...item,id:String(i+1)}));
 const first=await run('references',rows,{storage});const previous=JSON.parse(saved);
 const next=await run('references',rows,{storage});
 assert.equal(JSON.parse(saved).filter(id=>previous.includes(id)).length,0);
 assert.equal(next.grid.children.length,2);assert.equal(first.status.textContent,'');assert.equal(first.status.hidden,true);
});
test('small pools and unavailable storage still show valid references',async()=>{
 const storage={getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}};
 assert.equal((await run('references',[item],{storage})).grid.children.length,1);
 assert.equal((await run('references',[item,{...item,id:'2'}],{storage})).grid.children.length,2);
});

test('market matching supports district labels without substring collisions',()=>{
 assert.equal(matchesMarketCity({city:'Dorsten-Lembeck'},'Dorsten'),true);
 assert.equal(matchesMarketCity({city:'Lembeck',zip:'46286'},'Dorsten'),true);
 assert.equal(matchesMarketCity({city:'Duesseldorf'},'Düsseldorf'),true);
 assert.equal(matchesMarketCity({city:'Haltern',zip:'45721'},'Haltern am See'),true);
 assert.equal(matchesMarketCity({city:'Essenbach'},'Essen'),false);
 assert.equal(matchesMarketCity({city:'Borken',zip:'34582'},'Borken'),false);
});

test('city listing destination uses the same match before pagination',()=>{
 const rows=[{...item,city:'Dorsten - Lembeck'}, {...item,id:'2',city:'Lembeck'}, {...item,id:'3',city:'Dorstenberg'}];
 assert.equal(queryProperties(rows,{city:'Dorsten',marketCity:'1'}).length,2);
 assert.equal(queryProperties([{...item,city:'Essenbach'}],{city:'Essen',marketCity:'1'}).length,0);
});

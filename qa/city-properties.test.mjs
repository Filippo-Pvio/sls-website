import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {propertyCardHtml} from '../assets/property-card.mjs';
const source=readFileSync(new URL('../assets/city-properties.js',import.meta.url),'utf8').replace(/^import .*;\n/,'');
async function run(kind,rows,{fail=false}={}){
 const status={textContent:'',append(){}},grid={children:[],setAttribute(){},replaceChildren(...nodes){this.children=nodes}};
 const section={dataset:{cityProperties:'Dorsten'},querySelector:s=>s==='[role="status"]'?status:s==='[data-city-active]'?(kind==='active'?grid:null):grid};
 const document={querySelectorAll:()=>[section],createElement:()=>({append(){}})};
 vm.runInNewContext(source,{document,URL,AbortSignal,matchMedia:()=>({matches:true}),propertyCardHtml,fetch:async()=>({ok:!fail,json:async()=>kind==='active'?{items:rows}:{references:rows}})});
 await new Promise(resolve=>setImmediate(resolve));
 return {status,grid};
}
const item={id:'123',title:'Haus in Dorsten',city:'Dorsten',image:'https://example.com/a.webp',images:['https://example.com/a.webp'],price:200000,area:100};
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

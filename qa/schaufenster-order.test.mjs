import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../assets/schaufenster.js',import.meta.url),'utf8');
const fixtures=Array.from({length:5},(_,i)=>({id:String(i+1),title:'Objekt '+(i+1),city:'Dorsten',images:[]}));
async function display(random,{referenceMode=false,initialRows=fixtures}={}){
 class Element{constructor(){this.attrs={};this.children=[];this.style={};this.classList={add(){},remove(){},toggle(){}};}setAttribute(k,v){this.attrs[k]=String(v)}getAttribute(k){return this.attrs[k]??null}removeAttribute(k){delete this.attrs[k]}append(...n){this.children.push(...n)}appendChild(n){this.children.push(n)}replaceChildren(...n){this.children=n}}
 const nodes=new Map(),intervals=[],events={},requests=[];let now=100000,rows=initialRows.slice();
 const el=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id)};
 class Clock extends Date{static now(){return now}}
 const context=vm.createContext({console,URL,Intl,Date:Clock,Math:Object.assign(Object.create(Math),{random}),Map,Set,AbortController,Image:class{},setTimeout:()=>1,clearTimeout(){},setInterval:(fn,ms)=>intervals.push({fn,ms}),
  window:{addEventListener:(n,f)=>events[n]=f},document:{documentElement:{getAttribute:()=>referenceMode?'references':null},hidden:false,getElementById:el,createElement:()=>new Element(),createElementNS:()=>new Element(),addEventListener(){}},
  qrcode:()=>({addData(){},make(){},getModuleCount:()=>1,isDark:()=>true}),
  fetch:async input=>{requests.push(input);const u=new URL(input,'https://sls.de');return {ok:true,json:async()=>({items:u.searchParams.has('id')?rows.filter(p=>p.id===u.searchParams.get('id')):rows})}}});
 const settle=()=>new Promise(resolve=>setImmediate(resolve));vm.runInContext(code,context);await settle();
 return {id:()=>{const url=new URL(el('property-qr').getAttribute('href'));return url.searchParams.get('objekt')||/objekt-(\d+)/.exec(url.pathname)?.[1]},text:id=>el(id).textContent,href:()=>el('property-qr').getAttribute('href'),requests,
  async advance(ms=20001){now+=ms;intervals.find(t=>t.ms===250).fn();await settle()},
  async refresh(updated=rows){rows=updated;events.online();await settle()}};
}
test('startup is shuffled and every round contains every property exactly once without boundary repeats',async()=>{
 const a=await display(()=>0),b=await display(()=>.99);assert.notEqual(a.id(),b.id());
 let previous;
 for(let round=0;round<4;round++){
  const seen=[];
  for(let i=0;i<5;i++){const id=a.id();if(i===0)assert.notEqual(id,previous);seen.push(id);previous=id;await a.advance()}
  assert.equal(new Set(seen).size,5);assert.deepEqual(seen.slice().sort(),['1','2','3','4','5']);
 }
});
test('reference mode shows sold status and reference QR, never an active price or commission',async()=>{
 const screen=await display(()=>.99,{referenceMode:true,initialRows:fixtures.map(p=>({...p,price:123456,courtage:'9%',facts:[['Wohnfläche','120 m²']]}))});
 assert.equal(screen.text('price'),'Erfolgreich vermittelt');assert.equal(screen.text('commission'),'');assert.equal(screen.text('energy'),'');
 assert.equal(screen.href(),'https://sls.de/referenz/objekt-1/');assert.match(screen.text('offer-type'),/Verkauft/);
 await screen.advance();assert.equal(screen.href(),'https://sls.de/referenz/objekt-2/');
 assert.deepEqual(screen.requests,['/api/propstack-sold-references/?display=1']);
});
test('refresh retains the shuffled round, updates data and preserves elapsed slide time',async()=>{
 const screen=await display(()=>0);const first=screen.id();await screen.advance(10000);
 await screen.refresh(fixtures.slice().reverse());assert.equal(screen.id(),first);
 await screen.advance(10001);assert.notEqual(screen.id(),first);
 const seen=[first,screen.id()];for(let i=0;i<3;i++){await screen.advance();seen.push(screen.id())}
 assert.equal(new Set(seen).size,5);
});
test('refresh removes unavailable properties and adds new ones without replaying consumed properties',async()=>{
 const screen=await display(()=>.99);assert.equal(screen.id(),'1');await screen.advance();assert.equal(screen.id(),'2');
 await screen.refresh([fixtures[1],fixtures[3],fixtures[4],{id:'6',title:'Neu',city:'Essen',images:[]}]);
 assert.equal(screen.id(),'2');const seen=[];for(let i=0;i<3;i++){await screen.advance();seen.push(screen.id())}
 assert.deepEqual(seen,['4','5','6']);await screen.advance();assert.notEqual(screen.id(),'6');
 const removed=await display(()=>.99);await removed.refresh(fixtures.slice(1));assert.equal(removed.id(),'2');
});

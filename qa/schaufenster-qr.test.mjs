import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,writeFile,mkdir} from 'node:fs/promises';

test('QR encodes the displayed property, follows rotation and disappears on empty or expired data',async()=>{
 class Element {
  constructor(){this.attrs={};this.children=[];this.style={};this.hidden=false;this.textContent='';this.namespaceURI='http://www.w3.org/2000/svg';this.classList={add(){},remove(){},toggle(){}};}
  setAttribute(k,v){this.attrs[k]=String(v)} getAttribute(k){return this.attrs[k]??null} removeAttribute(k){delete this.attrs[k]}
  append(...nodes){this.children.push(...nodes)} appendChild(node){this.children.push(node)} replaceChildren(...nodes){this.children=nodes}
 }
 const nodes=new Map(),intervals=[],events={};let now=100000,mode='ok';
 const el=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id)};
 const rows=[{id:'6236933',title:'Wohnung',city:'Düsseldorf',reference:'SLS 10672',images:[]},{id:'4584479',title:'Haus',city:'Dorsten',reference:'SLS 3062',images:[]}];
 class Clock extends Date{static now(){return now}}
 const context=vm.createContext({console,URL,Intl,Math:Object.assign(Object.create(Math),{random:()=>.99}),Date:Clock,Map,Set,AbortController,Image:class{},setTimeout:()=>1,clearTimeout(){},setInterval:(fn,ms)=>intervals.push({fn,ms}),
  window:{addEventListener:(name,fn)=>events[name]=fn},
  document:{hidden:false,getElementById:el,createElement:()=>new Element(),createElementNS:()=>new Element(),addEventListener(){}},
  fetch:async input=>{if(mode==='offline')return {ok:false,status:502};const u=new URL(input,'https://sls.de');return {ok:true,json:async()=>({items:mode==='empty'?[]:u.searchParams.has('id')?rows.filter(p=>p.id===u.searchParams.get('id')):rows})}}});
 await vm.runInContext(await readFile(new URL('../assets/vendor/qrcode-generator-1.4.4.js',import.meta.url),'utf8'),context);
 vm.runInContext(await readFile(new URL('../assets/schaufenster.js',import.meta.url),'utf8'),context);
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 const expected=id=>'https://sls.de/immobilien/?objekt='+id;
 const artifact=[];
 await settle();
 assert.equal(el('property-qr').hidden,false);assert.equal(el('property-qr').getAttribute('href'),expected(rows[0].id));
 assert.equal(el('qr-reference').textContent,'Objekt SLS 10672');
 const firstPath=el('qr-symbol').children[0].children[1].attrs.d;
 artifact.push({url:expected(rows[0].id),viewBox:el('qr-symbol').children[0].attrs.viewBox,path:firstPath});
 now+=21000;intervals.find(t=>t.ms===250).fn();await settle();
 assert.equal(el('property-qr').getAttribute('href'),expected(rows[1].id));assert.equal(el('qr-reference').textContent,'Objekt SLS 3062');
 assert.notEqual(el('qr-symbol').children[0].children[1].attrs.d,firstPath);
 artifact.push({url:expected(rows[1].id),viewBox:el('qr-symbol').children[0].attrs.viewBox,path:el('qr-symbol').children[0].children[1].attrs.d});
 mode='empty';events.online();await settle();assert.equal(el('property-qr').hidden,true);assert.equal(el('property-qr').getAttribute('href'),null);assert.equal(el('qr-symbol').children.length,0);
 mode='ok';events.online();await settle();assert.equal(el('property-qr').hidden,false);
 mode='offline';now+=31*60000;intervals.find(t=>t.ms===250).fn();await settle();assert.equal(el('property-qr').hidden,true);assert.equal(el('property-qr').getAttribute('href'),null);
 if(process.env.SLS_QR_QA_OUTPUT){await mkdir(process.env.SLS_QR_QA_OUTPUT,{recursive:true});await writeFile(process.env.SLS_QR_QA_OUTPUT+'/qr-symbols.json',JSON.stringify(artifact));}
});

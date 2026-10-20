import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,access} from 'node:fs/promises';

test('valuation presentation loops through four messages, keeps one QR target and resumes after suspension',async()=>{
 const nodes=new Map(),listeners={},intervals=[],images=[];let now=100000,encoded;
 const el=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',style:{},innerHTML:'',classList:{add(){},remove(){}}});return nodes.get(id)};
 class Clock extends Date{static now(){return now}}
 const context=vm.createContext({Date:Clock,console,Image:class{set src(v){images.push(v);this.onload?.()}},
  document:{hidden:false,getElementById:el,addEventListener:(name,fn)=>listeners[name]=fn},
  qrcode:()=>({addData(v){encoded=v},make(){},createSvgTag:()=>'<svg></svg>'}),
  setInterval:(fn,ms)=>intervals.push({fn,ms})});
 vm.runInContext(await readFile(new URL('../assets/schaufenster-bewertung.js',import.meta.url),'utf8'),context);
 assert.equal(encoded,'https://sls.de/immobilienbewertung/');assert.equal(intervals.length,1);
 const first=el('valuation-title').textContent,seen=[];
 for(let i=0;i<4;i++){
  seen.push(el('valuation-title').textContent);assert.equal(el('counter').textContent,(i+1)+' / 4');
  assert.ok(el('valuation-copy').textContent.length>30);now+=20001;intervals[0].fn();
 }
 assert.equal(new Set(seen).size,4);assert.equal(el('valuation-title').textContent,first);
 now+=12*60*60*1000;intervals[0].fn();assert.equal(el('counter').textContent,'2 / 4');
 listeners.visibilitychange();assert.equal(el('counter').textContent,'2 / 4');
 for(const image of new Set(images))await access(new URL('..'+image,import.meta.url));
 const html=await readFile(new URL('../schaufenster/immobilienbewertung/index.html',import.meta.url),'utf8');
 assert.match(html,/href="https:\/\/sls\.de\/immobilienbewertung\/"/);assert.doesNotMatch(html,/<iframe|<form|class="brand"|data-site-header/);
});

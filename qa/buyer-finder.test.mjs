import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const code=await readFile(new URL('../assets/buyer-finder.js',import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};}
function fixture(){
 const nodes=new Map(),requests=[],intervals=new Map();let timerId=0;
 function element(){return {value:'',disabled:false,hidden:false,textContent:'',listeners:{},attrs:{},classList:{add(){},remove(){}},focus(){},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},addEventListener(k,f){(this.listeners[k]??=[]).push(f)},emit(k,e={}){for(const f of this.listeners[k]||[])f(e)},checkValidity(){return true},reportValidity(){},replaceChildren(){this.value=''},add(){}};}
 const get=k=>{if(!nodes.has(k))nodes.set(k,element());return nodes.get(k)};
 const form=get('#buyer-form'),fields={};
 for(const name of ['propertyType','category','place','area','rooms','price','method','phone','window']){fields[name]=element();fields[name].name=name;}
 Object.assign(fields.propertyType,{value:'house'});fields.place.value='Dorsten';fields.area.value='120';fields.rooms.value='3';fields.method.value='email';form.elements=fields;
 const steps=Array.from({length:4},()=>({hidden:false,querySelectorAll:()=>[],querySelector:()=>element()}));
 form.querySelectorAll=s=>s==='[data-step]'?steps:Object.values(fields);
 runInNewContext(code,{document:{querySelector:get,querySelectorAll:()=>[]},Option:function(){},URLSearchParams,AbortController,AbortSignal,
  setInterval:f=>{intervals.set(++timerId,f);return timerId},clearInterval:id=>intervals.delete(id),setTimeout,clearTimeout,
  fetch:(url,options)=>{if(url==='/api/propstack-contact-request')return Promise.resolve({ok:true,json:async()=>({token:'test',availableTopics:['buyerfinder'],callbackAvailable:true})});const d=deferred();requests.push({url,options,...d});return d.promise;}
 });
 const start=()=>{get('#buyer-next').emit('click');get('#buyer-next').emit('click')};
 const back=()=>get('#buyer-back').emit('click');
 const change=(name,value)=>{fields[name].value=value;form.emit('input',{target:fields[name]})};
 const respond=(r,data,ok=true)=>r.resolve({ok,json:async()=>data});
 return {get,requests,intervals,start,back,change,respond,form};
}
const result=count=>({count,location:'Dorsten',checkedAt:'2026-10-04T12:00:00Z'});
test('late old result cannot overwrite a newer result even when fetch ignores cancellation',async()=>{
 const f=fixture();f.start();f.respond(f.requests[0],{},false);await flush();const old=f.requests[1];
 f.back();assert.equal(old.options.signal.aborted,true);f.change('price','400000');f.get('#buyer-next').emit('click');
 f.respond(f.requests[2],{},false);await flush();f.respond(f.requests[3],result(7));await flush();
 assert.equal(f.get('#buyer-analysis-count').textContent,'7');f.respond(old,result(99));await flush();
 assert.equal(f.get('#buyer-analysis-count').textContent,'7');assert.equal(f.get('#buyer-analysis-result').hidden,false);assert.equal(f.intervals.size,0);
});
test('old error/finally cannot unlock or stop a newer pending analysis',async()=>{
 const f=fixture();f.start();f.respond(f.requests[0],{},false);await flush();const old=f.requests[1];
 f.back();f.change('area','150');f.get('#buyer-next').emit('click');old.reject(new Error('old failure'));await flush();
 assert.equal(f.get('#buyer-next').disabled,true);assert.equal(f.get('#buyer-analysis').attrs['aria-busy'],'true');assert.equal(f.get('#buyer-analysis-result').hidden,true);
 f.respond(f.requests[2],{},false);await flush();f.respond(f.requests[3],result(4));await flush();assert.equal(f.get('#buyer-analysis-count').textContent,'4');
});
test('returning during inventory load cancels it and prevents the old matching request',async()=>{
 const f=fixture();f.start();const old=f.requests[0];f.back();assert.equal(old.options.signal.aborted,true);f.respond(old,{analysedClients:3000});await flush();
 assert.equal(f.requests.length,1);assert.equal(f.get('#buyer-analysis-result').hidden,true);assert.equal(f.intervals.size,0);assert.equal(f.get('#buyer-next').disabled,false);
});
test('completed result is reused for identical inputs and invalidated when inputs change',async()=>{
 const f=fixture();f.start();f.respond(f.requests[0],{},false);await flush();f.respond(f.requests[1],result(5));await flush();
 f.back();f.get('#buyer-next').emit('click');assert.equal(f.requests.length,2);
 f.back();f.change('place','Düsseldorf');assert.equal(f.get('#buyer-analysis-result').hidden,true);f.get('#buyer-next').emit('click');assert.equal(f.requests.length,3);
 f.back();f.respond(f.requests[2],{},false);await flush();
});

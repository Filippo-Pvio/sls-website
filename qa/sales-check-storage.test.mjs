import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {SALES_CHECK_STORAGE_KEY, normalizeSalesCheckState, readSavedSalesCheck, writeSavedSalesCheck} from '../assets/verkaufscheck-storage.js';
const code=await readFile(new URL('../assets/verkaufscheck.js',import.meta.url),'utf8');
const questions=runInNewContext(code.slice(code.indexOf('  const statusOptions'),code.indexOf('  const todoDefinitions'))+'\nquestions;');
const initial=()=>({version:1,current:'start',history:[],answers:{}});
const advance=(state,value)=>{const q=questions[state.current];state.answers[state.current]=value;state.history.push(state.current);state.current=typeof q.next==='function'?q.next(state.answers,value):q.next;};
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};};
for(const start of ['noBuyer','interest','buyer','unsure'])for(const type of ['house','apartment','investment','land'])test(`${start}/${type}: every pause and completed result can be restored`,()=>{
 const state=initial(),device=storage();
 while(!questions[state.current].summary){
  const q=questions[state.current],value=state.current==='start'?start:state.current.startsWith('type')?type:q.options.at(-1)[0];
  state.answers[state.current]=value;
  writeSavedSalesCheck(device,questions,state);
  assert.deepEqual(readSavedSalesCheck(device,questions),state);
  advance(state,value);
  writeSavedSalesCheck(device,questions,state);
  assert.deepEqual(readSavedSalesCheck(device,questions),state);
 }
});
test('only route answers survive: future answers and contact fields are excluded',()=>{
 const device=storage(),state={...initial(),answers:{start:'buyer',docGrundbuch:'yes'},contact:{email:'private@example.com'}};
 writeSavedSalesCheck(device,questions,state);
 assert.deepEqual(readSavedSalesCheck(device,questions),{...initial(),answers:{start:'buyer'}});
 assert(!device.getItem(SALES_CHECK_STORAGE_KEY).includes('private'));
});
test('changed route, invalid answer, unknown question and incompatible version are rejected',()=>{
 for(const state of [{...initial(),current:'typeBuyer'}, {...initial(),answers:{start:'invalid'}}, {...initial(),current:'constructor'}, {...initial(),version:2}, {...initial(),history:['typeBuyer']}])assert.equal(normalizeSalesCheckState(questions,state),null);
});
test('corrupt JSON is ignored and unavailable storage is surfaced to the caller',()=>{
 assert.equal(readSavedSalesCheck({getItem:()=>'{broken'},questions),null);
 assert.throws(()=>readSavedSalesCheck({getItem:()=>{throw Error('blocked');}},questions));
 assert.throws(()=>writeSavedSalesCheck({setItem:()=>{throw Error('quota');}},questions,initial()));
});

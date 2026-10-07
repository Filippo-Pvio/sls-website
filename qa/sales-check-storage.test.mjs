import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {SALES_CHECK_STORAGE_KEY, SALES_CHECK_RETENTION_MS, normalizeSalesCheckState, readSavedSalesCheck, writeSavedSalesCheck} from '../assets/verkaufscheck-storage.js';
const code=await readFile(new URL('../assets/verkaufscheck.js',import.meta.url),'utf8');
const questions=runInNewContext(code.slice(code.indexOf('  const statusOptions'),code.indexOf('  const todoDefinitions'))+'\nquestions;');
const initial=()=>({version:1,current:'start',history:[],answers:{}});
const advance=(state,value)=>{const q=questions[state.current];state.answers[state.current]=value;state.history.push(state.current);state.current=typeof q.next==='function'?q.next(state.answers,value):q.next;};
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
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

test('progress expires exactly after 30 days and only its own storage entry is removed',()=>{
 const device=storage(),now=1700000000000;
 device.setItem('unrelated-setting','preserve');
 writeSavedSalesCheck(device,questions,initial(),now);
 assert.deepEqual(readSavedSalesCheck(device,questions,now+SALES_CHECK_RETENTION_MS-1),initial());
 assert.equal(readSavedSalesCheck(device,questions,now+SALES_CHECK_RETENTION_MS),null);
 assert.equal(device.getItem(SALES_CHECK_STORAGE_KEY),null);
 assert.equal(device.getItem('unrelated-setting'),'preserve');
});

test('reading does not extend expiry; an actual saved change starts a new window',()=>{
 const device=storage(),now=1700000000000;
 writeSavedSalesCheck(device,questions,initial(),now);
 const before=device.getItem(SALES_CHECK_STORAGE_KEY);
 readSavedSalesCheck(device,questions,now+1000);
 assert.equal(device.getItem(SALES_CHECK_STORAGE_KEY),before);
 writeSavedSalesCheck(device,questions,{...initial(),answers:{start:'buyer'}},now+1000);
 assert.equal(JSON.parse(device.getItem(SALES_CHECK_STORAGE_KEY)).expiresAt,now+1000+SALES_CHECK_RETENTION_MS);
});

test('legacy progress is preserved once without inventing an earlier creation date',()=>{
 const device=storage(),now=1700000000000;
 device.setItem(SALES_CHECK_STORAGE_KEY,JSON.stringify({...initial(),contact:{email:'private@example.org'}}));
 assert.deepEqual(readSavedSalesCheck(device,questions,now),initial());
 const migrated=JSON.parse(device.getItem(SALES_CHECK_STORAGE_KEY));
 assert.equal(migrated.savedAt,now);
 assert.equal(migrated.expiresAt,now+SALES_CHECK_RETENTION_MS);
 assert.equal(migrated.contact,undefined);
 readSavedSalesCheck(device,questions,now+1000);
 assert.equal(JSON.parse(device.getItem(SALES_CHECK_STORAGE_KEY)).savedAt,now);
});

test('invalid or manipulated expiry does not restore; blocked removal is reported',()=>{
 const device=storage(),now=1700000000000;
 for(const fields of [{savedAt:now}, {savedAt:now,expiresAt:'forever'}, {savedAt:now,expiresAt:now+SALES_CHECK_RETENTION_MS+1}, {savedAt:now+1,expiresAt:now+1+SALES_CHECK_RETENTION_MS}]) {
  device.setItem(SALES_CHECK_STORAGE_KEY,JSON.stringify({...initial(),...fields}));
  assert.equal(readSavedSalesCheck(device,questions,now),null);
 }
 writeSavedSalesCheck(device,questions,initial(),now);
 assert.throws(()=>readSavedSalesCheck({...device,removeItem(){throw Error('blocked');}},questions,now+SALES_CHECK_RETENTION_MS));
});

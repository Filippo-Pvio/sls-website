import test from 'node:test';
import assert from 'node:assert/strict';
import {similarProperties} from '../assets/property-similarity.mjs';
const current={id:'1',type:'Wohnung',city:'Dorsten',zip:'46286',price:200000,area:80,rooms:3};
const item=(id,changes={})=>({...current,id,...changes});
test('excludes current object, duplicates, other types and unsuitable price or location',()=>{
  assert.deepEqual(similarProperties(current,[current,item('2'),item('2'),item('3',{type:'Haus'}),item('4',{price:500000}),item('5',{city:'Berlin',zip:'10115'})]).map(x=>x.id),['2']);
});
test('prefers same city and returns at most three with deterministic ranking',()=>{
  assert.deepEqual(similarProperties(current,[item('6',{city:'Raesfeld',zip:'46348'}),item('5',{price:240000}),item('4',{price:220000}),item('3')]).map(x=>x.id),['3','4','5']);
});
test('missing values are not zero-price matches; unknown property types are not similar',()=>{
  assert.deepEqual(similarProperties(current,[item('2',{price:null,area:null}),item('3',{city:'Raesfeld',zip:'46348',price:null})]),[]);
  assert.deepEqual(similarProperties({...current,type:'Immobilie'},[item('2',{type:'Immobilie'})]),[]);
  assert.equal(similarProperties(current,[item('2',{price:null})]).length,1);
});
test('wider postal region requires both comparable price and area',()=>{
  assert.deepEqual(similarProperties(current,[item('2',{city:'Raesfeld',zip:'46348',price:250000,area:90}),item('3',{city:'Raesfeld',zip:'46348',area:120})]).map(x=>x.id),['2']);
});

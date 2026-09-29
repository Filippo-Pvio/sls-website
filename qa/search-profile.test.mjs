import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSavedQuery,publicCriteria,sameSavedQuery} from '../lib/search-profile.mjs';

test('maps website filters to a Propstack BUY search profile',()=>{
  const criteria=publicCriteria({type:'Haus',city:'Dorsten',price:'550000',minArea:'120',rooms:'4',query:'ignored'});
  assert.deepEqual(buildSavedQuery(criteria,42),{
    client_id:42,
    active:true,
    marketing_type:'BUY',
    note:'Suchauftrag über die SLS Website angelegt.',
    cities:['Dorsten'],
    rs_types:['HOUSE'],
    price_to:550000,
    living_space:120,
    number_of_rooms:4
  });
});

test('does not turn free-text search into a Propstack matching criterion',()=>{
  const query=buildSavedQuery(publicCriteria({query:'Garten'}),7);
  assert.equal(query.client_id,7);
  assert.equal(query.marketing_type,'BUY');
  assert.equal('query' in query,false);
  assert.equal('cities' in query,false);
});

test('recognises the same search profile independent of city casing',()=>{
  const candidate=buildSavedQuery(publicCriteria({type:'Wohnung',city:'Düsseldorf',price:450000}),9);
  const existing={marketing_type:'BUY',cities:['düsseldorf'],rs_types:['APARTMENT'],price_to:450000,living_space:0,number_of_rooms:null};
  assert.equal(sameSavedQuery(existing,candidate),true);
});

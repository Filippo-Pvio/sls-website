import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceParticipants,hasReferenceRoles} from '../lib/profile-reference-roles.mjs';
const brokers=new Map([['1',{id:1,name:'Nico Hryn'}],['2',{id:2,name:'Maximilian Werner'}]]);
test('a sold property retains both acquisition and sale credit',()=>{
  const unit={broker_id:2,custom_fields:{einkaufsmakler:{value:1},verkaufsmakler:{value:2}},internal_note:'private'};
  assert.deepEqual(referenceParticipants(unit,brokers),[{profile:'maximilian-werner',role:'sale'},{profile:'nico-hryn',role:'acquisition'}]);
  assert.equal(hasReferenceRoles(unit),true);
});
test('explicit sale role takes precedence; empty role falls back to primary broker',()=>{
  assert.deepEqual(referenceParticipants({broker_id:2,custom_fields:{verkaufsmakler:{value:1}}},brokers),[{profile:'nico-hryn',role:'sale'}]);
  assert.deepEqual(referenceParticipants({broker_id:2},brokers),[{profile:'maximilian-werner',role:'sale'}]);
});
test('new staff are resolved from team registry and unknown IDs do not get assigned',()=>{
  const registry={'new-staff':{name:'Neue Kollegin'}};
  const people=new Map([['3',{name:'Neue Kollegin'}]]);
  assert.deepEqual(referenceParticipants({custom_fields:{einkaufsmakler:{value:3}}},people,registry),[{profile:'new-staff',role:'acquisition'}]);
  assert.deepEqual(referenceParticipants({custom_fields:{einkaufsmakler:{value:999}}},people,registry),[]);
});

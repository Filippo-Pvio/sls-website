import test from 'node:test';
import assert from 'node:assert/strict';
import {newsletterConfig} from '../lib/guide-newsletter.mjs';
import {NEWSLETTER_CATEGORY} from '../lib/newsletter-doi.mjs';
const ready={KV_REST_API_URL:'https://fixture.example',KV_REST_API_TOKEN:'fixture'};
const types=async()=>[{id:NEWSLETTER_CATEGORY.id,name:NEWSLETTER_CATEGORY.name,category:'for_notes'}];
test('dedicated Propstack newsletter requires security configuration and exact note category',async()=>{assert.deepEqual(await newsletterConfig('fixture',types,ready),{dedicated:true,transport:'propstack',categoryId:NEWSLETTER_CATEGORY.id});});
test('missing security configuration keeps only newsletter unavailable',async()=>{for(const name of Object.keys(ready)){const env={...ready};delete env[name];assert.equal(await newsletterConfig('fixture',types,env),null);}});
test('legacy category or wrong ID, name or type cannot enable a general contact-form automation',async()=>{for(const type of [{id:123,name:'SLS_NEWSLETTER_DOI_ANGEFORDERT',category:'for_notes'},{id:1,name:NEWSLETTER_CATEGORY.name,category:'for_notes'},{id:NEWSLETTER_CATEGORY.id,name:'wrong',category:'for_notes'},{id:NEWSLETTER_CATEGORY.id,name:NEWSLETTER_CATEGORY.name,category:'email'}])assert.equal(await newsletterConfig('fixture',async()=>[type],ready),null);});

test('repeated provider pages cannot duplicate the verified category or cause twenty requests',async()=>{let calls=0;const items=[...(await types()),...Array.from({length:99},(_,i)=>({id:i+1,name:'other',category:'for_notes'}))];const result=await newsletterConfig('fixture',async()=>{calls++;return {data:items};},ready);assert.equal(result?.categoryId,NEWSLETTER_CATEGORY.id);assert.equal(calls,2);});

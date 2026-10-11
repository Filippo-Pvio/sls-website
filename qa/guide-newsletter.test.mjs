import test from 'node:test';
import assert from 'node:assert/strict';
import {newsletterConfig} from '../lib/guide-newsletter.mjs';
const ready={MS_GRAPH_TENANT_ID:'fixture',MS_GRAPH_CLIENT_ID:'fixture',MS_GRAPH_CLIENT_SECRET:'fixture',KV_REST_API_URL:'https://fixture.example',KV_REST_API_TOKEN:'fixture'};
test('dedicated newsletter requires existing mail and security configuration',async()=>{assert.deepEqual(await newsletterConfig('unused',null,ready),{dedicated:true});});
test('missing mail or security configuration keeps only newsletter unavailable',async()=>{for(const name of Object.keys(ready)){const env={...ready};delete env[name];assert.equal(await newsletterConfig('unused',null,env),null);}});
test('legacy Propstack category alone cannot enable the general contact-form automation',async()=>{assert.equal(await newsletterConfig('fixture',async()=>[{id:123,name:'SLS_NEWSLETTER_DOI_ANGEFORDERT',category:'for_notes'}],{}),null);});

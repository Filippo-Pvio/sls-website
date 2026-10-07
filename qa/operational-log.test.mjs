import test from 'node:test';
import assert from 'node:assert/strict';
import {logOperationalFailure} from '../lib/operational-log.mjs';
import propertyHandler from '../api/propstack-properties.js';
import {handler as contactHandler} from '../api/propstack-contact-request.js';
import {handler as guideHandler} from '../api/propstack-guide-request.js';

const privateText = 'PRIVATE_SENTINEL Anna Muster anna@example.org X-API-KEY=secret https://api.example.org/?token=secret';
async function capture(run) {
  const before = {error: console.error, warn: console.warn};
  const logs = [];
  console.error = (...args) => logs.push(args);
  console.warn = (...args) => logs.push(args);
  try { await run(logs); } finally { Object.assign(console, before); }
}

test('provider messages, parser excerpts, stack traces and nested causes never enter logs', async () => capture(logs => {
  for (const error of [new Error(privateText), new SyntaxError(privateText), Object.assign(new Error(privateText), {cause: {body: privateText, headers: privateText}})]) {
    error.stack = privateText;
    logOperationalFailure('contact_request_failed', error);
  }
  logOperationalFailure(privateText, new Error(privateText), 'warn');
  const text = JSON.stringify(logs);
  for (const forbidden of ['PRIVATE_SENTINEL', 'Anna', 'anna@example.org', 'secret', 'stack', 'cause', 'api.example.org']) assert.ok(!text.includes(forbidden), forbidden);
  assert.deepEqual(logs.map(args => JSON.parse(args[0])), [
    {event:'contact_request_failed',kind:'operation_failed'},
    {event:'contact_request_failed',kind:'invalid_response'},
    {event:'contact_request_failed',kind:'operation_failed'},
    {event:'operational_failure',kind:'operation_failed'}
  ]);
}));

test('timeouts and provider HTTP status remain diagnosable without free text', async () => capture(logs => {
  for (const error of [Object.assign(new Error(privateText),{name:'TimeoutError'}), new Error('read_timeout'), new Error('Propstack POST contacts/:id failed (403); validation fields: email'), new Error('Propstack HTTP 503'), new Error('read_http_429')]) logOperationalFailure('provider_operation_failed', error, 'warn');
  assert.deepEqual(logs.map(args => JSON.parse(args[0])), [
    {event:'provider_operation_failed',kind:'timeout'}, {event:'provider_operation_failed',kind:'timeout'},
    {event:'provider_operation_failed',kind:'provider_rejected',status:403},
    {event:'provider_operation_failed',kind:'provider_rejected',status:503},
    {event:'provider_operation_failed',kind:'provider_rejected',status:429}
  ]);
}));

test('real property, contact and guide handlers conceal malformed provider bodies in logs and responses', async () => capture(async logs => {
  const oldFetch = global.fetch;
  const names = ['NODE_ENV','VERCEL_ENV','PROPSTACK_PUBLIC_API_KEY','PROPSTACK_CONTACT_API_KEY','PROPSTACK_GUIDES_API_KEY'];
  const before = names.map(name => process.env[name]);
  Object.assign(process.env,{NODE_ENV:'production',VERCEL_ENV:'production',PROPSTACK_PUBLIC_API_KEY:'fixture-public',PROPSTACK_CONTACT_API_KEY:'fixture-contact',PROPSTACK_GUIDES_API_KEY:'fixture-guides'});
  global.fetch = async () => ({ok:true, json:async () => { throw new SyntaxError(privateText); }});
  try {
    for (const handler of [propertyHandler, contactHandler, guideHandler]) {
      const result = {};
      const response = {setHeader(){},status(status){result.status=status;return this;},json(body){result.body=body;return this;}};
      await handler({method:'GET',headers:{host:'sls-website-eight.vercel.app'},query:{}}, response);
      assert.ok(result.status >= 500);
      assert.ok(!JSON.stringify(result).includes('PRIVATE_SENTINEL'));
    }
    assert.equal(logs.length,3);
    assert.ok(logs.every(args => args.length === 1 && JSON.parse(args[0]).kind === 'invalid_response'));
    assert.ok(!JSON.stringify(logs).includes('PRIVATE_SENTINEL'));
  } finally {
    global.fetch = oldFetch;
    names.forEach((name,i) => before[i] === undefined ? delete process.env[name] : process.env[name] = before[i]);
  }
}));

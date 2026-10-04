const { test } = require('node:test');
const assert = require('node:assert/strict');
const {passReview,scripted}=require('./helpers.cjs');
const { answerQuestion } = require('../lib/answer');
const question = 'Ich möchte mein Haus in Dorsten verkaufen. Was muss ich beachten?';
const knowledge=require('../data/knowledge.json');
const payload = paragraphs => ({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({paragraphs:paragraphs.map(p=>({kind:'company',text:p.text||knowledge.find(s=>s.id===p.source_ids[0]).text,source_ids:p.source_ids}))})}]}]});
const valid = payload([{ text: 'Einzelbesichtigungen gehören zur Verkaufsbegleitung von SLS Immobilienpartner.', source_ids: ['sales-services'] }]);
const env = { OPENAI_API_KEY: 'test-only-not-a-real-key' };
const logger = { warn() {} };
function run(fetchImpl, extra={}) { return answerQuestion(question, { env, fetchImpl, logger, ...extra }); }
function response(data) { return scripted(data); }
test('regression: key alone invokes OpenAI with default model and server-only auth', async () => {
  let calls=0;
  const result=await run(async (url, options) => {
    calls++; assert.equal(url,'https://api.openai.com/v1/responses');
    const body=JSON.parse(options.body);
    assert.equal(body.model,'gpt-4.1-mini'); assert.equal(body.store,false);
    assert.equal(options.headers.Authorization,`Bearer ${env.OPENAI_API_KEY}`);
    assert.equal(body.text.format.strict,true);
    assert.ok(!options.body.includes(env.OPENAI_API_KEY));
    assert.ok(options.signal);
    return {ok:true,json:async()=>body.text.format.name==='answer_review'?passReview(body):valid};
  });
  assert.equal(calls,2); assert.equal(result.provider,'OpenAI');
  assert.match(result.answer,/\[\d+\]/);
  assert.deepEqual(result.sources.map(s=>s.id),['sales-services']);
  assert.ok(!JSON.stringify(result).includes(env.OPENAI_API_KEY));
});
test('blank model uses default; explicit model is preserved', async()=>{
  for(const model of ['  ','custom-model']) await run(async (url,options)=>{
    assert.equal(JSON.parse(options.body).model,model.trim()||'gpt-4.1-mini');
    return {ok:true,json:async()=>JSON.parse(options.body).text.format.name==='answer_review'?passReview(JSON.parse(options.body)):valid};
  },{env:{...env,OPENAI_MODEL:model}});
});
test('missing key falls back without outbound request',async()=>{
  const result=await run(()=>{throw Error('must not call')},{env:{}});
  assert.equal(result.reason,'missing_api_key'); assert.equal(result.provider,'Wissensbasis von SLS Immobilienpartner');
  assert.equal(result.sources.length,0);
});
test('general real estate guidance works without keyword match',async()=>{
 const data={status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({paragraphs:[{kind:'general',text:'Räumen Sie persönliche Dokumente vor dem Termin weg.',source_ids:[]}]})}]}]};
 const result=await answerQuestion('Wie bereite ich Räume für Bilder vor?',{env,fetchImpl:response(data),logger});
 assert.equal(result.provider,'OpenAI');assert.ok(!result.answer.includes('Allgemeiner Hinweis:'));assert.match(result.answer,/Dokumente/);assert.deepEqual(result.sources,[]);
});
for(const [status,reason] of [[401,'authentication'],[403,'authentication'],[429,'rate_limit'],[400,'configuration'],[404,'configuration'],[500,'upstream_error']]) {
  test(`HTTP ${status}: safe fallback with diagnostics`,async()=>{
    const logs=[];
    const r=await run(async()=>({ok:false,status}),{logger:{warn:s=>logs.push(s)}});
    assert.equal(r.reason,reason); assert.equal(r.provider,'Wissensbasis von SLS Immobilienpartner');
    assert.equal(r.sources.length,0); assert.equal(JSON.parse(logs[0]).status,status);
    assert.ok(!JSON.stringify([r,logs]).includes(env.OPENAI_API_KEY));
  });
}
for(const [name,data,reason] of [
  ['empty output',{status:'completed',output:[]},'invalid_response'],
  ['truncated response',{...valid,status:'incomplete'},'invalid_response'],
  ['refusal',{status:'completed',output:[{type:'message',role:'assistant',content:[{type:'refusal',refusal:'No'}]}]},'refusal'],
  ['missing citations',payload([{text:'Answer',source_ids:[]}]),'invalid_sources'],
  ['invented source',payload([{text:'Answer',source_ids:['made-up']}]),'invalid_sources'],
  ['invented marker',payload([{text:'Answer [99]',source_ids:['sales-services']}]),'invalid_sources'],
  ['untrusted extra text',{status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({source_ids:['sales-services'],answer:'Invented offer'})}]}]},'invalid_sources']
]) test(name,async()=>assert.equal((await run(response(data))).reason,reason));
test('non-JSON upstream response',async()=>assert.equal((await run(async()=>({ok:true,json:async()=>{throw Error('invalid')}}))).reason,'invalid_response'));
test('network error details never leak',async()=>{
  const logs=[];
  const r=await run(async()=>{throw Error(env.OPENAI_API_KEY)},{logger:{warn:s=>logs.push(s)}});
  assert.equal(r.reason,'upstream_error'); assert.ok(!JSON.stringify([r,logs]).includes(env.OPENAI_API_KEY));
});
test('slow fetch is aborted and falls back',async()=>{
  const r=await run((url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')))),{timeoutMs:10});
  assert.equal(r.reason,'timeout');
});

test('rejected commission summary falls back to full conditions',async()=>{
 const r=await answerQuestion('Wie hoch ist die Provision?',{env,logger,fetchImpl:async(url,options)=>({ok:true,json:async()=>JSON.parse(options.body).text.format.name==='answer_review'?require('./helpers.cjs').envelope({complete:false,concise:true,paragraphs:[{index:0,supported:true}]}):payload([{source_ids:['service-costs']}])})});
 assert.equal(r.reason,'verification_failed');assert.match(r.answer,/3,57/);assert.match(r.answer,/5.950/);assert.match(r.answer,/Investmentobjekten/);
});

test('reporting works through OpenAI and without a key',async()=>{
 for(const config of [{env,logger,fetchImpl:response(payload([{source_ids:['owner-reporting']}]))},{env:{},logger}]){
  const result=await answerQuestion('Ist das Reporting verfügbar?',config);
  assert.match(result.answer,/alle Verkaufsaufträge/);assert.deepEqual(result.limitations,[]);
  assert.equal(result.sources[0].url,'/quellen/owner-reporting.html');
 }
});

test('confirmed sales services are returned with their approved source',async()=>{
 for(const config of [{env,logger,fetchImpl:response(payload([{source_ids:['sales-services']}]))},{env:{},logger}]){
  const result=await answerQuestion('Welche festen Bestandteile hat die Verkaufsbegleitung?',config);
  for(const word of ['Bonitätsprüfung','Einzelbesichtigungen','Freigabe des Exposés','vorgemerkter Interessenten'])assert.ok(result.answer.includes(word));
  assert.equal(result.sources[0].id,'sales-services');assert.deepEqual(result.limitations,[]);
 }
});

test('presentation is property-dependent and without extra fees',async()=>{
 for(const config of [{env,logger,fetchImpl:response(payload([{source_ids:['presentation-services']}]))},{env:{},logger}]){
  const result=await answerQuestion('Kosten Fotos und Drohnenaufnahmen extra?',config);
  for(const word of ['je nach Immobilie','Fotos','Drohnenaufnahmen','Videos','360°-Rundgänge','ohne zusätzliche Leistungskosten'])assert.ok(result.answer.includes(word));
  assert.equal(result.sources[0].id,'presentation-services');assert.deepEqual(result.limitations,[]);
 }
});

test('confirmed central contact has a source and no outdated warning',async()=>{
 for(const config of [{env,logger,fetchImpl:response(payload([{source_ids:['central-contact']}]))},{env:{},logger}]){
  const result=await answerQuestion('Wie erreiche ich Sie per Telefon oder E-Mail?',config);
  assert.match(result.answer,/02369 742 80 20/);assert.match(result.answer,/service@sls.de/);
  assert.equal(result.sources[0].id,'central-contact');assert.deepEqual(result.limitations,[]);
 }
});
for(const [name,paragraph] of [
 ['general tips cannot borrow company citations',{kind:'general',text:'Räumen Sie auf.',source_ids:['presentation-services']}],
 ['unapproved company sources rejected',{kind:'company',text:'Wir begleiten Sie.',source_ids:['sales-process']}],
 ['unknown paragraph kind rejected',{kind:'other',text:'Text',source_ids:[]}],
 ['blank answer rejected',{kind:'general',text:' ',source_ids:[]}]
]) test(name,async()=>{
 const data={status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({paragraphs:[paragraph]})}]}]};
 assert.equal((await run(response(data))).reason,'invalid_sources');
});
test('model receives every confirmed fact and dated expert sources but no unapproved text',async()=>{
 await run(async(url,options)=>{
  const input=JSON.parse(JSON.parse(options.body).input);
  assert.equal(input.sources.filter(s=>s.category==='company').length,8);
  assert.equal(input.sources.filter(s=>s.category==='expert').length,6);
  assert.ok(input.sources.some(s=>s.id==='presentation-services'));
  assert.ok(input.sources.some(s=>s.id==='sales-services'));
  assert.ok(!input.sources.some(s=>s.id==='sales-process'));
  return {ok:true,json:async()=>JSON.parse(options.body).text.format.name==='answer_review'?passReview(JSON.parse(options.body)):valid};
 });
});

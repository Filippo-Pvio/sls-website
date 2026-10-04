const {test}=require('node:test');
const assert=require('node:assert/strict');
const {answerQuestion}=require('../lib/answer');
const {sourceContext}=require('../lib/sources');
const {scripted,envelope}=require('./helpers.cjs');
const question='Ich habe noch keine Mietwohnung gefunden, möchte aber mein Haus verkaufen – was soll ich machen?';
const env={OPENAI_API_KEY:'test-only-not-a-real-key'},logger={warn(){}};
test('screenshot question does not retrieve unrelated default sales services',()=>{
 assert.deepEqual(sourceContext(question).fallback,[]);
});
test('practical planning survives removal of an unnecessary follow-up question',async()=>{
 const r=await answerQuestion(question,{env,logger,fetchImpl:scripted(envelope({paragraphs:[
 {kind:'general',text:'Planen Sie Wohnungssuche und Verkaufsvorbereitung parallel. Klären Sie Ihren zeitlichen Spielraum und besprechen Sie einen möglichen Übergabetermin frühzeitig mit den Beteiligten.',source_ids:[]},
 {kind:'clarification',text:'Bis wann möchten Sie umziehen, und haben Sie bereits mit der Wohnungssuche begonnen?',source_ids:[]}
 ]}))});
 assert.equal(r.mode,'ai');assert.equal(r.verification.status,'passed');assert.match(r.answer,/Wohnungssuche/);assert.equal(r.sources.length,0);assert.ok(!r.answer.includes('?'));
 assert.ok(!r.answer.includes('Bonitätsprüfung'));
});
for(const [name,options] of [
 ['no key',{env:{}}],
 ['outage',{env,logger,fetchImpl:async()=>({ok:false,status:500})}],
 ['rejected draft',{env,logger,fetchImpl:async(url,options)=>({ok:true,json:async()=>JSON.parse(options.body).text.format.name==='answer_review'
 ?envelope({complete:false,concise:true,paragraphs:[{index:0,supported:false}]})
 :envelope({paragraphs:[{kind:'general',text:'Planen Sie Ihren Umzug.',source_ids:[]}]})})}]
])test(`no unrelated fallback on ${name}`,async()=>{
 const r=await answerQuestion(question,options);assert.notEqual(r.mode,'ai');assert.equal(r.sources.length,0);assert.ok(!r.answer.includes('?'));
 assert.ok(!r.answer.includes('Bonitätsprüfung'));assert.ok(!r.answer.includes('Notariat'));assert.match(r.answer,/nicht zuverlässig/);
});
test('specific confirmed service questions retain their relevant fallback',async()=>{
 const r=await answerQuestion('Prüfen Sie die Bonität der Käufer?',{env:{}});assert.ok(r.sources.some(s=>s.id==='sales-services'));
});

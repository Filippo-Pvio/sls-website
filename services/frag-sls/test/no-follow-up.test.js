const {test}=require('node:test');const assert=require('node:assert/strict');
const {answerQuestion}=require('../lib/answer');const {scripted,envelope}=require('./helpers.cjs');
const env={OPENAI_API_KEY:'test-only'},logger={warn(){}};
for(const question of ['Wann möchten Sie umziehen?','Teilen Sie mir Ihren Umzugstermin mit.','Könnten Sie mir mehr zum Objekt sagen.','Lassen Sie mich wissen, wann Sie umziehen möchten.'])test('removes follow-up before review: '+question,async()=>{
 const r=await answerQuestion('Kann ich vermarkten und gleichzeitig eine Wohnung zur Miete finden?',{env,logger,fetchImpl:scripted(envelope({paragraphs:[{kind:'general',text:'Planen Sie Wohnungssuche und Verkaufsvorbereitung parallel.',source_ids:[]},{kind:'clarification',text:question,source_ids:[]}]}))});
 assert.equal(r.mode,'ai');assert.ok(!r.answer.includes(question));assert.match(r.answer,/Wohnungssuche und Verkauf zeitlich/);assert.equal(r.paragraphs.length,1);
});
test('only questions produces neutral fallback, never a counterquestion',async()=>{
 const r=await answerQuestion('Was soll ich tun?',{env,logger,fetchImpl:scripted(envelope({paragraphs:[{kind:'clarification',text:'Wann möchten Sie umziehen?',source_ids:[]}]}))});assert.equal(r.reason,'verification_failed');assert.ok(!r.answer.includes('?'));
});

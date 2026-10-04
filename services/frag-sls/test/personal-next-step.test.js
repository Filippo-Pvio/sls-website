const {test}=require('node:test');const assert=require('node:assert/strict');
const {answerQuestion}=require('../lib/answer');const {personalNextStep}=require('../lib/personal-next-step');
const {scripted,envelope}=require('./helpers.cjs');
test('practical answer loses prefix and receives housing-specific invitation',async()=>{
 const r=await answerQuestion('Noch keine Mietwohnung gefunden, aber Haus verkaufen?',{env:{OPENAI_API_KEY:'test-only'},fetchImpl:scripted(envelope({paragraphs:[{kind:'general',text:'Allgemeiner Hinweis: Planen Sie die Wohnungssuche frühzeitig.',source_ids:[]}]}))});
 assert.equal(r.mode,'ai');assert.ok(!r.answer.includes('Allgemeiner Hinweis:'));assert.match(r.answer,/Wohnungssuche und Verkauf zeitlich/);assert.equal((r.answer.match(/Ihrem SLS Immobilienpartner/g)||[]).length,1);
});
test('fallback also includes personal next step without unrelated legal referrals',async()=>{
 const r=await answerQuestion('Wie bereite ich den Fotografentermin vor?',{env:{}});assert.match(r.answer,/Vorbereitung und Präsentation/);assert.ok(!r.answer.includes('Notariat'));
});
test('multiple specialist topics preserve respective responsibilities',()=>{
 const s=personalNextStep('Notaranderkonto, Steuer und Finanzierung?');for(const word of ['Notariat','Steuerberatung','Darlehensgeber','SLS Immobilienpartner'])assert.ok(s.includes(word));
});

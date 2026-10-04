const {test}=require('node:test');
const assert=require('node:assert/strict');
const {answerQuestion}=require('../lib/answer');
const {retrieve,limitations}=require('../lib/knowledge');
const question='Was kosten die Drohnenaufnahmen und wird die Finanzierung geprüft?';
const env={OPENAI_API_KEY:'test-only-not-a-real-key'};
const logger={warn(){}};
function mock(ids){return require('./helpers.cjs').scripted(require('./helpers.cjs').envelope({paragraphs:ids.map(id=>({kind:'company',text:require('../data/approved-facts.json').find(s=>s.id===id).text,source_ids:[id]}))}));}
test('screenshot regression: both subjects retrieved',()=>{
 const sources=retrieve(question);assert.ok(sources.some(s=>s.id==='presentation-services'));assert.ok(sources.some(s=>s.id==='sales-services'));
 assert.ok(sources.every(s=>s.required));
 assert.ok(!sources.some(s=>s.id==='commission'));
 assert.ok(limitations(question).some(s=>s.includes('Finanzierungszusage')));
 assert.ok(!limitations(question).some(s=>s.includes('fehlen hier freigegebene Fachinformationen')));
});
for(const [name,options] of [['AI combined answer',{env,logger,fetchImpl:mock(['presentation-services','sales-services'])}],['no key',{env:{},logger}],['upstream failure',{env,logger,fetchImpl:async()=>({ok:false,status:500})}]])test(`both answers survive ${name}`,async()=>{
 const r=await answerQuestion(question,options);
 assert.match(r.answer,/ohne zusätzliche Leistungskosten/);assert.match(r.answer,/Bonitätsprüfung/);
 assert.ok(r.sources.length>=2);assert.deepEqual(r.sources.map(s=>s.number),r.sources.map((_,i)=>i+1));
 assert.ok(r.limitations.some(s=>s.includes('Finanzierungszusage')));
});
test('reversed clause order also works',()=>{
 const ids=retrieve('Wird die Finanzierung geprüft und kosten Fotos extra?').map(s=>s.id);
 assert.ok(ids.includes('sales-services'));assert.ok(ids.includes('presentation-services'));
});
test('fallback preserves more than three required topics',async()=>{
 const r=await answerQuestion('Sind Fotos kostenlos, ist die Bonitätsprüfung enthalten, gibt es Reporting und wie erreiche ich Sie per Telefon?',{env:{},logger});
 for(const id of ['presentation-services','sales-services','owner-reporting','central-contact'])assert.ok(r.sources.some(s=>s.id===id));
});
test('explicit duration remains alongside presentation',()=>{
 const ids=retrieve('Kosten die Drohnenaufnahmen extra und wie lange dauert der Verkauf?').map(s=>s.id);
 assert.ok(ids.includes('presentation-services'));assert.ok(ids.includes('duration'));
});
test('private financing retains its limitation',()=>{
 assert.ok(limitations('Ich habe noch eine Restschuld und brauche einen Kredit.').some(s=>s.includes('Fachinformationen')));
});
test('a single presentation question remains short',async()=>{
 const r=await answerQuestion('Kosten Drohnenaufnahmen extra?',{env:{},logger});
 assert.deepEqual(r.sources.map(s=>s.id),['presentation-services']);
});

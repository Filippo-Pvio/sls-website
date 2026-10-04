const {test}=require('node:test');
const assert=require('node:assert/strict');
const {answerQuestion}=require('../lib/answer');
const {sourceContext}=require('../lib/sources');
const {envelope,passReview}=require('./helpers.cjs');
const env={OPENAI_API_KEY:'test-only-not-a-real-key'},logger={warn(){}};
const q='Wird das Geld nach der Beurkundung auf ein Notaranderkonto eingezahlt?';
const expert={kind:'expert',text:'Ein Notaranderkonto ist kein automatischer Zahlungsweg. Es setzt insbesondere ein berechtigtes Sicherungsinteresse voraus.',source_ids:['notary-escrow']};
const draft=paragraphs=>envelope({paragraphs});
function flow(paragraphs,review){let calls=[];return {calls,fetchImpl:async(url,options)=>{
 const body=JSON.parse(options.body);calls.push(body);
 if(body.text.format.name==='answer_review')return review?review(body,options):{ok:true,json:async()=>passReview(body)};
 return {ok:true,json:async()=>draft(paragraphs)};
}};}
const run=(f,question=q)=>answerQuestion(question,{env,logger,fetchImpl:f.fetchImpl});
test('expert answer is published only after the source review and carries original references',async()=>{
 const f=flow([expert]),r=await run(f);
 assert.equal(r.mode,'ai');assert.equal(r.verification.status,'passed');assert.equal(f.calls.length,2);
 assert.equal(f.calls[1].text.format.name,'answer_review');
 assert.equal(JSON.parse(f.calls[1].input).paragraphs[0].text,expert.text);
 assert.equal(r.sources[0].category,'expert');assert.ok(r.sources[0].references.some(x=>x.url.includes('/beurkg/__57.html')));
});
for(const [name,text,kind,ids,question] of [
 ['escrow as normal payment','Der Kaufpreis wird üblicherweise auf ein Notaranderkonto eingezahlt.','expert',['notary-escrow'],q],
 ['universal buyer check','Jeder Interessent wird vor der Besichtigung geprüft und ist garantiert zahlungsfähig.','company',['sales-services'],'Wird jeder Interessent auf Bonität geprüft?'],
 ['absence treated as evidence','Massenbesichtigungen sind nicht erwähnt und gehören daher nicht zum Standard.','company',['sales-services'],'Gibt es Massenbesichtigungen?'],
 ['incorrect citation','SLS Immobilienpartner garantiert die Finanzierung.','company',['presentation-services'],'Wird die Finanzierung geprüft?']
])test(`rejected ${name} never reaches visitor`,async()=>{
 const f=flow([{kind,text,source_ids:ids}],()=>({ok:true,json:async()=>envelope({complete:true,concise:true,paragraphs:[{index:0,supported:false}]})}));
 const r=await run(f,question);assert.equal(r.reason,'verification_failed');assert.equal(r.mode,'fallback');assert.ok(!r.answer.includes(text));assert.equal(r.paragraphs,undefined);
});
for(const verdict of [
 {complete:true,concise:true,paragraphs:[]},
 {complete:false,concise:true,paragraphs:[{index:0,supported:true}]},
 {complete:true,concise:false,paragraphs:[{index:0,supported:true}]},
 {complete:true,concise:true,paragraphs:[{index:1,supported:true}]},
 {complete:true,concise:true,paragraphs:[{index:0,supported:'true'}]},
 {complete:true,concise:true,paragraphs:[{index:0,supported:true}],override:true}
])test(`invalid review is not approval: ${JSON.stringify(verdict)}`,async()=>{
 const f=flow([expert],()=>({ok:true,json:async()=>envelope(verdict)}));assert.equal((await run(f)).reason,'verification_failed');
});
test('review cannot duplicate an index to hide an unsupported paragraph',async()=>{
 const f=flow([expert,{kind:'clarification',text:'Bitte klären Sie die konkrete Zahlungsabwicklung mit Ihrem Notariat.',source_ids:[]}],()=>({ok:true,json:async()=>envelope({complete:true,concise:true,paragraphs:[{index:0,supported:true},{index:0,supported:true}]})}));
 assert.equal((await run(f)).reason,'verification_failed');
});
test('review outage fails closed instead of releasing draft',async()=>{
 const r=await run(flow([expert],()=>({ok:false,status:500})));assert.equal(r.mode,'fallback');assert.equal(r.reason,'upstream_error');
});
test('review shares total timeout budget',async()=>{
 const f=flow([expert],(body,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')))));
 const r=await answerQuestion(q,{env,logger,fetchImpl:f.fetchImpl,timeoutMs:15});assert.equal(r.reason,'timeout');assert.equal(r.mode,'fallback');
});
test('refusal during review is not published',async()=>{
 const f=flow([expert],()=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'refusal',refusal:'no'}]}]})}));assert.equal((await run(f)).reason,'refusal');
});
test('financial claims cannot be disguised as general advice even if reviewer would approve',async()=>{
 const f=flow([{...expert,kind:'general',source_ids:[]}]);const r=await run(f);assert.equal(r.reason,'invalid_sources');assert.equal(f.calls.length,1);
});
test('expert citation cannot be borrowed for company claims',async()=>{
 const f=flow([{kind:'company',text:'SLS garantiert sichere Zahlung.',source_ids:['notary-escrow']}]);assert.equal((await run(f)).reason,'invalid_sources');
});
test('unknown legal subject can use concise clarification without fabricated source',async()=>{
 const f=flow([{kind:'clarification',text:'Welche Regelung gilt, hängt von Ihrem Vertrag ab. Lassen Sie die Klausel bitte individuell prüfen.',source_ids:[]}]);
 const r=await run(f,'Ist diese Klausel zu meiner Scheidung wirksam?');assert.equal(r.mode,'ai');assert.equal(r.sources.length,0);
});
test('irrelevant internal disclaimer is rejected before review',async()=>{
 const f=flow([{kind:'clarification',text:'Dazu liegen keine bestätigten Informationen von SLS vor.',source_ids:[]}]);assert.equal((await run(f)).reason,'verification_failed');assert.equal(f.calls.length,1);
});
test('expired legal summaries are excluded from generation and fallback',async()=>{
 const context=sourceContext(q,new Date('2027-01-02T00:00:00Z'));assert.ok(!context.all.some(s=>s.category==='expert'));
 const r=await answerQuestion(q,{env:{},now:new Date('2027-01-02T00:00:00Z')});assert.ok(!r.sources.some(s=>s.category==='expert'));assert.ok(!r.answer.includes('§ 57'));
});
test('fallback never includes unapproved project excerpts',async()=>{
 const r=await answerQuestion('Wie lange dauert der Verkauf in Dorsten?',{env:{}});
 assert.ok(!r.sources.some(s=>['duration','dorsten','sales-process'].includes(s.id)));
});
test('empty specialist fallback does not invent a fact',async()=>{
 const r=await answerQuestion('Gilt für die Scheidung meiner Schwester eine besondere Frist?',{env:{}});assert.equal(r.sources.length,0);assert.match(r.answer,/nicht zuverlässig/);
});
test('short practical answer remains possible without company facts',async()=>{
 const f=flow([{kind:'general',text:'Räumen Sie persönliche Dokumente weg und sorgen Sie für freie Flächen.',source_ids:[]}]);const r=await run(f,'Worauf muss ich beim Fotografentermin achten?');assert.equal(r.provider,'OpenAI');assert.equal(r.sources.length,0);
});

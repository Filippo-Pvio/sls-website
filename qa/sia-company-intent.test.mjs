import test from 'node:test';
import assert from 'node:assert/strict';
import {explicitCompanyQuestion} from '../api/lib/sia-company-intent.js';
import proxy from '../api/sia-ask.js';
for(const question of ['Wie seriös ist SLS?','Seit wann gibt es SLS?','Wie viele Immobilien hat SLS bisher verkauft?','Wo ist SLS vertreten?','Wer ist die Geschäftsführung von SLS Immobilienpartner?','Welche Mitarbeiter hat SLS?'])test(`company scope: ${question}`,()=>{
 assert.equal(explicitCompanyQuestion(question),true);
});
for(const question of ['Wie seriös ist der Verkäufer dieser Immobilie?','Wie teuer ist SLS 6749?','Wo steht dieses Haus von SLS?','Wie seriös ist SLS und was kostet dieses Haus?','Wie viele Zimmer hat SLS 6749?','Welche Standorte hat dieser Anbieter bei diesem Objekt?','Wer ist mein Ansprechpartner?','Wo steht das Haus?'])test(`property scope: ${question}`,()=>assert.equal(explicitCompanyQuestion(question),false));
test('explicit company question from a listing uses central company service, not listing data',async()=>{
 const original=fetch;process.env.VERCEL_ENV='preview';
 global.fetch=async(url,options)=>{
  assert.equal(url,'https://frag-sls.vercel.app/api/ask');const body=JSON.parse(options.body);
  assert.equal(body.question,'Wie seriös ist SLS?');assert.equal(body.context.type,'page');assert.ok(!body.context.property);
  return Response.json({provider:'Wissensbasis von SLS Immobilienpartner',answer:'Google-Kundenbewertungen und Referenzen. [1]',sources:[{number:1,id:'company-reputation',sourceType:'website'}],kind:'answer'});
 };
 const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},end(raw){this.data=JSON.parse(raw);}});
 try{
  let res=response();await proxy({method:'POST',headers:{'content-type':'application/json'},body:{question:'Wie seriös ist SLS?',pageContext:{type:'property',propertyId:'12345'}}},res);
  assert.equal(res.statusCode,200);assert.equal(res.data.sources[0].id,'company-reputation');
  res=response();await proxy({method:'POST',headers:{'content-type':'application/json'},body:{question:'Wie seriös ist SLS?',pageContext:{type:'property',propertyId:'bad'}}},res);assert.equal(res.statusCode,400);
 }finally{global.fetch=original;delete process.env.VERCEL_ENV;}
});

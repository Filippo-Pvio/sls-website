import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {parseApplication,sendApplication,careerConfigured,MAX_FILE_BYTES} from '../lib/career-application.mjs';
import handler from '../api/career-application.js';
const pdf=Buffer.from('%PDF-1.4\nTest CV\n%%EOF');
const file=(bytes=pdf,name='cv.pdf',field='cv')=>({field,name,content:bytes.toString('base64')});
const body=()=>({firstName:'Test',lastName:'Bewerbung',email:'test@example.org',website:'',privacy:true,files:[file()]});
const env={CAREER_PRIVACY_APPROVED:'1',CAREER_M365_TENANT_ID:'11111111-1111-1111-1111-111111111111',CAREER_M365_CLIENT_ID:'22222222-2222-2222-2222-222222222222',CAREER_M365_CLIENT_SECRET:'synthetic-test-secret-only',CAREER_TOKEN_SECRET:'synthetic-token-secret-at-least-32-characters'};
const res=()=>({code:0,data:null,setHeader(){},status(n){this.code=n;return this;},json(v){this.data=v;return this;}});
const token=()=>{const value=`${Date.now()-2000}.${randomUUID()}`;return `${value}.${createHmac('sha256',env.CAREER_TOKEN_SECRET).update(`sls-career:${value}`).digest('base64url')}`;};
const req=(b)=>({method:'POST',headers:{origin:'https://sls-website-eight.vercel.app','content-type':'application/json'},body:b});
test('CV required; other uploads optional; privacy acknowledgment required',()=>{
 assert.equal(parseApplication(body()).files.length,1);
 for(const patch of [{privacy:false},{files:[file(pdf,'letter.pdf','letter')]},{email:'a@example.org\r\nBcc: x@example.org'},{website:'bot'},{files:[null]}])assert.throws(()=>parseApplication({...body(),...patch}));
});
test('Reject wrong signatures, active PDF, duplicate fields, unsafe names and oversize files',()=>{
 for(const f of [file(Buffer.from('not PDF')),file(Buffer.from('%PDF-1.4\n/JavaScript\n%%EOF')),file(pdf,'../cv.pdf'),file(Buffer.alloc(MAX_FILE_BYTES+1)),{...file(),content:'!!!!'}])assert.throws(()=>parseApplication({...body(),files:[f]}));
 assert.throws(()=>parseApplication({...body(),files:[file(),file()]}));
 const big=Buffer.concat([Buffer.from('%PDF-1.4\n'),Buffer.alloc(1700000),Buffer.from('\n%%EOF')]);
 assert.throws(()=>parseApplication({...body(),files:[file(big),file(big,'letter.pdf','letter')]}));
 assert.throws(()=>parseApplication({...body(),files:[file(Buffer.from('PK'), 'cv.docx')]}));
});
test('Fixed mailbox and exact attachments, no applicant-controlled recipient',async()=>{
 const calls=[];await sendApplication(parseApplication({...body(),recipient:'attacker@example.org'}),'test-reference',{env,request:async(url,opts)=>{calls.push({url,opts});return calls.length===1?{ok:true,json:async()=>({access_token:'synthetic'})}:{status:202};}});
 const sent=JSON.parse(calls[1].opts.body);assert.match(calls[1].url,/bewerbung%40sls\.de\/sendMail$/);
 assert.equal(sent.message.toRecipients[0].emailAddress.address,'bewerbung@sls.de');assert.equal(sent.message.replyTo[0].emailAddress.address,'test@example.org');
 assert.equal(sent.message.attachments[0].contentBytes,pdf.toString('base64'));assert.equal(sent.saveToSentItems,false);
 await assert.rejects(()=>sendApplication(parseApplication(body()),'test',{env,request:async url=>url.includes('/token')?{ok:true,json:async()=>({access_token:'test'})}:{status:200}}));
});
test('API fails closed before reading uploads when connection is missing',async()=>{
 assert.equal(careerConfigured({}),false);
 const before={};for(const k of Object.keys(env)){before[k]=process.env[k];delete process.env[k];}
 try{const r=res();await handler({method:'GET',headers:{}},r);assert.equal(r.data.available,false);assert.equal(r.data.token,undefined);
 const r2=res();await handler({...req(null),get body(){throw new Error('must not read');}},r2);assert.equal(r2.code,503);
 const r3=res();await handler({...req(null),headers:{origin:'https://attacker.example'}},r3);assert.equal(r3.code,403);
 }finally{for(const k of Object.keys(env)){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}}
});
test('API accepts only confirmed mail acceptance and prevents duplicate/uncertain retries',async()=>{
 const previous={};for(const [k,v]of Object.entries(env)){previous[k]=process.env[k];process.env[k]=v;}const original=globalThis.fetch;let calls=0,fail=false;
 globalThis.fetch=async url=>{calls++;return url.includes('/token')?{ok:true,json:async()=>({access_token:'test'})}:{status:fail?500:202};};
 try{const b={...body(),token:token()},r=res();await handler(req(b),r);assert.equal(r.code,200);assert.equal(r.data.accepted,true);
 const r2=res();await handler(req(b),r2);assert.equal(r2.code,200);assert.equal(calls,2);
 fail=true;const b2={...body(),token:token()},r3=res();await handler(req(b2),r3);assert.equal(r3.code,502);assert.equal(r3.data.accepted,undefined);
 const r4=res();await handler(req(b2),r4);assert.equal(r4.code,409);assert.equal(calls,4);
 }finally{globalThis.fetch=original;for(const k of Object.keys(env)){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}}
});

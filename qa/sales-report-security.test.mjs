import test from 'node:test';
import assert from 'node:assert/strict';
import secured,{handler} from '../api/sales-check-report.js';
import {consumeVerificationScript} from '../lib/email-verification.mjs';
const response=()=>({setHeader(){},status(code){this.code=code;return this},json(body){this.body=body;return this}});
test('personal report sends only a confirmation first and only the confirmed report as PDF',async()=>{
 const names=['KV_REST_API_URL','KV_REST_API_TOKEN','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','MS_GRAPH_TENANT_ID','MS_GRAPH_CLIENT_ID','MS_GRAPH_CLIENT_SECRET'],before=names.map(n=>process.env[n]),oldFetch=global.fetch;
 Object.assign(process.env,{KV_REST_API_URL:'https://redis.example',KV_REST_API_TOKEN:'synthetic-token',MS_GRAPH_TENANT_ID:'synthetic',MS_GRAPH_CLIENT_ID:'synthetic',MS_GRAPH_CLIENT_SECRET:'synthetic'});delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;
 const db=new Map(),mails=[];
 global.fetch=async(url,options={})=>{
  if(url==='https://redis.example'){const a=JSON.parse(options.body);let result;if(a[0]==='SET'){db.set(a[1],a[2]);result='OK';}else{assert.equal(a[1],consumeVerificationScript);result=db.get(a[3])===a[4]?1:0;if(result)db.delete(a[3]);}return {ok:true,json:async()=>({result})};}
  if(url.startsWith('https://login.microsoftonline.com/'))return {ok:true,json:async()=>({access_token:'synthetic-graph-token'})};
  if(url.startsWith('https://graph.microsoft.com/')){mails.push(JSON.parse(options.body));assert.ok(url.includes('service%40sls.de'));return {ok:true,status:202};}
  return {ok:false};
 };
 const body={contact:{firstName:'Anna',lastName:'Muster',email:'a@example.org',phone:''},privacy:true,privacyVersion:'2026-10-07-v1',report:{type:'Haus',situation:'Verkauf',date:'07.10.2026',phases:[],contradictions:[]}};
 try{
  let res=response();await handler({method:'POST',body},res);assert.equal(res.code,200);assert.equal(res.body.status,'email_confirmation_required');assert.equal(mails.length,1);assert.equal(mails[0].message.attachments,undefined);const code=mails[0].message.body.content.match(/<strong>(\d{6})<\/strong>/)[1],ref=res.body.verificationRef;
  res=response();await handler({method:'POST',body:{...body,verificationRef:ref,verificationCode:'000000'}},res);assert.equal(res.code,400);assert.equal(mails.length,1);
  res=response();await handler({method:'POST',body:{...body,verificationRef:ref,verificationCode:code}},res);assert.equal(res.code,200);assert.equal(mails.length,2);const attachment=mails[1].message.attachments[0];assert.equal(attachment.contentType,'application/pdf');assert.ok(Buffer.from(attachment.contentBytes,'base64').subarray(0,5).equals(Buffer.from('%PDF-')));
  res=response();await handler({method:'POST',body:{...body,verificationRef:ref,verificationCode:code}},res);assert.equal(res.code,400);assert.equal(mails.length,2);
 }finally{global.fetch=oldFetch;names.forEach((n,i)=>before[i]===undefined?delete process.env[n]:process.env[n]=before[i]);}
});
test('public report handler rejects cross-origin requests before any external call',async()=>{const old=fetch;let calls=0;global.fetch=async()=>{calls++;throw Error();};try{const res=response();await secured({method:'POST',headers:{host:'sls-website-eight.vercel.app',origin:'https://other.example','content-type':'application/json'},body:{}},res);assert.equal(res.code,403);assert.equal(calls,0);}finally{global.fetch=old;}});

import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/property-page.js';
import {renderPropertyPage} from '../lib/property-page.mjs';
import {readFileSync} from 'node:fs';

const template=readFileSync(new URL('../immobilien/index.html',import.meta.url),'utf8');
const row={id:123,title:'Wohnung in Essen',city:'Essen',zip_code:'45127',marketing_type:'BUY',archived:false,status:{id:7,name:'Vermarktung'},price:150000,living_space:80,number_of_rooms:3,rs_type:'APARTMENT',images:[]};
async function request(mode,options={}){
  const oldFetch=global.fetch,oldKey=process.env.PROPSTACK_API_KEY;
  process.env.PROPSTACK_API_KEY='fixture-only';
  const calls=[];
  global.fetch=async input=>{
    const url=new URL(input);calls.push(url);
    if(mode==='offline')throw new Error('fixture upstream timeout');
    if(url.pathname.endsWith('/property_statuses'))return {ok:true,json:async()=>[{id:7,name:'Vermarktung'}]};
    if(url.pathname.endsWith('/units'))return {ok:true,json:async()=>({data:mode==='active'?[row]:[]})};
    return mode==='missing'?{ok:false,status:404}:{ok:true,json:async()=>mode==='sold'?{id:123,status:{id:8},title:'PRIVATE MUST NOT LEAK'}:row};
  };
  const res={code:200,headers:{},setHeader(key,value){this.headers[key.toLowerCase()]=value},status(code){this.code=code;return this},end(body=''){this.body=body;return this}};
  try{await handler({method:'GET',url:'/immobilie/wohnung-123/?objekt=999',query:{slug:'wrong-999'},...options},res);return {...res,calls}}
  finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.PROPSTACK_API_KEY;else process.env.PROPSTACK_API_KEY=oldKey}
}
test('active HTML contains property metadata and content before JavaScript, using the path ID',async()=>{
  const res=await request('active');
  assert.equal(res.code,200);
  assert.match(res.body,/<title>Wohnung in Essen \| SLS Immobilienpartner<\/title>/);
  assert.match(res.body,/<link rel="canonical" href="https:\/\/sls.de\/immobilie\/wohnung-in-essen-essen-123\/">/);
  assert.match(res.body,/<h1>Wohnung in Essen<\/h1>/);
  assert.match(res.body,/id="pp-property-jsonld"/);
  assert.equal(res.calls.find(url=>url.pathname.endsWith('/units')).searchParams.get('property_ids'),'123');
  assert.match(res.headers['x-robots-tag'],/noindex/);
  assert.match(res.headers['cache-control'],/no-store/);
  assert.doesNotMatch(res.body,/fixture-only/);
});
test('unknown objects return an HTML 404 without active listing metadata',async()=>{
  const res=await request('missing');assert.equal(res.code,404);
  assert.match(res.body,/<h1>Immobilie nicht gefunden<\/h1>/);
  assert.doesNotMatch(res.body,/id="pp-property-jsonld"|rel="canonical"/);
});
test('existing withdrawn objects return HTML 410 without exposing withdrawn data',async()=>{
  const res=await request('sold');assert.equal(res.code,410);
  assert.match(res.body,/<h1>Diese Immobilie ist nicht mehr verfügbar\.<\/h1>/);
  assert.doesNotMatch(res.body,/PRIVATE MUST NOT LEAK|id="pp-property-jsonld"|rel="canonical"/);
});
test('invalid paths do not call Propstack and HEAD preserves the status without a body',async()=>{
  const bad=await request('active',{url:'/immobilie/invalid/',query:{slug:'invalid'}});
  assert.equal(bad.code,404);assert.equal(bad.calls.length,0);
  const head=await request('missing',{method:'HEAD'});assert.equal(head.code,404);assert.equal(head.body,'');
});
test('upstream failures stay temporary rather than falsely declaring a property gone',async()=>{
  const res=await request('offline');assert.equal(res.code,502);assert.equal(res.headers['retry-after'],'60');
  assert.match(res.body,/Immobilie derzeit nicht abrufbar/);assert.doesNotMatch(res.body,/id="pp-property-jsonld"/);
});
test('unsupported methods cannot mutate anything',async()=>{
  const res=await request('active',{method:'POST'});assert.equal(res.code,405);assert.equal(res.calls.length,0);
});
test('HTML and JSON escape markup and preserve literal replacement strings',()=>{
  const title='A </script><script>alert(1)</script> $& "';
  const {html}=renderPropertyPage(template,{status:200,body:{items:[{id:'123',title,type:'Wohnung',description:title,objectFacts:[]}]}});
  assert.doesNotMatch(html,/<script>alert/);
  const embedded=html.match(/id="pp-server-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(embedded).property.title,title);
  assert.match(html,/&lt;\/script&gt;/);
});

test('production detail enables the inquiry form with configured Propstack access',async()=>{
  const before=process.env.VERCEL_ENV;
  try{
    process.env.VERCEL_ENV='production';
    const res=await request('active');
    const payload=JSON.parse(res.body.match(/id="pp-server-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(payload.property.inquiryEnabled,true);
  }finally{if(before===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=before}
});

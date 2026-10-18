// Loaded only by preview-only QA copies, never by real forms or a production build.
(() => {
 'use strict';
 const host='sls-website-git-feat-consent-tracking-phas-a6ca65-info-91172609.vercel.app';
 if(location.hostname!==host||!location.pathname.startsWith('/tracking-qa/')){window.fetch=()=>Promise.reject(new Error('QA fixture outside its permitted preview'));return;}
 const originalFetch=window.fetch.bind(window),scenario=new URL(location.href).searchParams.get('qa')||'success';
 const events=[],posts=[];
 const show=()=>{const out=document.querySelector('#tracking-qa-result');if(out)out.textContent=JSON.stringify({scenario,simulatedPosts:posts.length,localEvents:events,forwarded:(window.dataLayer||[]).filter(x=>x.event&&/_success$/.test(x.event)).map(x=>x.event)});};
 document.addEventListener('DOMContentLoaded',show);
 window.addEventListener('sls:conversion',e=>{events.push(e.detail?.event);queueMicrotask(show);});
 const response=(data,status=200)=>Promise.resolve(new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}}));
 window.fetch=(input,options={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href),method=String(options.method||input.method||'GET').toUpperCase();
  if(url.origin!==location.origin){
   if(url.hostname.endsWith('.google-analytics.com')&&url.searchParams.get('tid')==='G-CPX5L89D4H')return originalFetch(input,options);
   return response({error:'QA blocks other external fetches'},503);
  }
  if(!url.pathname.startsWith('/api/'))return method==='GET'?originalFetch(input,options):response({error:'QA blocks writes'},503);
  if(url.searchParams.has('formSecurity'))return response({securityToken:'qa-only-security-token'});
  const endpoint=url.pathname.replace(/\/$/,'');
  if(method==='POST'){
   posts.push(endpoint);show();
   if(scenario==='error')return response({ok:false,error:'QA: absichtlich abgelehnt',message:'QA: absichtlich abgelehnt'},422);
   if(endpoint==='/api/sales-check-report'){
    const body=JSON.parse(options.body||'{}');
    if(!body.verificationCode)return response({status:'email_confirmation_required',verificationRef:'qa-only-reference',message:'QA: Testcode 123456 eingeben. Keine E-Mail wurde versandt.'});
    if(body.verificationCode!=='123456')return response({ok:false,message:'QA: falscher Testcode'},400);
    return response({ok:true});
   }
   if(endpoint==='/api/propstack-guide-request'&&scenario==='review')return response({ok:true,status:'review_required',message:'QA: zur Prüfung gespeichert, kein Versand'});
   if(endpoint==='/api/propstack-search-profile')return response({ok:true,duplicate:scenario==='duplicate'});
   if(endpoint==='/api/propstack-test-inquiry')return response({ok:true,portalInquiryTriggered:true});
   if(['/api/propstack-contact-request','/api/propstack-guide-request'].includes(endpoint))return response({ok:true,status:'recorded',message:'QA: bestätigt, kein realer Versand'});
   return response({ok:false,error:'QA blocks unknown write'},503);
  }
  if(endpoint==='/api/propstack-contact-request')return response({token:Date.now()+'.qa-only',expiresAt:Date.now()+1800000,availableTopics:['sale','search','valuation','general','buyerfinder'],callbackAvailable:true});
  if(endpoint==='/api/propstack-guide-request')return response({token:'qa-only',availableGuides:['VERKAUF','BEWERTUNG','ERBSCHAFT','WOHNEN_IM_ALTER','TRENNUNG','UNTERLAGEN'],marketingAvailable:false});
  if(endpoint==='/api/buyer-demand')return response({count:3,location:'QA-Testregion',checkedAt:new Date().toISOString(),analysedClients:10});
  if(endpoint==='/api/propstack-properties')return response({items:[{id:'17',title:'QA-Testobjekt – kein echtes Angebot',city:'Teststadt',zip:'00000',price:100000,area:100,rooms:3,type:'Haus',status:'Verfügbar',images:['/assets/images/magazin/valuation.jpg'],description:'Ausschließlich für Tracking-Prüfungen.',features:'Test',inquiryEnabled:true,inquiryTestMode:false,broker:{name:'QA',phone:'000',email:'qa@example.invalid'}}],total:1,hasMore:false});
  return response({available:false,items:[],references:[]});
 };
})();

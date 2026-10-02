import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const code=await readFile(new URL('../assets/guides-page.js',import.meta.url),'utf8');
async function fixture(result={ok:true,message:'Vielen Dank! Sie erhalten Ihren Ratgeber in Kürze per E-Mail.'},ready=true,marketingReady=true){
 const callbacks={},requests=[],timers=[];
 const marketingAvailability={textContent:''};
 const status={textContent:'',classList:{toggle(){}},focus(){}};
 const reviewActions={hidden:true},correctButton={disabled:false,addEventListener:(event,fn)=>callbacks.correct=fn};
 const button={disabled:true,textContent:''},fields={disabled:true};
 const select={value:'VERKAUF',disabled:false,options:[{value:'VERKAUF',disabled:false}]};
 const form={elements:{firstName:{value:'Anna',focus(){}},lastName:{value:'Muster'},email:{value:'service@example.org',focus(){}},website:{value:''},marketingConsent:{checked:false,dataset:{consentVersion:'2026-10-02'}}},querySelector:s=>s==='fieldset'?fields:button,addEventListener:(event,fn)=>callbacks[event]=fn,reportValidity:()=>true,setAttribute(){},removeAttribute(){}};
 runInNewContext(code,{document:{getElementById:id=>({'guide-form':form,'guide-select':select,'guide-availability':status,'guide-review-actions':reviewActions,'guide-correct':correctButton,'guide-marketing-availability':marketingAvailability})[id],querySelectorAll:()=>[]},window:{setTimeout:fn=>timers.push(fn)},fetch:async(url,init={})=>{
  requests.push({url,...init});return {ok:init.method==='POST'?result.ok:ready,json:async()=>init.method==='POST'?result:ready?{availableGuides:['VERKAUF'],token:'signed-token',marketingAvailable:marketingReady,consentVersion:'2026-10-02'}:{error:'Nicht verfügbar'}};
 }});
 await new Promise(resolve=>setImmediate(resolve));timers.splice(0).forEach(fn=>fn());
 return {fields,button,select,form,status,requests,reviewActions,correctButton,correct:async()=>{callbacks.correct();await new Promise(resolve=>setImmediate(resolve));timers.splice(0).forEach(fn=>fn());},submit:()=>callbacks.submit({preventDefault(){}})};
}
test('form submits names with guide/email/token/trap, locks double-clicks, clears personal data after confirmed note',async()=>{
 const f=await fixture();assert.equal(f.fields.disabled,false);
 await Promise.all([f.submit(),f.submit()]);
 assert.equal(f.requests.filter(r=>r.method==='POST').length,1);
 assert.deepEqual(JSON.parse(f.requests[1].body),{guide:'VERKAUF',email:'service@example.org',firstName:'Anna',lastName:'Muster',token:'signed-token',website:'',marketingConsent:false,consentVersion:'2026-10-02'});
 assert.equal(f.fields.disabled,true);assert.equal(f.form.elements.email.value,'');assert.equal(f.form.elements.firstName.value,'');assert.equal(f.form.elements.lastName.value,'');
 assert.match(f.status.textContent,/in Kürze/);await f.submit();assert.equal(f.requests.length,2);
});
test('failed note write retains email and displays error rather than success',async()=>{
 const f=await fixture({ok:false,error:'Nicht bestätigt'});await f.submit();
 assert.equal(f.form.elements.email.value,'service@example.org');assert.equal(f.form.elements.firstName.value,'Anna');assert.equal(f.form.elements.lastName.value,'Muster');assert.equal(f.fields.disabled,false);assert.equal(f.status.textContent,'Nicht bestätigt');
});
test('unavailable backend keeps form disabled and prevents submission',async()=>{
 const f=await fixture(undefined,false);assert.equal(f.fields.disabled,true);await f.submit();assert.equal(f.requests.length,1);assert.equal(f.status.textContent,'Nicht verfügbar');
});

test('review retains entries and offers correction without claiming dispatch',async()=>{
 const result={ok:true,status:'review_required',message:'Ihre Anforderung wurde gespeichert. Bitte prüfen Sie Ihre Angaben.'};
 const f=await fixture(result);await f.submit();
 assert.equal(f.reviewActions.hidden,false);assert.equal(f.fields.disabled,true);
 assert.equal(f.form.elements.firstName.value,'Anna');assert.equal(f.form.elements.email.value,'service@example.org');
 assert.match(f.button.textContent,/Prüfung/);await f.submit();assert.equal(f.requests.length,2);
 await f.correct();assert.equal(f.fields.disabled,false);assert.equal(f.select.disabled,false);
 assert.equal(f.reviewActions.hidden,true);assert.equal(f.requests.length,3);
 result.status='recorded';result.message='Anforderung aufgenommen';
 await f.submit();assert.equal(f.form.elements.firstName.value,'');assert.equal(f.fields.disabled,true);
});

test('optional marketing consent is sent explicitly and cleared only after success',async()=>{
 const f=await fixture();f.form.elements.marketingConsent.checked=true;
 await f.submit();assert.equal(JSON.parse(f.requests[1].body).marketingConsent,true);
 assert.equal(JSON.parse(f.requests[1].body).consentVersion,'2026-10-02');
 assert.equal(f.form.elements.marketingConsent.checked,false);
});
test('marketing selection survives review and submission errors',async()=>{
 for(const result of [{ok:true,status:'review_required',message:'Bitte prüfen'},{ok:false,error:'Nicht bestätigt'}]){
  const f=await fixture(result);f.form.elements.marketingConsent.checked=true;await f.submit();
  assert.equal(f.form.elements.marketingConsent.checked,true);
 }
});
test('marketing checkbox is optional and unchecked; displayed consent matches the server evidence text',async()=>{
 const html=await readFile(new URL('../downloads/index.html',import.meta.url),'utf8');
 const {GUIDE_MARKETING_CONSENT_TEXT,GUIDE_MARKETING_CONSENT_VERSION}=await import('../lib/guide-consent.mjs');
 const input=html.match(/<input[^>]*id="guide-marketing"[^>]*>/)[0];
 assert.doesNotMatch(input,/\s(?:checked|required)(?:\s|=|>)/);
 assert.ok(input.includes(`data-consent-version="${GUIDE_MARKETING_CONSENT_VERSION}"`));
 assert.ok(html.includes(GUIDE_MARKETING_CONSENT_TEXT));
});

test('missing DOI configuration disables only newsletter signup, not the guide request',async()=>{
 const f=await fixture(undefined,true,false);
 assert.equal(f.fields.disabled,false);assert.equal(f.form.elements.marketingConsent.disabled,true);
 f.form.elements.marketingConsent.checked=true;
 await f.submit();assert.equal(JSON.parse(f.requests[1].body).marketingConsent,false);
});

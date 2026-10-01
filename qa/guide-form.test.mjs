import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const code=await readFile(new URL('../assets/guides-page.js',import.meta.url),'utf8');
async function fixture(result={ok:true,message:'Anforderung aufgenommen. Versand in Vorbereitung.'},ready=true){
 const callbacks={},requests=[],timers=[];
 const status={textContent:'',classList:{toggle(){}},focus(){}};
 const button={disabled:true,textContent:''},fields={disabled:true};
 const select={value:'VERKAUF',disabled:false,options:[{value:'VERKAUF',disabled:false}]};
 const form={elements:{email:{value:'service@example.org',focus(){}},website:{value:''}},querySelector:s=>s==='fieldset'?fields:button,addEventListener:(event,fn)=>callbacks[event]=fn,reportValidity:()=>true,setAttribute(){},removeAttribute(){}};
 runInNewContext(code,{document:{getElementById:id=>({'guide-form':form,'guide-select':select,'guide-availability':status})[id],querySelectorAll:()=>[]},window:{setTimeout:fn=>timers.push(fn)},fetch:async(url,init={})=>{
  requests.push({url,...init});return {ok:init.method==='POST'?result.ok:ready,json:async()=>init.method==='POST'?result:ready?{availableGuides:['VERKAUF'],token:'signed-token'}:{error:'Nicht verfügbar'}};
 }});
 await new Promise(resolve=>setImmediate(resolve));timers.forEach(fn=>fn());
 return {fields,button,select,form,status,requests,submit:()=>callbacks.submit({preventDefault(){}})};
}
test('form submits only guide/email/token/trap, locks double-clicks, clears email after confirmed note',async()=>{
 const f=await fixture();assert.equal(f.fields.disabled,false);
 await Promise.all([f.submit(),f.submit()]);
 assert.equal(f.requests.filter(r=>r.method==='POST').length,1);
 assert.deepEqual(JSON.parse(f.requests[1].body),{guide:'VERKAUF',email:'service@example.org',token:'signed-token',website:''});
 assert.equal(f.fields.disabled,true);assert.equal(f.form.elements.email.value,'');
 assert.match(f.status.textContent,/Vorbereitung/);await f.submit();assert.equal(f.requests.length,2);
});
test('failed note write retains email and displays error rather than success',async()=>{
 const f=await fixture({ok:false,error:'Nicht bestätigt'});await f.submit();
 assert.equal(f.form.elements.email.value,'service@example.org');assert.equal(f.fields.disabled,false);assert.equal(f.status.textContent,'Nicht bestätigt');
});
test('unavailable backend keeps form disabled and prevents submission',async()=>{
 const f=await fixture(undefined,false);assert.equal(f.fields.disabled,true);await f.submit();assert.equal(f.requests.length,1);assert.equal(f.status.textContent,'Nicht verfügbar');
});

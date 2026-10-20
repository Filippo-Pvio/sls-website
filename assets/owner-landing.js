(() => {
 'use strict';
 const form=document.getElementById('owner-form');if(!form)return;
 const secureFetch=(...args)=>import('/assets/form-security.js').then(m=>m.formFetch(...args));
 const endpoint='/api/propstack-contact-request',kind=form.dataset.landing;
 if(!['sale','valuation'].includes(kind))return;
 const steps=Array.from(form.querySelectorAll('[data-step]')),progress=Array.from(form.querySelectorAll('.lp-progress li'));
 const next=document.getElementById('next-step'),previous=document.getElementById('previous-step'),submit=document.getElementById('owner-submit'),status=document.getElementById('owner-status'),retry=document.getElementById('retry-form');
 const initialLabel=submit.textContent;let index=0,token='',readiness=null,busy=false,completed=false;
 function message(text,state=''){status.textContent=text;status.hidden=false;status.className='lp-status'+(state?' is-'+state:'');}
 function available(){return Boolean(token&&readiness?.availableTopics?.includes(kind)&&(form.elements.method.value!=='callback'||readiness.callbackAvailable));}
 function sync(){
  const callback=form.elements.method.value==='callback';document.getElementById('callback-fields').hidden=!callback;
  form.elements.phone.disabled=!callback||completed;form.elements.phone.required=callback;form.elements.window.disabled=!callback||completed;
  submit.disabled=busy||completed||!available();
  next.disabled=busy||completed;previous.disabled=busy||completed;
  if(readiness&&!available()&&!busy&&!completed)message('Diese Kontaktmöglichkeit ist gerade nicht verfügbar. Bitte wählen Sie E-Mail oder kontaktieren Sie uns direkt.','error');
 }
 function show(at,focus=true){index=at;steps.forEach((step,i)=>step.hidden=i!==at);progress.forEach((item,i)=>i===at?item.setAttribute('aria-current','step'):item.removeAttribute('aria-current'));previous.hidden=at===0||completed;next.hidden=at===2||completed;submit.hidden=at!==2;next.textContent=at===0?'Weiter zum Vorhaben →':'Weiter zum Kontakt →';if(focus){steps[at].scrollIntoView({block:'start',behavior:'auto'});steps[at].focus({preventScroll:true});}}
 function invalidWithin(step){return Array.from(step.querySelectorAll('input,select,textarea')).find(field=>!field.disabled&&!field.checkValidity());}
 next.addEventListener('click',()=>{const invalid=invalidWithin(steps[index]);if(invalid){invalid.reportValidity();return;}show(Math.min(index+1,2));});
 previous.addEventListener('click',()=>show(Math.max(index-1,0)));
 form.addEventListener('change',event=>{if(event.target.name==='method'){if(!busy&&!completed)status.hidden=true;sync();}});
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>document.body.classList.toggle('lp-form-visible',entries[0].isIntersecting),{rootMargin:'-80px 0px -100px 0px'}).observe(document.getElementById('anfrage'));
 form.addEventListener('focusin',()=>document.body.classList.add('lp-form-active'));
 form.addEventListener('focusout',event=>{if(!form.contains(event.relatedTarget))document.body.classList.remove('lp-form-active');});
 async function permission(renew=false){
  const response=await secureFetch(endpoint,{headers:{Accept:'application/json',...(renew&&token?{'X-SLS-Form-Token':token}:{})},cache:'no-store',signal:AbortSignal.timeout(20000)}),data=await response.json();
  if(!response.ok||!data.token||!Array.isArray(data.availableTopics))throw Error(data.error||'Das Formular ist gerade nicht verfügbar. Bitte kontaktieren Sie uns direkt.');
  token=data.token;readiness=data;return data;
 }
 async function initialise(){retry.hidden=true;submit.disabled=true;try{await permission();status.hidden=true;sync();}catch(error){message(error.name==='TimeoutError'?'Das Formular konnte gerade nicht geladen werden. Ihre Eingaben bleiben erhalten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.':error.message,'error');retry.hidden=false;}}
 retry.addEventListener('click',()=>{if(!busy&&!completed)initialise();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||completed)return;
  if(index<2){const invalid=invalidWithin(steps[index]);if(invalid){invalid.reportValidity();return;}show(index+1);return;}
  const invalidStep=steps.findIndex(step=>invalidWithin(step));if(invalidStep>=0){show(invalidStep);invalidWithin(steps[invalidStep]).reportValidity();return;}
  if(!available()){message('Das Formular ist gerade nicht verfügbar. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.','error');retry.hidden=false;return;}
  const fields=Object.fromEntries(new FormData(form));
  const body={topic:kind,firstName:fields.firstName,lastName:fields.lastName,email:fields.email,place:fields.place,message:fields.message,method:fields.method,phone:fields.phone||'',window:fields.window||'',website:fields.website||'',privacy:form.elements.privacy.checked,privacyVersion:'2026-10-20-landing',landing:{page:kind,propertyType:fields.propertyType,ownership:fields.ownership,timeline:fields.timeline}};
  busy=true;form.setAttribute('aria-busy','true');sync();submit.textContent='Ihre Anfrage wird gesendet …';message('Ihre Anfrage wird übermittelt.');
  try{
   const expires=readiness.expiresAt||Number(token.split('.')[0])+30*60*1000;if(Date.now()>=expires-60000)await permission(true);
   const post=()=>secureFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,token})});
   let response=await post(),result=await response.json();
   if(!response.ok&&result.code==='FORM_TOKEN_EXPIRED'){await permission(true);response=await post();result=await response.json();}
   if(!response.ok||result.ok!==true)throw Error(result.error||'Ihre Anfrage konnte noch nicht bestätigt werden. Ihre Eingaben bleiben erhalten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.');
   completed=true;form.querySelectorAll('input,select,textarea').forEach(field=>field.disabled=true);
   message(body.method==='callback'?'Vielen Dank! Ihre Anfrage und Ihr Rückrufwunsch sind eingegangen. Unser Team prüft Ihr Anliegen und meldet sich telefonisch. Ihr Zeitwunsch ist noch kein bestätigter Termin.':'Vielen Dank! Ihre Anfrage ist eingegangen. Unser Team prüft Ihr Anliegen und meldet sich per E-Mail.','success');
   submit.textContent='Anfrage eingegangen';previous.hidden=true;retry.hidden=true;
   window.dispatchEvent(new CustomEvent('sls:conversion',{detail:{event:'contact_request_success'}}));
  }catch(error){message(error.message||'Ihre Anfrage konnte nicht bestätigt werden. Ihre Eingaben bleiben erhalten. Bitte kontaktieren Sie uns direkt.','error');submit.textContent=initialLabel;}
  finally{busy=false;form.removeAttribute('aria-busy');sync();status.focus();}
 });
 show(0,false);sync();initialise();
})();

(() => {
  const form=document.querySelector('#buyer-form');if(!form)return;
  const steps=[...form.querySelectorAll('[data-step]')],next=document.querySelector('#buyer-next'),back=document.querySelector('#buyer-back'),submit=document.querySelector('#buyer-submit'),status=document.querySelector('#buyer-status');
  const endpoint='/api/propstack-contact-request';let step=0,token='',ready=null,busy=false,complete=false;
  function notify(text,error=false){status.textContent=text;status.hidden=!text;status.className=error?'is-error':'';}
  function available(){return token&&ready?.availableTopics?.includes('buyerfinder')&&(form.elements.method.value!=='callback'||ready.callbackAvailable);}
  function sync(){
    const callback=form.elements.method.value==='callback',type=form.elements.propertyType.value,rooms=['house','apartment','multi'].includes(type);
    document.querySelector('#buyer-callback').hidden=!callback;form.elements.phone.disabled=!callback;form.elements.phone.required=callback;form.elements.window.disabled=!callback;form.elements.window.required=callback;
    document.querySelector('#buyer-rooms').hidden=!rooms;form.elements.rooms.disabled=!rooms;form.elements.rooms.required=rooms;
    document.querySelector('#buyer-area-label').textContent=(type==='land'?'Ungefähre Grundstücksfläche':type==='commercial'?'Ungefähre Nutzfläche':'Ungefähre Wohnfläche')+' in m² *';
    steps.forEach((x,i)=>x.hidden=i!==step);document.querySelectorAll('[data-progress]').forEach((x,i)=>{if(i===step)x.setAttribute('aria-current','step');else x.removeAttribute('aria-current');});
    back.hidden=step===0;next.hidden=step===2;submit.hidden=step!==2;submit.disabled=busy||complete||!available();next.disabled=back.disabled=busy||complete;
    if(step===2&&!busy&&!complete&&!available())notify('Das Onlineformular ist gerade nicht verfügbar. Bitte schreiben Sie an service@sls.de oder rufen Sie uns unter 02369 742 80 20 an.',true);
    else if(!busy&&!complete)notify('');
  }
  function validStep(index){const fields=[...steps[index].querySelectorAll('input,select,textarea')].filter(x=>!x.disabled);for(const field of fields)if(!field.checkValidity()){field.reportValidity();return false;}return true;}
  function go(value){step=value;sync();steps[step].querySelector('legend').focus();}
  next.addEventListener('click',()=>{if(validStep(step))go(step+1);});back.addEventListener('click',()=>go(step-1));form.addEventListener('change',sync);
  async function initialise(){try{const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(20000)});const data=await response.json();if(response.ok&&data.token){ready=data;token=data.token;}sync();}catch{sync();}}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||complete)return;if(step<2){if(validStep(step))go(step+1);return;}
    for(let i=0;i<3;i++)if(!validStep(i)){go(i);return;}
    if(!available()){sync();return;}
    const body=Object.fromEntries(new FormData(form));Object.assign(body,{topic:'buyerfinder',rooms:body.rooms||'0',privacy:form.elements.privacy.checked,privacyVersion:'2026-10-03',token});
    busy=true;sync();submit.textContent='Wird gesendet …';notify('Ihre Anfrage wird übermittelt.');
    try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'Ihre Anfrage konnte nicht bestätigt werden.');complete=true;form.querySelectorAll('input,select,textarea').forEach(x=>x.disabled=true);notify('Vielen Dank! Ihre Anfrage ist eingegangen. Unser Team prüft Ihre Angaben und meldet sich bei Ihnen.');submit.textContent='Anfrage eingegangen';back.hidden=true;status.focus();}
    catch(error){notify(error.message||'Ihre Anfrage konnte nicht bestätigt werden. Bitte kontaktieren Sie uns direkt.',true);submit.textContent='Nachfragecheck anfragen';status.focus();}
    finally{busy=false;submit.disabled=complete||!available();}
  });sync();initialise();
})();

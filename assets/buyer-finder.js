(() => {
  const form=document.querySelector('#buyer-form');if(!form)return;
  const steps=[...form.querySelectorAll('[data-step]')],next=document.querySelector('#buyer-next'),back=document.querySelector('#buyer-back'),submit=document.querySelector('#buyer-submit'),status=document.querySelector('#buyer-status');
  const endpoint='/api/propstack-contact-request';let step=0,token='',ready=null,busy=false,complete=false,analysing=false,analysisKey='';
  function notify(text,error=false){status.textContent=text;status.hidden=!text;status.className=error?'is-error':'';}
  function available(){return token&&ready?.availableTopics?.includes('buyerfinder')&&(form.elements.method.value!=='callback'||ready.callbackAvailable);}
  function sync(){
    const callback=form.elements.method.value==='callback',type=form.elements.propertyType.value,rooms=['house','apartment','multi'].includes(type);
    document.querySelector('#buyer-callback').hidden=!callback;form.elements.phone.disabled=!callback;form.elements.phone.required=callback;form.elements.window.disabled=!callback;form.elements.window.required=callback;
    document.querySelector('#buyer-rooms').hidden=!rooms;form.elements.rooms.disabled=!rooms;form.elements.rooms.required=rooms;
    document.querySelector('#buyer-area-label').textContent=(type==='land'?'Ungefähre Grundstücksfläche':type==='commercial'?'Ungefähre Nutzfläche':'Ungefähre Wohnfläche')+' in m² *';
    steps.forEach((x,i)=>x.hidden=i!==step);document.querySelectorAll('[data-progress]').forEach((x,i)=>{if(i===step)x.setAttribute('aria-current','step');else x.removeAttribute('aria-current');});
    back.hidden=step===0;next.hidden=step===3;submit.hidden=step!==3;submit.disabled=busy||complete||!available();next.disabled=busy||complete||analysing;back.disabled=busy||complete;next.textContent=step===1?'Nachfrage prüfen':step===2?'Persönlichen Abgleich anfragen':'Weiter';
    if(step===3&&!busy&&!complete&&!available())notify('Das Onlineformular ist gerade nicht verfügbar. Bitte schreiben Sie an service@sls.de oder rufen Sie uns unter 02369 742 80 20 an.',true);
    else if(!busy&&!complete)notify('');
  }
  function validStep(index){const fields=[...steps[index].querySelectorAll('input,select,textarea')].filter(x=>!x.disabled);for(const field of fields)if(!field.checkValidity()){field.reportValidity();return false;}return true;}
  function go(value){step=value;sync();steps[step].querySelector('legend').focus();}
  next.addEventListener('click',()=>{if(!validStep(step))return;go(step+1);if(step===2)analyse();});back.addEventListener('click',()=>go(step-1));form.addEventListener('change',()=>{categories();sync();});

  const categoryOptions={house:[['SINGLE_FAMILY_HOUSE','Einfamilienhaus'],['TWO_FAMILY_HOUSE','Zweifamilienhaus'],['TERRACE_HOUSE','Reihenhaus'],['SEMIDETACHED_HOUSE','Doppelhaushälfte'],['BUNGALOW','Bungalow'],['VILLA','Villa']],apartment:[['APARTMENT','Etagenwohnung'],['GROUND_FLOOR','Erdgeschosswohnung'],['ROOF_STOREY','Dachgeschosswohnung'],['PENTHOUSE','Penthouse'],['MAISONETTE','Maisonette']]};let previousType='';
  function categories(){const type=form.elements.propertyType.value;if(type===previousType)return;previousType=type;const select=form.elements.category;select.replaceChildren(new Option('Noch offen',''));for(const [value,label] of categoryOptions[type]||[])select.add(new Option(label,value));document.querySelector('#buyer-category').hidden=!categoryOptions[type];select.disabled=!categoryOptions[type];}
  async function analyse(){
    const params=new URLSearchParams();for(const name of ['propertyType','category','place','area','rooms','price'])params.set(name,form.elements[name].disabled?'':form.elements[name].value);
    const key=params.toString();if(key===analysisKey)return;analysisKey='';analysing=true;sync();
    const box=document.querySelector('#buyer-analysis'),phase=document.querySelector('#buyer-analysis-phase'),result=document.querySelector('#buyer-analysis-result'),count=document.querySelector('#buyer-analysis-count'),copy=document.querySelector('#buyer-analysis-copy'),details=document.querySelector('#buyer-analysis-details');box.setAttribute('aria-busy','true');box.classList.add('is-analysing');result.hidden=true;phase.textContent='Wir öffnen unsere Interessentenkartei …';document.querySelector('#buyer-analysis-inventory').hidden=true;
    const phases=['Wir prüfen, wer in Ihrer Region kaufen möchte …','Wir vergleichen die Suchwünsche mit Ihrer Immobilie …','Wir ermitteln Ihre potenziellen Kaufinteressenten …'];let i=0;const timer=setInterval(()=>{phase.textContent=phases[Math.min(i++,phases.length-1)];},1800);
    try{try{const inventoryResponse=await fetch('/api/buyer-demand?summary=1',{cache:'no-store',signal:AbortSignal.timeout(60000)}),inventory=await inventoryResponse.json();if(inventoryResponse.ok&&Number.isSafeInteger(inventory.analysedClients)&&inventory.analysedClients>=0){document.querySelector('#buyer-inventory-count').textContent=inventory.analysedClients.toLocaleString('de-DE');document.querySelector('#buyer-analysis-inventory').hidden=false;phase.textContent='Ihre persönliche Auswertung wird vorbereitet …';await new Promise(resolve=>setTimeout(resolve,1800));}}catch{/* The matching request independently confirms availability. */}const response=await fetch('/api/buyer-demand?'+params,{cache:'no-store',signal:AbortSignal.timeout(60000)}),data=await response.json();if(!response.ok)throw new Error(data.error||'Der Nachfragecheck ist gerade nicht verfügbar.');if(!Number.isSafeInteger(data.count)||data.count<0)throw new Error('Der Nachfragecheck konnte nicht bestätigt werden.');analysisKey=key;count.textContent=data.count.toLocaleString('de-DE');copy.textContent=data.count===0?'Für diese Eckdaten haben wir keine passenden aktiven Suchprofile gefunden. Gemeinsam prüfen wir, wie wir neue Interessenten erreichen können.':'Potenzielle Kaufinteressenten';details.textContent=(Number.isSafeInteger(data.analysedClients)?'Geprüfte Kartei: '+data.analysedClients.toLocaleString('de-DE')+' aktive Kaufinteressenten · ':'')+data.location+' · '+(data.priceChecked?'Budget berücksichtigt':'Preisvorstellung offen – Budget noch nicht geprüft')+' · Datenstand '+new Date(data.checkedAt).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'});phase.textContent='Ihr erster Nachfragecheck ist fertig.';}
    catch(error){count.textContent='';copy.textContent=error.name==='TimeoutError'?'Der automatische Abgleich dauert gerade zu lange. Unser Team prüft die Nachfrage gerne persönlich für Sie.':error.message;details.textContent='Sie können Ihre Angaben ändern oder einen persönlichen Abgleich anfragen.';phase.textContent='Persönlicher Abgleich möglich.';}
    finally{clearInterval(timer);analysing=false;box.setAttribute('aria-busy','false');box.classList.remove('is-analysing');document.querySelector('#buyer-analysis-inventory').hidden=true;result.hidden=false;sync();}
  }
  async function initialise(){try{const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(20000)});const data=await response.json();if(response.ok&&data.token){ready=data;token=data.token;}sync();}catch{sync();}}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||complete)return;if(step<3){if(validStep(step)){go(step+1);if(step===2)analyse();}return;}
    for(let i=0;i<4;i++)if(!validStep(i)){go(i);return;}
    if(!available()){sync();return;}
    const body=Object.fromEntries(new FormData(form));Object.assign(body,{topic:'buyerfinder',rooms:body.rooms||'0',privacy:form.elements.privacy.checked,privacyVersion:'2026-10-03',token});
    busy=true;sync();submit.textContent='Wird gesendet …';notify('Ihre Anfrage wird übermittelt.');
    try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'Ihre Anfrage konnte nicht bestätigt werden.');complete=true;form.querySelectorAll('input,select,textarea').forEach(x=>x.disabled=true);notify('Vielen Dank! Ihre Anfrage ist eingegangen. Unser Team prüft Ihre Angaben und meldet sich bei Ihnen.');submit.textContent='Anfrage eingegangen';back.hidden=true;status.focus();}
    catch(error){notify(error.message||'Ihre Anfrage konnte nicht bestätigt werden. Bitte kontaktieren Sie uns direkt.',true);submit.textContent='Nachfragecheck anfragen';status.focus();}
    finally{busy=false;submit.disabled=complete||!available();}
  });categories();sync();initialise();
})();

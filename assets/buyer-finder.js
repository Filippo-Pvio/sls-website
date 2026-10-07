(() => {
  const secureFormFetch=(...args)=>import('/assets/form-security.js').then(module=>module.formFetch(...args));
  const form=document.querySelector('#buyer-form');if(!form)return;
  const steps=[...form.querySelectorAll('[data-step]')],next=document.querySelector('#buyer-next'),back=document.querySelector('#buyer-back'),submit=document.querySelector('#buyer-submit'),status=document.querySelector('#buyer-status');
  const endpoint='/api/propstack-contact-request';let step=0,token='',ready=null,busy=false,complete=false,analysing=false,analysisKey='',activeAnalysis=null;
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
  function go(value){if(value<2&&activeAnalysis)cancelAnalysis();step=value;sync();steps[step].querySelector('legend').focus();}
  next.addEventListener('click',()=>{if(!validStep(step))return;go(step+1);if(step===2)analyse();});back.addEventListener('click',()=>go(step-1));form.addEventListener('change',event=>{categories();if(analysisFields.includes(event.target.name))invalidateAnalysis();sync();});
  form.addEventListener('input',event=>{if(analysisFields.includes(event.target.name)){invalidateAnalysis();sync();}});

  const categoryOptions={house:[['SINGLE_FAMILY_HOUSE','Einfamilienhaus'],['TWO_FAMILY_HOUSE','Zweifamilienhaus'],['TERRACE_HOUSE','Reihenhaus'],['SEMIDETACHED_HOUSE','Doppelhaushälfte'],['BUNGALOW','Bungalow'],['VILLA','Villa']],apartment:[['APARTMENT','Etagenwohnung'],['GROUND_FLOOR','Erdgeschosswohnung'],['ROOF_STOREY','Dachgeschosswohnung'],['PENTHOUSE','Penthouse'],['MAISONETTE','Maisonette']]};let previousType='';
  function categories(){const type=form.elements.propertyType.value;if(type===previousType)return;previousType=type;const select=form.elements.category;select.replaceChildren(new Option('Noch offen',''));for(const [value,label] of categoryOptions[type]||[])select.add(new Option(label,value));document.querySelector('#buyer-category').hidden=!categoryOptions[type];select.disabled=!categoryOptions[type];}
  const analysisFields=['propertyType','category','place','area','rooms','price'];
  function analysisParams(){const params=new URLSearchParams();for(const name of analysisFields)params.set(name,form.elements[name].disabled?'':form.elements[name].value);return params;}
  function cancelAnalysis(){
    if(!activeAnalysis)return;
    const job=activeAnalysis;activeAnalysis=null;job.controller.abort();clearInterval(job.timer);analysing=false;
    const box=document.querySelector('#buyer-analysis');box.setAttribute('aria-busy','false');box.classList.remove('is-analysing');
    document.querySelector('#buyer-analysis-inventory').hidden=true;document.querySelector('#buyer-analysis-result').hidden=true;
  }
  function invalidateAnalysis(){cancelAnalysis();analysisKey='';document.querySelector('#buyer-analysis-result').hidden=true;}
  function analysisPause(signal){return new Promise((resolve,reject)=>{
    const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(signal.reason);};
    const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},1800);
    signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  });}
  async function analyse(){
    const params=analysisParams(),key=params.toString();if(key===analysisKey)return;
    cancelAnalysis();analysisKey='';const job={controller:new AbortController(),timer:null};activeAnalysis=job;analysing=true;sync();
    // Cancellation alone is insufficient: a response may already be decoding when inputs change.
    const current=()=>activeAnalysis===job&&!job.controller.signal.aborted&&key===analysisParams().toString();
    const requestOptions=()=>({cache:'no-store',signal:AbortSignal.any([job.controller.signal,AbortSignal.timeout(60000)])});
    const box=document.querySelector('#buyer-analysis'),phase=document.querySelector('#buyer-analysis-phase'),result=document.querySelector('#buyer-analysis-result'),count=document.querySelector('#buyer-analysis-count'),copy=document.querySelector('#buyer-analysis-copy'),details=document.querySelector('#buyer-analysis-details');
    box.setAttribute('aria-busy','true');box.classList.add('is-analysing');result.hidden=true;phase.textContent='Wir öffnen unsere Interessentenkartei …';document.querySelector('#buyer-analysis-inventory').hidden=true;
    const phases=['Wir prüfen, wer in Ihrer Region kaufen möchte …','Wir vergleichen die Suchwünsche mit Ihrer Immobilie …','Wir ermitteln Ihre potenziellen Kaufinteressenten …'];let i=0;
    job.timer=setInterval(()=>{if(current())phase.textContent=phases[Math.min(i++,phases.length-1)];},1800);
    try{
      try{
        const inventoryResponse=await fetch('/api/buyer-demand?summary=1',requestOptions()),inventory=await inventoryResponse.json();
        if(!current())return;
        if(inventoryResponse.ok&&Number.isSafeInteger(inventory.analysedClients)&&inventory.analysedClients>=0){
          document.querySelector('#buyer-inventory-count').textContent=inventory.analysedClients.toLocaleString('de-DE');document.querySelector('#buyer-analysis-inventory').hidden=false;phase.textContent='Ihre persönliche Auswertung wird vorbereitet …';await analysisPause(job.controller.signal);
        }
      }catch{if(!current())return;/* The matching request independently confirms availability. */}
      if(!current())return;
      const response=await fetch('/api/buyer-demand?'+params,requestOptions()),data=await response.json();
      if(!current())return;
      if(!response.ok)throw new Error(data.error||'Der Nachfragecheck ist gerade nicht verfügbar.');
      if(!Number.isSafeInteger(data.count)||data.count<0)throw new Error('Der Nachfragecheck konnte nicht bestätigt werden.');
      analysisKey=key;count.textContent=data.count.toLocaleString('de-DE');copy.textContent=data.count===0?'Für diese Eckdaten haben wir keine passenden aktiven Suchprofile gefunden. Gemeinsam prüfen wir, wie wir neue Interessenten erreichen können.':'Potenzielle Kaufinteressenten';
      details.textContent=(Number.isSafeInteger(data.analysedClients)?'Geprüfte Kartei: '+data.analysedClients.toLocaleString('de-DE')+' aktive Kaufinteressenten · ':'')+data.location+' · '+(data.priceChecked?'Budget berücksichtigt':'Preisvorstellung offen – Budget noch nicht geprüft')+' · Datenstand '+new Date(data.checkedAt).toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'});phase.textContent='Ihr erster Nachfragecheck ist fertig.';
    }catch(error){
      if(!current())return;
      count.textContent='';copy.textContent=error.name==='TimeoutError'?'Der automatische Abgleich dauert gerade zu lange. Unser Team prüft die Nachfrage gerne persönlich für Sie.':error.message;details.textContent='Sie können Ihre Angaben ändern oder einen persönlichen Abgleich anfragen.';phase.textContent='Persönlicher Abgleich möglich.';
    }finally{
      clearInterval(job.timer);
      // An obsolete request must not unlock buttons or hide the newer analysis.
      if(activeAnalysis===job){const valid=current();activeAnalysis=null;analysing=false;box.setAttribute('aria-busy','false');box.classList.remove('is-analysing');document.querySelector('#buyer-analysis-inventory').hidden=true;result.hidden=!valid;sync();}
    }
  }
  async function renewToken(){
    const response=await secureFormFetch(endpoint,{headers:{Accept:'application/json','X-SLS-Form-Token':token},cache:'no-store',signal:AbortSignal.timeout(20000)}),data=await response.json();
    if(!response.ok||!data.token)throw new Error('Die Formularfreigabe konnte gerade nicht erneuert werden. Ihre Eingaben bleiben erhalten. Bitte versuchen Sie es erneut.');
    token=data.token;ready=data;
  }
  async function sendRequest(body){
    const expiresAt=ready?.expiresAt || Number(token.split('.')[0])+30*60*1000;
    if(Date.now()>=expiresAt-60000)await renewToken();
    const post=()=>secureFormFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,token})});
    let response=await post(),result=await response.json();
    // Only this explicit pre-write rejection is safe to retry automatically.
    if(!response.ok&&result.code==='FORM_TOKEN_EXPIRED'){await renewToken();response=await post();result=await response.json();}
    return {response,result};
  }
  async function initialise(){try{const response=await secureFormFetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(20000)});const data=await response.json();if(response.ok&&data.token){ready=data;token=data.token;}sync();}catch{sync();}}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||complete)return;if(step<3){if(validStep(step)){go(step+1);if(step===2)analyse();}return;}
    for(let i=0;i<4;i++)if(!validStep(i)){go(i);return;}
    if(!available()){sync();return;}
    const body=Object.fromEntries(new FormData(form));Object.assign(body,{topic:'buyerfinder',rooms:body.rooms||'0',privacy:form.elements.privacy.checked,privacyVersion:'2026-10-07',token});
    busy=true;sync();submit.textContent='Wird gesendet …';notify('Ihre Anfrage wird übermittelt.');
    try{const {response,result}=await sendRequest(body);if(!response.ok||!result.ok)throw new Error(result.error||'Ihre Anfrage konnte nicht bestätigt werden.');complete=true;form.querySelectorAll('input,select,textarea').forEach(x=>x.disabled=true);notify('Vielen Dank! Ihre Anfrage ist eingegangen. Unser Team prüft Ihre Angaben und meldet sich bei Ihnen.');submit.textContent='Anfrage eingegangen';back.hidden=true;status.focus();}
    catch(error){notify(error.message||'Ihre Anfrage konnte nicht bestätigt werden. Bitte kontaktieren Sie uns direkt.',true);submit.textContent='Nachfragecheck anfragen';status.focus();}
    finally{busy=false;submit.disabled=complete||!available();}
  });categories();sync();initialise();
})();

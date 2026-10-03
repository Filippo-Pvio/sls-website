(() => {
  const form=document.querySelector('#contact-form');if(!form)return;
  const endpoint='/api/propstack-contact-request';
  const title=document.querySelector('#contact-form-title'),intro=document.querySelector('#contact-form-intro'),status=document.querySelector('#contact-status'),submit=form.querySelector('[type=submit]');
  const copy={
    sale:{title:'Ihr Verkauf beginnt<br>mit einem Gespräch.',intro:'Was möchten Sie verkaufen? Erzählen Sie uns kurz von Ihrer Immobilie und Ihren Plänen.',message:'Was sollten wir über Ihr Vorhaben wissen? <small>(optional)</small>',placeholder:'Zum Beispiel Immobilienart, Ihr Zeitplan oder Ihre Fragen …',place:'Wo befindet sich Ihre Immobilie? <small>(optional)</small>'},
    search:{title:'Was macht Ihr<br>neues Zuhause aus?',intro:'Erzählen Sie uns, wonach Sie suchen. Wir besprechen Ihre Wünsche persönlich mit Ihnen.',message:'Welche Immobilie suchen Sie? <small>(optional)</small>',placeholder:'Zum Beispiel Haus oder Wohnung, Größe, Budget und gewünschter Einzug …',place:'Wo möchten Sie eine Immobilie finden? <small>(optional)</small>'},
    valuation:{title:'Ein klareres Bild<br>vom Wert Ihrer Immobilie.',intro:'Sie möchten den Wert Ihrer Immobilie erfahren oder haben Fragen zu einer Einschätzung? Wir sprechen darüber.',message:'Was möchten Sie zur Bewertung wissen? <small>(optional)</small>',placeholder:'Zum Beispiel Immobilienart, Zustand oder Fragen zu einer bisherigen Bewertung …',place:'Wo befindet sich Ihre Immobilie? <small>(optional)</small>'},
    general:{title:'Wir hören Ihnen zu.',intro:'Was beschäftigt Sie? Schreiben Sie uns kurz, worum es geht.',message:'Ihr Anliegen <span aria-hidden="true">*</span>',placeholder:'Ihre Frage oder Nachricht an unser Team …'}
  };
  let token='',readiness=null,busy=false,completed=false;
  const showStatus=(text,state='')=>{status.textContent=text;status.hidden=false;status.className=`contact-status ${state ? 'is-'+state : ''}`;};
  const selected=()=>form.elements.topic.value;
  function sync(){
    const topic=selected(),data=copy[topic],callback=form.elements.method.value==='callback';
    title.innerHTML=data.title;intro.textContent=data.intro;
    document.querySelector('#contact-message-label').innerHTML=data.message;form.elements.message.placeholder=data.placeholder;form.elements.message.required=topic==='general';
    const place=document.querySelector('#contact-place-label');place.hidden=topic==='general';form.elements.place.disabled=topic==='general';
    if(data.place)document.querySelector('#contact-place-text').innerHTML=data.place;
    document.querySelector('#contact-callback').hidden=!callback;form.elements.phone.disabled=!callback;form.elements.phone.required=callback;form.elements.window.disabled=!callback;form.elements.window.required=callback;
    const available=readiness?.availableTopics?.includes(topic)&&(!callback||readiness.callbackAvailable);
    submit.disabled=busy||completed||!token||!available;
    if(!busy&&!completed&&readiness){
      if(!available)showStatus('Das Kontaktformular ist für diese Auswahl gerade nicht verfügbar. Bitte rufen Sie uns unter 02369 742 80 20 an oder schreiben Sie an service@sls.de.','error');
      else{status.hidden=true;status.className='contact-status';}
    }
  }
  async function initialise(){
    submit.disabled=true;
    try{const response=await fetch(endpoint,{headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok||!data.token)throw new Error(data.error||'Das Kontaktformular ist gerade nicht verfügbar. Bitte kontaktieren Sie uns direkt.');token=data.token;readiness=data;sync();}
    catch(error){showStatus(error.name==='TimeoutError'?'Das Kontaktformular konnte gerade nicht geladen werden. Bitte kontaktieren Sie uns direkt.':error.message,'error');}
  }
  form.addEventListener('change',event=>{if(event.target.name==='topic'||event.target.name==='method')sync();});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||completed)return;
    if(!form.reportValidity())return;
    if(!token||submit.disabled){showStatus('Das Kontaktformular ist gerade nicht verfügbar. Bitte kontaktieren Sie uns direkt.','error');return;}
    const data=new FormData(form);
    const body=Object.fromEntries(data);body.privacy=form.elements.privacy.checked;body.privacyVersion='2026-10-03';body.token=token;
    busy=true;sync();submit.textContent='Wird gesendet …';showStatus('Ihre Nachricht wird übermittelt.');
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();
      if(!response.ok||!result.ok)throw new Error(result.error||'Ihre Nachricht konnte gerade nicht übermittelt werden.');
      completed=true;form.querySelectorAll('input,textarea,select').forEach(field=>field.disabled=true);
      showStatus(body.method==='callback'?'Vielen Dank! Ihre Anfrage und Ihr Rückrufwunsch sind eingegangen. Unser Team berücksichtigt Ihren bevorzugten Zeitraum bei der Planung.':'Vielen Dank! Ihre Nachricht ist eingegangen. Unser Team meldet sich bei Ihnen per E-Mail.','success');status.focus();submit.textContent='Nachricht eingegangen';
    }catch(error){showStatus(error.message||'Ihre Nachricht konnte gerade nicht übermittelt werden. Bitte kontaktieren Sie uns direkt.','error');status.focus();submit.innerHTML='Nachricht senden <span aria-hidden="true">↗</span>';}
    finally{busy=false;submit.disabled=completed;}
  });
  document.querySelector('#contact-ask-sia').addEventListener('click',()=>{if(document.querySelector('sls-sia'))window.dispatchEvent(new Event('sls:sia-open'));else{document.querySelector('#anfrage').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});form.elements.message.focus();}});
  sync();initialise();
})();

(() => {
  const form=document.querySelector('[data-career-form]');if(!form)return;
  const submit=form.querySelector('[data-career-submit]'), availability=form.querySelector('[data-career-availability]'), status=form.querySelector('[data-career-status]');
  const fields=['cv','letter','certificates','other'];
  let token='', ready=false, busy=false, sent=false, uncertain=false;
  const maxFile=2*1024*1024,maxTotal=3*1024*1024;
  const show=(message,error=false) => {status.textContent=message;status.className=`career-status ${error?'is-error':'is-success'}`;status.hidden=false;};
  function updateFile(field) {
    const input=form.elements[field],file=input.files[0];
    form.querySelector(`[data-file-info="${field}"]`).textContent=file?`${file.name} · ${(file.size/1024/1024).toLocaleString('de-DE',{maximumFractionDigits:2})} MB`:'Noch keine Datei ausgewählt';
    form.querySelector(`[data-file-remove="${field}"]`).hidden=!file;
    const count=fields.slice(1).filter(name=>form.elements[name].files.length>0).length;
    const badge=form.querySelector('[data-additional-count]');
    if(badge){badge.hidden=!count;badge.textContent=`${count} ${count===1?'Datei':'Dateien'} ausgewählt`;}
  }
  fields.forEach(field=>{
    form.elements[field].addEventListener('change',()=>{
      const input=form.elements[field],file=input.files[0];
      input.setCustomValidity('');
      if(file && (!/\.(pdf|doc|docx)$/i.test(file.name)||!file.size||file.size>maxFile)){
        input.value='';show('Bitte wählen Sie eine PDF-, DOC- oder DOCX-Datei mit höchstens 2 MB aus.',true);
      }
      updateFile(field);
      const total=fields.reduce((sum,name)=>sum+(form.elements[name].files[0]?.size||0),0);
      if(total>maxTotal)show('Ihre Unterlagen dürfen zusammen höchstens 3 MB groß sein. Bitte verkleinern oder entfernen Sie eine Datei.',true);
    });
    form.querySelector(`[data-file-remove="${field}"]`).addEventListener('click',()=>{form.elements[field].value='';updateFile(field);});
  });
  fetch('/api/career-application',{cache:'no-store',credentials:'same-origin'}).then(async response=>{
    if(!response.ok)throw new Error('Unavailable');const config=await response.json();ready=config.available===true && typeof config.token==='string';token=ready?config.token:'';
    if(ready){availability.hidden=true;submit.disabled=false;}
    else availability.textContent='Die Online-Bewerbung ist derzeit nicht verfügbar. Bitte senden Sie Ihre Unterlagen direkt per E-Mail an bewerbung@sls.de.';
  }).catch(()=>{availability.textContent='Die Online-Bewerbung ist derzeit nicht verfügbar. Bitte senden Sie Ihre Unterlagen direkt per E-Mail an bewerbung@sls.de.';});
  const encode = file => new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Eine Datei konnte nicht gelesen werden. Bitte wählen Sie sie erneut aus.'));reader.readAsDataURL(file);});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!ready||busy||sent||uncertain)return;
    if(!form.reportValidity())return;
    const selected=fields.map(field=>({field,file:form.elements[field].files[0]})).filter(entry=>entry.file);
    if(selected.some(entry=>entry.file.size>maxFile)||selected.reduce((sum,entry)=>sum+entry.file.size,0)>maxTotal){show('Ihre Unterlagen dürfen zusammen höchstens 3 MB und je Datei höchstens 2 MB groß sein.',true);status.focus();return;}
    busy=true;submit.disabled=true;submit.textContent='Bewerbung wird übertragen …';status.hidden=true;
    let attempted=false;
    try {
      const payload={token,firstName:form.elements.firstName.value,lastName:form.elements.lastName.value,email:form.elements.email.value,phone:form.elements.phone.value,area:form.elements.area.value,message:form.elements.message.value,privacy:form.elements.privacy.checked,website:form.elements.website.value,files:await Promise.all(selected.map(async entry=>({field:entry.field,name:entry.file.name,content:await encode(entry.file)})))};
      attempted=true;
      const response=await fetch('/api/career-application',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload),signal:AbortSignal.timeout(45000)});
      const result=await response.json();
      if(response.ok && result.accepted===true){sent=true;show(`Vielen Dank. Der Versand Ihrer Bewerbung an bewerbung@sls.de wurde angenommen. Ihre Referenz: ${result.reference}`);form.reset();fields.forEach(updateFile);submit.textContent='Bewerbung übermittelt';}
      else {uncertain=response.status>=500||response.status===409;show(`${result.error||'Ihre Bewerbung konnte nicht übertragen werden.'}${result.reference?` Referenz: ${result.reference}`:''}`,true);}
    } catch(error){uncertain=attempted;show(attempted?'Der Versand konnte nicht eindeutig bestätigt werden. Bitte fragen Sie bei bewerbung@sls.de nach, bevor Sie erneut absenden.':error.message,true);}
    finally {busy=false;submit.disabled=sent||uncertain||!ready;if(!sent)submit.textContent=uncertain?'Bitte Versandstatus klären':'Bewerbung absenden';status.focus();}
  });
})();

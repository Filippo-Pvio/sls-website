(() => {
 'use strict';
 const form=document.getElementById('newsletter-form'),heading=document.getElementById('newsletter-heading'),status=document.getElementById('newsletter-status'),button=form.querySelector('button'),consent=document.getElementById('newsletter-consent');
 const params=new URLSearchParams(location.hash.slice(1));
 const action=params.has('confirm')?'confirm':params.has('unsubscribe')?'unsubscribe':null;
 const token=action?params.get(action):null;
 // The personal link stays in memory, never in a request URL, DOM, storage or referrer.
 if(location.hash)history.replaceState(null,'',location.pathname);
 if(!action||!token||token.length>1200){status.textContent='Bitte öffnen Sie den persönlichen Link aus unserer E-Mail. Bei Fragen erreichen Sie uns unter service@sls.de.';return;}
 heading.textContent=action==='confirm'?'Newsletter bestätigen':'Newsletter abmelden';
 button.textContent=action==='confirm'?'Newsletter bestätigen':'Newsletter abmelden';
 consent.hidden=action!=='confirm';form.hidden=false;
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(button.disabled)return;
  if(action==='confirm'&&!form.elements.confirmed.checked){status.textContent='Bitte bestätigen Sie die gewünschte Newsletter-Einwilligung.';return;}
  button.disabled=true;status.textContent='Ihre Auswahl wird verarbeitet …';
  try{
   const ready=await fetch('/api/newsletter/',{credentials:'same-origin',cache:'no-store'});
   const access=await ready.json();if(!ready.ok||!access.securityToken)throw Error('Der sichere Newsletter-Service ist gerade nicht verfügbar. Bitte versuchen Sie es später oder kontaktieren Sie service@sls.de.');
   const response=await fetch('/api/newsletter/',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,token,securityToken:access.securityToken})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Bitte kontaktieren Sie service@sls.de.');
   status.textContent=result.message;form.hidden=true;
  }catch(error){status.textContent=error.message;button.disabled=false;}
 });
})();

(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money=value=>value?new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(value)):'';
  const area=value=>value?`${new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(Number(value))} m²`:'';

  function criteriaText(criteria){
    const parts=[
      criteria.type&&criteria.type!=='Immobilie'?criteria.type:'',
      criteria.city,
      criteria.price?`bis ${money(criteria.price)}`:'',
      criteria.minArea?`ab ${area(criteria.minArea)}`:'',
      criteria.rooms?`ab ${criteria.rooms} Zimmer`:''
    ].filter(Boolean);
    return parts.join(' · ');
  }

  const mountedSources=new Set();
  function mount(root){
    const sourceId=root.dataset.searchProfileSource;
    const source=document.getElementById(sourceId);
    if(!source||mountedSources.has(sourceId))return;
    mountedSources.add(sourceId);

    const readCriteria=()=>{
      const form=new FormData(source);
      return {
        type:String(form.get('type')||'').trim(),
        city:String(form.get('city')||'').trim(),
        price:Number(form.get('price'))||null,
        minArea:Number(form.get('area'))||null,
        rooms:Number(form.get('rooms'))||null
      };
    };

    const dialog=document.createElement('dialog');
    dialog.className='sls-search-profile-dialog';
    dialog.innerHTML=`<form method="dialog" class="sls-search-profile-card">
      <div class="sls-search-profile-top"><div><p class="eyebrow">SLS Suchauftrag</p><h2>Suche speichern</h2></div><button type="button" data-profile-close aria-label="Schließen">×</button></div>
      <p>Wir informieren Sie, sobald eine passende Immobilie verfügbar ist.</p>
      <p class="sls-search-profile-criteria" data-profile-criteria></p>
      <div class="sls-search-profile-fields">
        <label>Vorname *<input name="firstName" autocomplete="given-name" required></label>
        <label>Nachname *<input name="lastName" autocomplete="family-name" required></label>
        <label>E-Mail *<input name="email" type="email" autocomplete="email" required></label>
        <label>Telefon *<input name="phone" type="tel" autocomplete="tel" required></label>
      </div>
      <label class="sls-search-profile-consent"><input type="checkbox" name="privacy" required><span>Ich habe die <a href="https://sls.de/datenschutz/" target="_blank" rel="noopener noreferrer">Datenschutzerklärung</a> gelesen und willige in die Verarbeitung meiner Daten zur Einrichtung meines Suchauftrags ein. *</span></label>
      <p class="sls-search-profile-status" role="status" aria-live="polite"></p>
      <button class="pp-button sls-search-profile-submit" type="submit">Suchauftrag speichern</button>
    </form>`;
    document.body.append(dialog);

    let activeRoot=root;
    const status=dialog.querySelector('.sls-search-profile-status');
    const form=dialog.querySelector('form');
    let criteria={};

    dialog.querySelector('[data-profile-close]').addEventListener('click',()=>dialog.close());
    // One dialog per search form also serves notices inserted during infinite scrolling.
    document.addEventListener('click',event=>{
      const open=event.target.closest('[data-search-profile-open]');
      const triggerRoot=open?.closest('[data-search-profile-source]');
      if(triggerRoot?.dataset.searchProfileSource!==sourceId)return;
      activeRoot=triggerRoot;
      if(!source.reportValidity())return;
      criteria=readCriteria();
      if(!criteria.type&&!criteria.city&&!criteria.price&&!criteria.minArea&&!criteria.rooms){
        status.textContent='';
        activeRoot.querySelector('[data-search-profile-note]').textContent='Bitte wählen Sie zuerst mindestens ein Suchkriterium aus.';
        return;
      }
      activeRoot.querySelector('[data-search-profile-note]').textContent='';
      dialog.querySelector('[data-profile-criteria]').textContent=criteriaText(criteria);
      dialog.showModal();
    });

    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!form.reportValidity())return;
      const fields=Object.fromEntries(new FormData(form));
      const submit=form.querySelector('.sls-search-profile-submit');
      submit.disabled=true;status.textContent='Suchauftrag wird gespeichert …';
      try{
        const response=await fetch('/api/propstack-search-profile',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({...fields,privacy:fields.privacy==='on',criteria})
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error||'Der Suchauftrag konnte nicht gespeichert werden.');
        status.textContent=data.duplicate?'Dieser Suchauftrag ist bereits für Sie gespeichert.':'Vielen Dank. Ihr Suchauftrag wurde in Propstack gespeichert.';
        activeRoot.classList.add('is-saved');
        activeRoot.querySelector('[data-search-profile-note]').textContent='Ihr Suchauftrag ist gespeichert. Wir melden uns bei passenden Immobilien.';
        setTimeout(()=>dialog.close(),1800);
      }catch(error){status.textContent=error.message}
      finally{submit.disabled=false}
    });
  }

  window.SLSSearchProfile={mount};
  document.querySelectorAll('[data-search-profile-source]').forEach(mount);
})();

(() => {
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const format=n=>n==null?'Preis auf Anfrage':new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
  const area=n=>n==null?'–':`${new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n)} m²`;
  const date=x=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(x||''));return m?`${m[3]}.${m[2]}.${m[1]}`:x};
  const url=new URL(location.href), demo=url.searchParams.get('demo')==='1', id=url.searchParams.get('objekt');
  const sample={id:'demo',title:'Lichtdurchflutete Wohnung mit Balkon, offenem Wohnen, Stellplatz und langfristig gesicherter Miete',city:'Raesfeld',zip:'46348',price:139500,area:52.06,rooms:2,bedrooms:1,baths:1,year:2002,type:'Wohnung',status:'Verfügbar',images:['https://sls.de/wp-content/uploads/2026/09/6927c1a63b43bc35506a97fd149101a1.jpg','https://sls.de/wp-content/uploads/2026/09/8b0f34e1662b362b49076948be67fb47.jpg','https://sls.de/wp-content/uploads/2026/09/ed4ad76935300ee4c87702b1fb3e962c.jpg','https://sls.de/wp-content/uploads/2026/09/ee63526f68d37e694efac2bc8b383435.jpg'],description:'Die Wohnung liegt im ersten Obergeschoss. Durch die offene Küche und den hellen Wohnbereich entsteht ein zusammenhängender Raum. Zur Wohnung gehören ein Balkon, ein Außenstellplatz und ein Kellerraum. Die Wohnung ist seit 2019 vermietet.',location:'46348 Raesfeld',features:'Balkon, Außenstellplatz, Kellerraum',courtage:'3,57 % inkl. MwSt.',broker:{name:'Herr Cüneyt Demirli',phone:'(02369) 742 80 20',email:'c.demirli@sls.de',mobile:'+49 152 099 30 734'}};
  let all=[];
  const photo=(src,alt)=>src?`<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`:'<span class="pp-fallback">SLS Immobilienpartner</span>';
  const previewLink=p=>`/immobilien-test/?objekt=${encodeURIComponent(p.id)}${demo?'&demo=1':''}`;
  const card=p=>{
    const energy=p.energy||{};
    const energyLine=energy.kind&&energy.value!=null&&energy.fuel&&energy.buildingYear&&energy.rating
      ?`${esc(energy.kind)} · ${esc(new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(energy.value))} kWh/(m²·a) · ${esc(energy.fuel)} · ${energy.yearFromCertificate?'Baujahr':'Baujahr lt. Objektdaten'} ${esc(energy.buildingYear)} · Klasse ${esc(energy.rating)}`
      :'Energieangaben für die Veröffentlichung prüfen';
    return `<a class="pp-card" href="${previewLink(p)}"><div class="pp-image">${photo(p.images?.[0],p.title)}<span class="pp-chip">${esc(p.status||'Verfügbar')}</span></div><div class="pp-card-content"><span class="pp-city">${esc(p.city)}</span><h2>${esc(p.title)}</h2><div class="pp-stats"><span>${area(p.area)}</span>${p.rooms!=null?`<span>${esc(p.rooms)} Zimmer</span>`:''}<span>${esc(p.type)}</span></div><span class="pp-price">${format(p.price)}</span>${p.courtage?`<small class="pp-card-courtage">Käuferprovision: ${esc(p.courtage)}</small>`:''}<small class="pp-card-energy">${energyLine}</small></div></a>`;
  };
  const fact=(label,value)=>value==null||value===''?'':`<div class="pp-fact"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
  function renderList(){
    const form=new FormData($('#pp-form'));
    const query=String(form.get('query')||'').toLocaleLowerCase('de').trim(),city=String(form.get('city')||'').toLocaleLowerCase('de').trim();
    const type=form.get('type'),price=Number(form.get('price')),minArea=Number(form.get('area')),rooms=Number(form.get('rooms'));
    const found=all.filter(p=>(!query||`${p.title} ${p.id}`.toLocaleLowerCase('de').includes(query))&&(!city||p.city.toLocaleLowerCase('de').includes(city))&&(!type||p.type===type)&&(!price||(p.price!=null&&p.price<=price))&&(!minArea||(p.area!=null&&p.area>=minArea))&&(!rooms||(p.rooms!=null&&p.rooms>=rooms)));
    switch($('#pp-sort').value){case'price-asc':found.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));break;case'price-desc':found.sort((a,b)=>(b.price??-1)-(a.price??-1));break;case'area-desc':found.sort((a,b)=>(b.area??0)-(a.area??0))}
    $('#pp-count').textContent=`Zeige ${found.length} ${found.length===1?'Immobilie':'Immobilien'}`;
    $('#pp-results').innerHTML=found.length?found.map(card).join(''):'<div class="pp-error">Für diese Suchkriterien sind keine Immobilien freigegeben.</div>';
  }
  function renderDetail(p){
    $('#pp-search').hidden=true;$('#pp-detail').hidden=false;
    document.body.classList.add('pp-is-detail');
    document.title=`${p.title} · SLS Testseite`;
    $('.pp-back').href=demo?'/immobilien-test/?demo=1':'/immobilien-test/';
    const pictures=p.images||[];
    const pf=p.propertyFacts||{}, energy=p.energy||{};
    const amenityPaths={Balkon:'<path d="M3 13h18M5 13V4h14v9M5 13v7m14-7v7M3 20h18"/>',Garage:'<path d="m3 9 9-6 9 6v12H3V9Zm3 12v-9h12v9M8 15h8"/>',Garten:'<path d="M12 21v-8m0 4-5-3m5 1 5-4M12 3c5 0 9 4 9 9 0 4-3 6-7 5M12 3C7 3 3 7 3 12c0 4 3 6 7 5"/>',Keller:'<path d="M3 8h18v13H3V8Zm4-5h10v5M7 13h4m-4 4h4m3-4h3m-3 4h3"/>',Aufzug:'<path d="M5 3h14v18H5V3Zm4 5 2-2 2 2m-4 8 2 2 2-2M16 7v10"/>',Bodenbelag:'<path d="M3 3h18v18H3V3Zm0 9h18M12 3v18"/>',Dusche:'<path d="M5 21V7a4 4 0 0 1 8 0m-2 1h7m-7 4v2m3-2v2m3-2v2M4 21h16"/>','Bad mit Badewanne':'<path d="M3 12h18v4a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-4Zm2 0V5a2 2 0 0 1 4 0"/>','Bad mit Fenster':'<path d="M3 3h18v18H3V3Zm9 0v18M3 12h18"/>','Gäste-WC':'<path d="M5 3h14v9a7 7 0 0 1-14 0V3Zm3 18h8M12 19v2"/>'};
    const icon=label=>`<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${amenityPaths[label.split(':')[0]]||amenityPaths.Bodenbelag}</svg>`;
    const gallery=pictures.length?`<div class="pp-gallery"><div class="pp-gallery-stage"><img class="pp-gallery-current" src="${esc(pictures[0])}" alt="${esc(p.title)}"><span class="pp-gallery-count" aria-live="polite">1 / ${pictures.length}</span>${pictures.length>1?'<button class="pp-gallery-arrow pp-gallery-prev" type="button" aria-label="Vorheriges Bild">‹</button><button class="pp-gallery-arrow pp-gallery-next" type="button" aria-label="Nächstes Bild">›</button>':''}</div>${pictures.length>1?`<div class="pp-gallery-rail" aria-label="Weitere Objektbilder">${pictures.map((src,i)=>`<button type="button" class="pp-gallery-thumb${i===0?' is-active':''}" data-photo="${i}" aria-label="Bild ${i+1} von ${pictures.length} anzeigen" aria-pressed="${i===0}">${photo(src,p.title+' – Bild '+(i+1))}</button>`).join('')}</div>`:''}</div>`:'';
    const summary=[fact('Kaufpreis',format(p.price)),fact('Zimmer',p.rooms),fact('Schlafzimmer',p.bedrooms),fact('Badezimmer',p.baths),fact('Wohnfläche',p.area==null?null:area(p.area)),fact('Baujahr',p.year)].join('');
    const property=[fact('Standort',[p.zip,p.city].filter(Boolean).join(' ')),fact('Objekttyp',p.type),fact('Wohnfläche',p.area==null?null:area(p.area)),fact('Zimmer',p.rooms),fact('Schlafzimmer',p.bedrooms),fact('Badezimmer',p.baths),fact('Grundstücksfläche',p.plot==null?null:area(p.plot)),fact('Etage',pf.floor),fact('Balkone',pf.balconies),fact('Stellplätze',pf.parkingCount!=null?`${pf.parkingCount} ${pf.parking||''}`.trim():pf.parking),fact('Hausgeld',pf.fee==null?null:format(pf.fee)),fact('Kaufpreis',format(p.price)),fact('Käuferprovision',p.courtage),fact('Bezugsfrei ab',pf.freeFrom),fact('Baujahr',p.year),fact('Letzte Modernisierung',pf.lastRenovation),fact('Zustand',pf.condition)].join('');
    const energyLabel=/verbrauch/i.test(energy.kind||'')?'Endenergieverbrauch':/bedarf/i.test(energy.kind||'')?'Endenergiebedarf':'Endenergiekennwert';
    const energyFacts=[fact('Energieausweis',energy.availability),fact('Energieausweistyp',energy.kind),fact(energyLabel,energy.value==null?null:`${new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(energy.value)} kWh/(m²·a)`),fact('Wesentlicher Energieträger',energy.fuel),fact(energy.yearFromCertificate?'Baujahr laut Energieausweis':'Baujahr laut Objektdaten',energy.buildingYear),fact('Energieeffizienzklasse',energy.rating),fact('Ausgestellt am',energy.issuedOn?date(energy.issuedOn):null),fact('Gültig bis',energy.validUntil?date(energy.validUntil):null),fact('Baujahr Anlagentechnik',energy.equipmentYear),fact('Heizungsart',energy.heating)].join('');
    const energyComplete=Boolean(energy.kind&&energy.value!=null&&energy.fuel&&energy.buildingYear&&energy.rating);
    const money=`<section class="pp-panel pp-money" aria-labelledby="pp-money-heading"><div class="pp-section-lead"><span class="pp-eyebrow">Kaufkonditionen</span><h2 id="pp-money-heading">Kaufpreis & Provision</h2></div><dl class="pp-facts">${fact('Kaufpreis',format(p.price))}${fact('Käuferprovision',p.courtage)}</dl>${p.courtageNote?`<div class="pp-provision-note"><strong>Provisionshinweis</strong><p>${esc(p.courtageNote)}</p></div>`:p.courtage?'<p class="pp-data-note">Ein ausführlicher Provisionshinweis ist für dieses Objekt in Propstack derzeit nicht verfügbar. Vor Veröffentlichung prüfen.</p>':''}</section>`;
    const energyShort=energyComplete?`<div class="pp-energy-short"><strong>Energie auf einen Blick</strong><span>${esc(energy.kind)} · ${esc(new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(energy.value))} kWh/(m²·a) · ${esc(energy.fuel)} · Baujahr ${esc(energy.buildingYear)} · Klasse ${esc(energy.rating)}</span><a href="#pp-energy">Alle Angaben zum Energieausweis ↓</a></div>`:energy.availability&&/liegt vor|verfügbar/i.test(energy.availability)?'<p class="pp-data-note">Die Energieangaben sind in Propstack nicht vollständig. Vor Veröffentlichung prüfen.</p>':'';
    const energyScale=energy.rating?`<div class="pp-energy-scale" aria-label="Energieeffizienzklasse ${esc(energy.rating)}">${['A+','A','B','C','D','E','F','G','H'].map((rating,i)=>`<span class="pp-scale-step pp-scale-${i}${energy.rating.toUpperCase()===rating?' is-current':''}" ${energy.rating.toUpperCase()===rating?'aria-current="true"':''}>${rating}</span>`).join('')}</div>`:'';
    const floorplans=p.floorplans?.length?`<section class="pp-panel"><h2>Grundrisse</h2><div class="pp-file-list">${p.floorplans.map(plan=>`<a href="${esc(plan.url)}" target="_blank" rel="noopener noreferrer">${esc(plan.title)} ↗</a>`).join('')}</div></section>`:'';
    const tourHost=p.tour?new URL(p.tour).hostname:'';
    const tour=p.tour?`<section class="pp-panel pp-tour"><h2>Virtueller Rundgang</h2><p>Entdecken Sie die Immobilie Raum für Raum.</p>${p.tourEmbed?`<div class="pp-tour-placeholder"><button type="button" class="pp-button pp-tour-load">Rundgang hier laden</button><small>Der virtuelle Rundgang wird nach dem Klick von ${esc(tourHost)} geladen.</small></div>`:`<div class="pp-tour-placeholder"><a class="pp-button" href="${esc(p.tour)}" target="_blank" rel="noopener noreferrer">Rundgang öffnen ↗</a><small>Der virtuelle Rundgang öffnet sich bei ${esc(tourHost)} in einem neuen Tab.</small></div>`}</section>`:'';
    const amenities=[...(p.amenities||[]),...(p.flooring?[`Bodenbelag: ${p.flooring}`]:[])];
    const dial=number=>String(number||'').replace(/[^+\d]/g,'');
    const broker=p.broker||{};
    const brokerContacts=`<div class="pp-contact-details">${broker.phone?`<p><span>Telefon</span><a href="tel:${esc(dial(broker.phone))}">${esc(broker.phone)}</a></p>`:''}${broker.email?`<p><span>E-Mail</span><a href="mailto:${esc(broker.email)}">${esc(broker.email)}</a></p>`:''}${broker.mobile?`<p><span>Mobil</span><a href="tel:${esc(dial(broker.mobile))}">${esc(broker.mobile)}</a></p>`:''}</div>`;
    const inquiryForm=`<form class="pp-inquiry" id="pp-inquiry"><h3>Immobilie anfragen</h3><div class="pp-form-grid"><label><span>Vorname *</span><input name="firstName" autocomplete="given-name" required maxlength="100"></label><label><span>Nachname *</span><input name="lastName" autocomplete="family-name" required maxlength="100"></label><label class="pp-full"><span>E-Mail *</span><input type="email" name="email" autocomplete="email" required maxlength="254"></label><label class="pp-full"><span>Telefon *</span><input type="tel" name="phone" autocomplete="tel" required maxlength="60"></label><label><span>Straße</span><input name="street" autocomplete="address-line1" maxlength="150"></label><label><span>Nr.</span><input name="houseNumber" maxlength="20"></label><label><span>PLZ</span><input name="zip" autocomplete="postal-code" maxlength="20"></label><label><span>Ort</span><input name="city" autocomplete="address-level2" maxlength="100"></label></div><label class="pp-consent"><input type="checkbox" name="privacy" required><span>Ich habe die <a href="https://sls.de/datenschutz/" target="_blank" rel="noopener noreferrer">Datenschutzerklärung</a> gelesen und willige in die Verarbeitung meiner Daten zur Bearbeitung meiner Anfrage ein. *</span></label><button type="submit" class="pp-button" ${p.inquiryEnabled&&!demo?'':'disabled'}>Jetzt Anfrage senden</button><p class="pp-data-note" role="status">${p.inquiryEnabled&&!demo?'Ihre Anfrage wird dem Objekt in Propstack zugeordnet.':'Das Formular ist in dieser Testversion vorbereitet. Der Versand wird aktiviert, sobald die Propstack-Anfrageautomatisierung eingerichtet und geprüft ist.'}</p></form>`;
    $('#pp-detail-content').innerHTML=`${gallery}<div class="pp-detail-header"><span class="pp-chip">${esc(p.status||'Immobilie')}</span><p class="pp-city">${esc(p.zip)} ${esc(p.city)} · ${esc(p.type)}</p><h1>${esc(p.title)}</h1><a class="pp-header-cta" href="#pp-inquiry">Immobilie anfragen ↓</a></div><div class="pp-detail-columns"><div class="pp-detail-main"><section class="pp-panel pp-overview"><h2>Eckdaten</h2><dl class="pp-facts">${summary}</dl>${energyShort}</section>${money}${p.description?`<section class="pp-panel"><h2>Objektbeschreibung</h2><p class="pp-text">${esc(p.description)}</p></section>`:''}${p.features?`<section class="pp-panel"><h2>Ausstattung</h2><p class="pp-text">${esc(p.features)}</p></section>`:''}${p.location?`<section class="pp-panel"><h2>Lage</h2><p class="pp-text">${esc(p.location)}</p></section>`:''}${tour}${floorplans}${p.otherNote?`<section class="pp-panel"><h2>Weitere Informationen</h2><p class="pp-text">${esc(p.otherNote)}</p></section>`:''}<section class="pp-panel"><h2>Objektdaten</h2><dl class="pp-facts pp-facts-data">${property}</dl></section><section class="pp-panel pp-energy" id="pp-energy"><h2>Energieausweis</h2>${energyScale}${energyFacts?`<dl class="pp-facts pp-facts-data">${energyFacts}</dl>`:''}${!energyComplete?'<p class="pp-data-note">Für diese Immobilie fehlen noch Energieangaben in Propstack. Die Angaben müssen vor der Veröffentlichung geprüft werden.</p>':''}${energy.buildingYear&&!energy.yearFromCertificate?'<p class="pp-data-note">Das Baujahr stammt aus den Objektdaten. Bitte mit dem Energieausweis abgleichen, bevor die Seite veröffentlicht wird.</p>':''}</section>${amenities.length?`<section class="pp-panel"><h2>Merkmale</h2><div class="pp-amenities">${amenities.map(label=>`<span>${icon(label)}${esc(label)}</span>`).join('')}</div></section>`:''}<section class="pp-panel pp-map"><h2>Lage auf der Karte</h2><p>Standort: ${esc([p.zip,p.city].filter(Boolean).join(' '))}. Die genaue Objektadresse wird hier nicht veröffentlicht.</p><div class="pp-map-placeholder"><button type="button" class="pp-button pp-map-load">Karte laden</button><small>Beim Laden wird Google Maps eingebunden. Es gelten die <a href="https://policies.google.com/privacy?hl=de" target="_blank" rel="noopener noreferrer">Datenschutzbestimmungen von Google</a>.</small></div></section></div><aside class="pp-panel pp-contact">${p.broker?.photo?`<img class="pp-agent-photo" src="${esc(p.broker.photo)}" alt="${esc(p.broker.name)}">`:''}<h2>${esc(p.broker?.name||'SLS Immobilienpartner')}</h2><p>Ihr Ansprechpartner für diese Immobilie</p><p class="pp-contact-price">Kaufpreis <strong>${format(p.price)}</strong></p>${brokerContacts}${broker.phone||broker.mobile?`<a class="pp-button pp-call" href="tel:${esc(dial(broker.mobile||broker.phone))}">${esc(broker.name||'Makler')} anrufen</a>`:''}${inquiryForm}</aside></div>`;
    $('.pp-tour-load')?.addEventListener('click',()=>{
      const box=$('.pp-tour-placeholder');
      const frame=document.createElement('iframe');
      frame.className='pp-tour-frame';frame.src=p.tour;
      frame.title=`Virtueller Rundgang: ${p.title}`;frame.loading='lazy';
      frame.referrerPolicy='strict-origin-when-cross-origin';frame.allowFullscreen=true;
      box.replaceChildren(frame);
    });
    $('.pp-map-load').addEventListener('click',()=>{
      const box=$('.pp-map-placeholder');
      const frame=document.createElement('iframe');
      frame.title=`Karte von ${[p.zip,p.city].filter(Boolean).join(' ')}`;
      frame.src=`https://www.google.com/maps?q=${encodeURIComponent([p.zip,p.city].filter(Boolean).join(' '))}&output=embed`;
      frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
      box.replaceChildren(frame);
    });
    $('#pp-inquiry').addEventListener('submit',async event=>{
      event.preventDefault();
      if(!p.inquiryEnabled||demo)return;
      const form=event.currentTarget, button=form.querySelector('button[type=submit]'),status=form.querySelector('[role=status]');
      const fields=Object.fromEntries(new FormData(form).entries());
      button.disabled=true;status.textContent='Anfrage wird gesendet …';
      try {
        const response=await fetch('/api/propstack-test-inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...fields,propertyId:p.id,privacy:fields.privacy==='on'})});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error||'Die Anfrage konnte nicht gesendet werden.');
        form.reset();status.textContent='Vielen Dank. Ihre Anfrage wurde an Propstack übermittelt.';
      } catch(error) {status.textContent=error.message;button.disabled=false}
    });
    if(pictures.length>1){
      let index=0;
      const setPhoto=n=>{index=(n+pictures.length)%pictures.length;$('.pp-gallery-current').src=pictures[index];$('.pp-gallery-count').textContent=`${index+1} / ${pictures.length}`;document.querySelectorAll('.pp-gallery-thumb').forEach((button,i)=>{button.classList.toggle('is-active',i===index);button.setAttribute('aria-pressed',String(i===index))});};
      $('.pp-gallery-prev').addEventListener('click',()=>setPhoto(index-1));
      $('.pp-gallery-next').addEventListener('click',()=>setPhoto(index+1));
      document.querySelectorAll('.pp-gallery-thumb').forEach(button=>button.addEventListener('click',()=>setPhoto(Number(button.dataset.photo))));
    }
  }

  async function load(){
    try {
      if(demo){all=[sample];$('#pp-banner').textContent='Designvorschau mit einem öffentlich sichtbaren Beispielobjekt. Keine Live-Abfrage; Angaben und Verfügbarkeit bitte auf sls.de prüfen.'}
      else {const response=await fetch(`/api/propstack-test-properties${id?`?id=${encodeURIComponent(id)}`:''}`,{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'Daten nicht abrufbar');all=data.items;$('#pp-banner').textContent='Getrennter Vercel-Test mit freigegebenen Propstack-Objekten. Anfragen werden hier noch nicht versendet.'}
      if(id){const p=all.find(item=>item.id===id);if(p)renderDetail(p);else throw new Error('Dieses Objekt ist in der Testansicht nicht verfügbar.')}
      else renderList();
    } catch(error){$('#pp-count').textContent='Noch keine Immobilien verfügbar';$('#pp-results').innerHTML=`<div class="pp-error">${esc(error.message)}<br><a href="/immobilien-test/?demo=1">Design mit einem Beispielobjekt ansehen</a></div>`}
  }
  $('#pp-form').addEventListener('submit',event=>{event.preventDefault();renderList()});$('#pp-sort').addEventListener('change',renderList);load();
})();

(() => {
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const format=n=>n==null?'Preis auf Anfrage':new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
  const area=n=>n==null?'–':`${new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n)} m²`;
  const url=new URL(location.href), demo=url.searchParams.get('demo')==='1', id=url.searchParams.get('objekt');
  const reference='https://sls.de/immobilie/lichtdurchflutete-wohnung-mit-balkon-offenem-wohnen-stellplatz-und-langfristig-gesicherter-miete/';
  const sample={id:'demo',title:'Lichtdurchflutete Wohnung mit Balkon, offenem Wohnen, Stellplatz und langfristig gesicherter Miete',city:'Raesfeld',zip:'46348',price:139500,area:52.06,rooms:2,bedrooms:1,baths:1,year:2002,type:'Wohnung',status:'Verfügbar',images:['https://sls.de/wp-content/uploads/2026/09/6927c1a63b43bc35506a97fd149101a1.jpg','https://sls.de/wp-content/uploads/2026/09/8b0f34e1662b362b49076948be67fb47.jpg','https://sls.de/wp-content/uploads/2026/09/ed4ad76935300ee4c87702b1fb3e962c.jpg','https://sls.de/wp-content/uploads/2026/09/ee63526f68d37e694efac2bc8b383435.jpg'],description:'Die Wohnung liegt im ersten Obergeschoss. Durch die offene Küche und den hellen Wohnbereich entsteht ein zusammenhängender Raum. Zur Wohnung gehören ein Balkon, ein Außenstellplatz und ein Kellerraum. Die Wohnung ist seit 2019 vermietet.',location:'46348 Raesfeld',features:'Balkon, Außenstellplatz, Kellerraum',courtage:'3,57 % inkl. MwSt.',broker:{name:'Herr Cüneyt Demirli',phone:'(02369) 742 80 20',email:'c.demirli@sls.de'}};
  let all=[];
  const photo=(src,alt)=>src?`<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`:'<span class="pp-fallback">SLS Immobilienpartner</span>';
  const previewLink=p=>`/immobilien-test/?objekt=${encodeURIComponent(p.id)}${demo?'&demo=1':''}`;
  const card=p=>`<a class="pp-card" href="${previewLink(p)}"><div class="pp-image">${photo(p.images?.[0],p.title)}<span class="pp-chip">${esc(p.status||'Verfügbar')}</span></div><div class="pp-card-content"><span class="pp-city">${esc(p.city)}</span><h2>${esc(p.title)}</h2><div class="pp-stats"><span>${area(p.area)}</span>${p.rooms!=null?`<span>${esc(p.rooms)} Zimmer</span>`:''}<span>${esc(p.type)}</span></div><span class="pp-price">${format(p.price)}</span></div></a>`;
  const fact=(label,value)=>value==null||value===''?'':`<div><span>${label}</span><strong>${esc(value)}</strong></div>`;
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
    document.title=`${p.title} · SLS Testseite`;
    $('.pp-back').href=demo?'/immobilien-test/?demo=1':'/immobilien-test/';
    const pictures=p.images||[];
    $('#pp-detail-content').innerHTML=`<div class="pp-detail-header"><span class="pp-city">${esc(p.zip)} ${esc(p.city)} · ${esc(p.type)}</span><h1>${esc(p.title)}</h1><span class="pp-chip" style="position:static">${esc(p.status||'Immobilie')}</span></div><div class="pp-gallery"><div class="pp-gallery-main">${photo(pictures[0],p.title)}</div><div class="pp-gallery-side"><div>${photo(pictures[1],p.title+' – weitere Ansicht')}</div><div>${photo(pictures[2],p.title+' – weitere Ansicht')}</div></div></div><div class="pp-detail-columns"><div><section class="pp-panel"><h2>Eckdaten</h2><div class="pp-facts">${fact('Kaufpreis',format(p.price))}${fact('Wohnfläche',area(p.area))}${fact('Zimmer',p.rooms)}${fact('Schlafzimmer',p.bedrooms)}${fact('Badezimmer',p.baths)}${fact('Baujahr',p.year)}${fact('Grundstück',p.plot==null?null:area(p.plot))}${fact('Käuferprovision',p.courtage)}</div></section>${p.description?`<section class="pp-panel"><h2>Objektbeschreibung</h2><p class="pp-text">${esc(p.description)}</p></section>`:''}${p.features?`<section class="pp-panel"><h2>Ausstattung</h2><p class="pp-text">${esc(p.features)}</p></section>`:''}${p.location?`<section class="pp-panel"><h2>Lage</h2><p class="pp-text">${esc(p.location)}</p></section>`:''}</div><aside class="pp-panel pp-contact"><p class="pp-price">${format(p.price)}</p><h2>Sie interessieren sich für dieses Objekt?</h2><p>Der automatisierte Exposéversand mit Nachweisbestätigung ist in dieser Testversion noch nicht freigeschaltet.</p>${demo?`<a class="pp-button" href="${reference}" target="_blank" rel="noopener noreferrer">Auf sls.de anfragen</a>`:'<a class="pp-button" href="tel:+4923697428020">SLS anrufen</a>'}${p.broker?`<div class="pp-agent"><strong>${esc(p.broker.name)}</strong>${p.broker.phone?`<br><a href="tel:${esc(p.broker.phone.replace(/[^+\d]/g,''))}">${esc(p.broker.phone)}</a>`:''}</div>`:''}</aside></div>`;
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

import {
  const secureFormFetch=(...args)=>import('/assets/form-security.js').then(module=>module.formFetch(...args));setupPropertyFilters} from './property-filters.mjs';
import {propertyCardHtml} from './property-card.mjs';
import {objectPath,buildPropertySeo} from './property-seo.mjs';
(() => {
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const format=n=>n==null?'Preis auf Anfrage':new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
  const area=n=>n==null?'–':`${new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n)} m²`;
  const date=x=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(x||''));return m?`${m[3]}.${m[2]}.${m[1]}`:x};
  const bootstrap=document.querySelector('#pp-server-data');
  const serverData=bootstrap?JSON.parse(bootstrap.textContent):null;
  const url=new URL(location.href), demo=!serverData&&url.searchParams.get('demo')==='1';
  const productionRoute=location.pathname.startsWith('/immobilie/')||location.pathname.startsWith('/immobilien/');
  const browsePath=productionRoute?'/immobilien/':'/immobilien-test/';
  const pathObjectMatch=location.pathname.match(/^\/immobilie\/[^/]*-(\d+)\/?$/);
  const id=pathObjectMatch?.[1]||url.searchParams.get('objekt')||null;
  const setDescription=value=>{
    let meta=document.querySelector('meta[name="description"]');if(!meta){meta=document.createElement('meta');meta.name='description';document.head.append(meta)}meta.content=value;
  };
  const setInactiveSeo=(title,description)=>{
    document.title=`${title} | SLS Immobilienpartner`;
    setDescription(description);
    document.querySelectorAll('link[rel="canonical"], #pp-property-jsonld').forEach(node=>node.remove());
    let meta=document.querySelector('meta[name="robots"]');if(!meta){meta=document.createElement('meta');meta.name='robots';document.head.append(meta)}meta.content='noindex,nofollow';
  };
  const setSeo=p=>{
    if(!productionRoute||!p||demo)return;
    const seo=buildPropertySeo(p),expectedPath=objectPath(p);
    if(location.pathname.startsWith('/immobilie/')&&location.pathname!==expectedPath)history.replaceState(null,'',expectedPath+location.search);
    document.title=seo.title;setDescription(seo.description);
    let link=document.querySelector('link[rel="canonical"]');if(!link){link=document.createElement('link');link.rel='canonical';document.head.append(link)}link.href=seo.canonical;
    let script=document.querySelector('#pp-property-jsonld');if(!script){script=document.createElement('script');script.type='application/ld+json';script.id='pp-property-jsonld';document.head.append(script)}script.textContent=JSON.stringify(seo.data);
  };
  const sample={id:'demo',title:'Lichtdurchflutete Wohnung mit Balkon, offenem Wohnen, Stellplatz und langfristig gesicherter Miete',city:'Raesfeld',zip:'46348',price:139500,area:52.06,rooms:2,bedrooms:1,baths:1,year:2002,type:'Wohnung',status:'Verfügbar',images:['https://sls.de/wp-content/uploads/2026/09/6927c1a63b43bc35506a97fd149101a1.jpg','https://sls.de/wp-content/uploads/2026/09/8b0f34e1662b362b49076948be67fb47.jpg','https://sls.de/wp-content/uploads/2026/09/ed4ad76935300ee4c87702b1fb3e962c.jpg','https://sls.de/wp-content/uploads/2026/09/ee63526f68d37e694efac2bc8b383435.jpg'],description:'Die Wohnung liegt im ersten Obergeschoss. Durch die offene Küche und den hellen Wohnbereich entsteht ein zusammenhängender Raum. Zur Wohnung gehören ein Balkon, ein Außenstellplatz und ein Kellerraum. Die Wohnung ist seit 2019 vermietet.',location:'46348 Raesfeld',features:'Balkon, Außenstellplatz, Kellerraum',courtage:'3,57 % inkl. MwSt.',broker:{name:'Herr Cüneyt Demirli',phone:'(02369) 742 80 20',email:'c.demirli@sls.de',mobile:'+49 152 099 30 734'}};
  sample.objectFacts=[{label:'Standort',value:'46348 Raesfeld'},{label:'Objekttyp',value:'Wohnung'},{label:'Wohnfläche',value:sample.area,kind:'area'},{label:'Zimmer',value:sample.rooms},{label:'Schlafzimmer',value:sample.bedrooms},{label:'Badezimmer',value:sample.baths},{label:'Baujahr',value:sample.year}];
  let all=[], total=0, currentPage=1, hasMore=false, loadingMore=false;
  let browsePage=1,viewMode=url.searchParams.get('ansicht')==='karte'?'map':'list',catalogError=false,mapApi=null,mapPromise=null,mapVersion=0,selectedProperty=null;
  let browseGeneration=0,browseRequest=null,committedQuery=new URLSearchParams(),renderedIds=[],mapItems=null;
  const favoritesView=url.searchParams.get('favoriten')==='1'&&!id;
  const browseBase=productionRoute?'/immobilien/':'/immobilien-test/';
  const searchProfileCta=document.querySelector('.sls-search-profile-cta');
  if(searchProfileCta&&(favoritesView||id||demo))searchProfileCta.hidden=true;
  const favoriteKey=demo?'sls-property-favorites-demo-v1':'sls-property-favorites-v1';
  const parseFavorites=raw=>{
    try{const value=JSON.parse(raw);return new Set(Array.isArray(value)?value.filter(v=>typeof v==='string'&&(/^\d+$/.test(v)||(demo&&v==='demo'))):[])}catch{return new Set()}
  };
  const readFavorites=()=>{try{return parseFavorites(localStorage.getItem(favoriteKey))}catch{return new Set()}};
  let favorites=readFavorites(),favoritesRun=0,storageWritable=true;
  const favoriteResults=new Map();
  const heart='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
  const favoriteButton=(p,detail=false)=>`<button type="button" class="pp-favorite${detail?' pp-favorite-detail':''}" data-favorite="${esc(p.id)}" aria-pressed="${favorites.has(String(p.id))}" aria-label="${favorites.has(String(p.id))?'Aus Favoriten entfernen':'Zu Favoriten hinzufügen'}: ${esc(p.title||'Immobilie')}" data-favorite-title="${esc(p.title||'Immobilie')}">${heart}${detail?'<span>Merken</span>':''}</button>`;
  const syncFavorites=()=>{
    document.querySelectorAll('[data-favorite]').forEach(button=>{
      const saved=favorites.has(button.dataset.favorite);
      button.setAttribute('aria-pressed',String(saved));
      button.setAttribute('aria-label',`${saved?'Aus Favoriten entfernen':'Zu Favoriten hinzufügen'}: ${button.dataset.favoriteTitle}`);
      const label=button.querySelector('span');if(label)label.textContent=saved?'Gemerkt':'Merken';
    });
    $('#pp-favorites-link').textContent=`♡ Favoriten (${favorites.size})`;
    const mobile=$('#pp-mobile-favorites span');if(mobile)mobile.textContent=`Favoriten (${favorites.size})`;
  };
  document.querySelector('.pp-banner').insertAdjacentHTML('afterend',`<div class="pp-favorites-bar">${favoritesView?`<a class="pp-favorites-back" href="${browseBase}${demo?'?demo=1':''}">← Alle Immobilien</a>`:''}<a id="pp-favorites-link" href="${browseBase}?favoriten=1${demo?'&demo=1':''}">♡ Favoriten (${favorites.size})</a></div><p class="pp-favorites-notice" id="pp-favorites-notice" role="status" aria-live="polite"></p>`);
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-favorite]');if(!button)return;
    const propertyId=button.dataset.favorite;
    // Read again so another tab's latest changes are preserved.
    try{if(storageWritable)favorites=parseFavorites(localStorage.getItem(favoriteKey))}catch{}
    const removed=favorites.delete(propertyId);if(!removed)favorites.add(propertyId);
    try{localStorage.setItem(favoriteKey,JSON.stringify([...favorites]));$('#pp-favorites-notice').textContent=removed?'Immobilie aus Favoriten entfernt.':'Immobilie in Favoriten gespeichert.'}
    catch{storageWritable=false;$('#pp-favorites-notice').textContent='Ihr Browser erlaubt derzeit keine dauerhafte Speicherung. Ihre Auswahl bleibt nur auf dieser geöffneten Seite erhalten.'}
    syncFavorites();if(favoritesView)renderFavorites();
  });
  window.addEventListener('storage',event=>{
    if(event.key!==favoriteKey&&event.key!==null)return;
    favorites=readFavorites();syncFavorites();if(favoritesView)loadFavorites();
  });
  function renderFavorites(){
    $('#pp-count').textContent=`${favorites.size} gespeicherte ${favorites.size===1?'Immobilie':'Immobilien'}`;
    $('#pp-results').innerHTML=favorites.size?[...favorites].map(propertyId=>{
      const result=favoriteResults.get(propertyId);
      if(result?.item)return card(result.item);
      const unavailable=result?.state==='unavailable';
      return `<article class="pp-panel pp-favorite-unavailable"><h2>Immobilie ${esc(propertyId)}</h2><p>${unavailable?'Dieses Objekt ist nicht mehr verfügbar.':result?.state==='error'?'Dieses Objekt konnte gerade nicht geladen werden. Bitte versuchen Sie es erneut.':'Aktuelle Angaben werden geladen …'}</p><button type="button" class="pp-favorite-remove" data-favorite="${esc(propertyId)}" data-favorite-title="Immobilie ${esc(propertyId)}" aria-pressed="true">Aus Favoriten entfernen</button></article>`;
    }).join(''):'<div class="pp-error"><h2>Noch keine Immobilien gespeichert</h2><p>Tippen Sie auf das Herz, um sich ein Angebot zu merken.</p><a href="'+browseBase+(demo?'?demo=1':'')+'">Immobilien entdecken →</a></div>';
    $('#pp-progress').innerHTML=[...favorites].some(propertyId=>favoriteResults.get(propertyId)?.state==='error')?'<button type="button" class="pp-button" id="pp-favorites-retry">Erneut versuchen</button>':'';
    $('#pp-favorites-retry')?.addEventListener('click',loadFavorites);
    syncFavorites();
  }
  async function loadFavorites(){
    const run=++favoritesRun,ids=[...favorites];renderFavorites();
    for(let offset=0;offset<ids.length;offset+=4){
      await Promise.all(ids.slice(offset,offset+4).map(async propertyId=>{
        let result;
        try{
          if(demo)result={item:sample};
          else{
            const response=await fetch(`/api/propstack-properties?summary=${encodeURIComponent(propertyId)}`,{cache:'no-store',signal:AbortSignal.timeout(15000)});
            if(response.status===404||response.status===410)result={state:'unavailable'};
            else{if(!response.ok)throw new Error('Ladefehler');const data=await response.json();const item=data.items?.find(p=>String(p.id)===propertyId);if(!item)throw new Error('Objekt fehlt');result={item}}
          }
        }catch{result={state:'error'}}
        if(run===favoritesRun)favoriteResults.set(propertyId,result);
      }));
      if(run!==favoritesRun)return;renderFavorites();
    }
  }

  const photo=(src,alt,loading="lazy")=>src?`<img src="${esc(src)}" alt="${esc(alt)}" loading="${loading}"${loading==="eager"?' fetchpriority="low"':''}>`:'<span class="pp-fallback">SLS Immobilienpartner</span>';
  const previewLink=p=>productionRoute?objectPath(p):`/immobilien-test/?objekt=${encodeURIComponent(p.id)}${demo?'&demo=1':''}`;
  const energyNotRequired=energy=>/^(?:wird\s+)?nicht\s+benötigt[.!]?$/i.test(String(energy.availability||'').trim());
  const card=p=>propertyCardHtml(p,{href:previewLink(p),favorite:favoriteButton(p),priority:!id&&!favoritesView&&all.slice(0,window.innerWidth<=850?1:3).some(item=>String(item.id)===String(p.id))});
  const fact=(label,value)=>value==null||value===''?'':`<div class="pp-fact${String(label).split(/\s+/).some(word=>word.length>=18)?' pp-fact-wide':''}"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
  const activeFilters=()=>{
    const form=new FormData($('#pp-form'));
    return {
      query:String(form.get('query')||'').toLocaleLowerCase('de').trim(),
      city:String(form.get('city')||'').toLocaleLowerCase('de').trim(),
      type:form.get('type'),
      subtype:form.get('subtype'),
      price:Number(form.get('price')),
      minArea:Number(form.get('area')),
      rooms:Number(form.get('rooms'))
    };
  };
  const browseItems=()=>all;
  function captureQuery(){
    const q=new URLSearchParams();
    for(const [key,value] of new FormData($('#pp-form')))if(String(value).trim())q.set(key,String(value).trim());
    if(url.searchParams.get('marketCity')==='1' && q.get('city')===url.searchParams.get('city')) q.set('marketCity','1');
    q.set('sort',$('#pp-sort').value);return q;
  }
  async function resetBrowse(){
    restoringBrowse=null;browsePage=1;currentPage=0;all=[];total=0;hasMore=false;catalogError=false;
    mapItems=null;mapVersion++;browseGeneration++;browseRequest?.abort();loadingMore=false;
    committedQuery=captureQuery();renderedIds=[];
    if(searchProfileCta&&$('#pp-results').contains(searchProfileCta))$('#pp-results').before(searchProfileCta);
    $('#pp-results').innerHTML='<p role="status">Immobilien werden geladen …</p>';
    if(demo){
      const f=activeFilters();all=[sample].filter(p=>(!f.query||`${p.title} ${p.city} ${p.zip}`.toLocaleLowerCase('de').includes(f.query))&&(!f.city||p.city.toLocaleLowerCase('de').includes(f.city))&&(!f.type||p.type===f.type)&&(!f.subtype||p.rs_category===f.subtype)&&(!f.price||p.price<=f.price)&&(!f.minArea||p.area>=f.minArea)&&(!f.rooms||p.rooms>=f.rooms));total=all.length;renderList();return;
    }
    await loadNextPage();
  }
  let restoringBrowse=null,loadFrame=0;
  function placeSearchProfileCta(){
    const cta=searchProfileCta,grid=$('#pp-results');
    if(!cta||!grid)return;
    const repeats=[...grid.querySelectorAll('[data-search-profile-repeat]')];
    if(favoritesView||id||demo){cta.hidden=true;repeats.forEach(node=>node.remove());return}
    const cards=[...grid.querySelectorAll('.pp-card-shell')];
    const positions=[];
    for(let count=9;count<=cards.length;count+=9)positions.push(count);
    const finished=!hasMore&&!loadingMore&&!catalogError&&cards.length===all.length;
    if(finished&&cards.length&&cards.length%9)positions.push(cards.length);
    const noResults=cards.length===0&&!loadingMore&&!catalogError;
    cta.hidden=!positions.length&&!noResults;
    cta.querySelector('strong').textContent=noResults?'Aktuell nichts Passendes gefunden?':'Noch nicht das Richtige dabei?';
    cta.querySelector('p').textContent='Hinterlegen Sie Ihre Wünsche – wir informieren Sie über passende Immobilien.';
    cta.querySelector('[data-search-profile-open]').textContent='Suchprofil anlegen';
    if(noResults){grid.append(cta);repeats.forEach(node=>node.remove());return}
    const retained=new Set();
    positions.forEach((position,index)=>{
      let notice=cta;
      if(index){
        notice=repeats.find(node=>node.dataset.searchProfileRepeat===String(position));
        if(!notice){
          notice=cta.cloneNode(true);
          notice.dataset.searchProfileRepeat=String(position);
          notice.classList.remove('is-saved');
          notice.querySelector('[data-search-profile-note]').textContent='';
        }
        retained.add(notice);
      }
      notice.hidden=false;
      cards[position-1].insertAdjacentElement('afterend',notice);
    });
    repeats.filter(node=>!retained.has(node)).forEach(node=>node.remove());
  }

  function renderList(updateMap=true){
    const found=browseItems(),size=viewMode==='map'?6:9;
    const cta=document.querySelector('.sls-search-profile-cta'),grid=$('#pp-results');
    if(cta&&grid?.contains(cta))grid.parentNode?.insertBefore(cta,grid);
    $('#pp-count').textContent=`${total} ${total===1?'Immobilie':'Immobilien'}`;
    const visible=found.slice(0,browsePage*size),ids=visible.map(p=>String(p.id));
    if(renderedIds.length&&renderedIds.every((id,index)=>ids[index]===id))grid.insertAdjacentHTML('beforeend',visible.slice(renderedIds.length).map(card).join(''));
    else grid.innerHTML=visible.length?visible.map(card).join(''):loadingMore?'<p role="status">Immobilien werden geladen …</p>':'<div class="pp-error">Keine passenden Immobilien. Bitte ändern Sie Ihre Suche oder Filter.</div>';
    renderedIds=ids;
    placeSearchProfileCta();
    document.querySelectorAll('#pp-results .pp-card-shell').forEach(el=>el.classList.toggle('is-map-selected',el.dataset.propertyId===selectedProperty));
    $('#pp-progress').innerHTML=catalogError?'Nicht alle Angebote konnten geladen werden. <button type="button" id="pp-catalog-retry">Erneut versuchen</button>':loadingMore?'Weitere Angebote werden geladen …':'';
    $('#pp-catalog-retry')?.addEventListener('click',()=>loadNextPage());
    $('#pp-load-sentinel').hidden=catalogError||(!hasMore&&browsePage*size>=found.length);
    document.body.classList.toggle('pp-is-map',viewMode==='map');
    $('#pp-browse-layout').classList.toggle('is-map-view',viewMode==='map');
    $('#pp-map-panel').hidden=viewMode!=='map';
    document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===viewMode)));
    $('#pp-mobile-map span').textContent=viewMode==='map'?'Liste':'Karte';
    $('#pp-mobile-map').setAttribute('aria-pressed',String(viewMode==='map'));
    const filterCount=Object.values(activeFilters()).filter(Boolean).length;
    $('#pp-mobile-filter span').textContent=filterCount?`Filtern (${filterCount})`:'Filtern';
    syncFavorites();
    if(viewMode==='map'&&updateMap)updateBrowseMap();
    if(restoringBrowse&&(currentPage>=(restoringBrowse.batches||1)||!hasMore)){
      const saved=restoringBrowse;
      requestAnimationFrame(()=>{window.scrollTo(0,saved.scrollY||0);requestAnimationFrame(()=>{restoringBrowse=null})});
    }
    scheduleMoreVisible();
  }
  function scheduleMoreVisible(){
    if(loadFrame)return;
    loadFrame=requestAnimationFrame(()=>{
      loadFrame=0;
      if(restoringBrowse||loadingMore||catalogError)return;
      const sentinel=$('#pp-load-sentinel');
      if(!sentinel||sentinel.hidden)return;
      const rect=sentinel.getBoundingClientRect();
      if(rect.top<window.innerHeight+180&&rect.bottom>=0){if(browsePage*(viewMode==='map'?6:9)<all.length){browsePage++;renderList(false)}else if(hasMore)loadNextPage()}
    });
  }
  async function updateBrowseMap(){
    const own=++mapVersion;
    try{
      if(!mapPromise)mapPromise=import('/assets/property-map.mjs').then(({createPropertyMap})=>createPropertyMap($('#pp-list-map'),$('#pp-map-status'),async propertyId=>{
        const generation=browseGeneration;
        while(!all.some(p=>String(p.id)===propertyId)&&hasMore&&!loadingMore&&!catalogError){await loadNextPage();if(generation!==browseGeneration)return}
        const index=all.findIndex(p=>String(p.id)===propertyId);if(index<0)return;
        selectedProperty=propertyId;browsePage=Math.max(browsePage,Math.floor(index/6)+1);renderList();
        const card=[...document.querySelectorAll('#pp-results .pp-card-shell')].find(el=>el.dataset.propertyId===propertyId);
        card?.scrollIntoView({block:'nearest',behavior:'smooth'});card?.querySelector('a')?.focus({preventScroll:true});
      },previewLink)).catch(error=>{mapPromise=null;throw error});
      mapApi=await mapPromise;
      let items=mapItems;
      if(!items){
        if(demo)items=all;
        else{
          const q=new URLSearchParams(committedQuery);q.set('map','1');
          const response=await fetch(`/api/propstack-properties/?${q}`,{signal:AbortSignal.timeout(20000)});
          if(!response.ok)throw new Error('Kartenpunkte fehlen');
          const data=await response.json();if(!Array.isArray(data.items))throw new Error('Kartenpunkte fehlen');items=data.items;
        }
      }
      if(own===mapVersion&&viewMode==='map'){mapItems=items;await mapApi.update(items)}
    }catch{if(own===mapVersion){$('#pp-map-status').innerHTML='Die Karte konnte nicht geladen werden. <button type="button" id="pp-map-retry">Erneut versuchen</button>';$('#pp-map-retry').addEventListener('click',()=>updateBrowseMap())}}
  }
  async function fetchPage(page,{append=false}={}){
    const generation=browseGeneration;
    browseRequest?.abort();browseRequest=new AbortController();
    const controller=browseRequest;
    const timeout=setTimeout(()=>controller.abort(),20000);
    const q=new URLSearchParams(committedQuery);q.set('page',page);q.set('per',viewMode==='map'?6:9);
    try{
      const response=await fetch(`/api/propstack-properties/?${q}`,{signal:controller.signal});
      const data=await response.json();
      if(generation!==browseGeneration)return false;
      if(!response.ok||!Array.isArray(data.items))throw new Error(data.error||'Daten nicht abrufbar');
      all=append?[...new Map([...all,...data.items].map(p=>[String(p.id),p])).values()]:data.items;
      total=Number(data.total)||all.length;currentPage=page;hasMore=Boolean(data.hasMore);browsePage=Math.max(browsePage,page);
      return true;
    }finally{clearTimeout(timeout)}
  }
  async function loadNextPage(){
    if(loadingMore||demo||id||favoritesView)return;
    const generation=browseGeneration;loadingMore=true;catalogError=false;
    $('#pp-progress').textContent='Weitere Angebote werden geladen …';
    try{await fetchPage(currentPage+1,{append:currentPage>0})}
    catch{if(generation===browseGeneration)catalogError=true}
    finally{
      if(generation===browseGeneration){loadingMore=false;renderList(currentPage===1);
        if(restoringBrowse&&hasMore&&!catalogError&&currentPage<(restoringBrowse.batches||1))await loadNextPage();
      }
    }
  }
  async function setupBrowse(){
    document.body.classList.add('pp-is-browse');
    const search=$('#pp-search');
    search.insertAdjacentHTML('afterbegin',`<div class="pp-mobile-tools"><form id="pp-quick-search" role="search"><label class="pp-sr-only" for="pp-quick-query">Ort, PLZ oder Objekt suchen</label><input id="pp-quick-query" type="search" placeholder="Ort, PLZ oder Objekt suchen"><button type="submit" aria-label="Jetzt suchen">⌕</button></form><nav aria-label="Immobiliensuche"><button type="button" id="pp-mobile-sort"><b aria-hidden="true">⇅</b><span>Sortieren</span></button><a href="${browseBase}?favoriten=1${demo?'&demo=1':''}" id="pp-mobile-favorites"><b aria-hidden="true">♡</b><span>Favoriten (${favorites.size})</span></a><button type="button" id="pp-mobile-filter"><b aria-hidden="true">☷</b><span>Filtern</span></button><button type="button" id="pp-mobile-map" aria-pressed="false"><b aria-hidden="true">▧</b><span>Karte</span></button></nav></div><div class="pp-view-switch" role="group" aria-label="Ansicht wählen"><button type="button" data-view="list" aria-pressed="true">Liste</button><button type="button" data-view="map" aria-pressed="false">Karte</button></div>`);
    $('.pp-heading').after($('.pp-mobile-tools'));
    const actions=document.createElement('div');actions.className='pp-browse-actions';
    search.prepend(actions);actions.append($('.pp-favorites-bar'),$('.pp-view-switch'));
    const grid=$('#pp-results');grid.insertAdjacentHTML('beforebegin','<div id="pp-browse-layout"><div class="pp-list-column"></div><aside id="pp-map-panel" aria-label="Karte der Immobilien" hidden><div class="pp-map-sticky"><div id="pp-list-map" aria-label="Ungefähre Immobilienstandorte"></div><p class="pp-map-disclaimer">Ungefähre Lage des Postleitzahlgebiets – keine Objektadresse.</p><p id="pp-map-status" role="status">Karte wird geladen …</p></div></aside></div>');
    $('.pp-list-column').append(grid,$('#pp-load-sentinel'));
    $('#pp-load-sentinel').hidden=true;
    document.body.insertAdjacentHTML('beforeend','<dialog id="pp-filter-dialog" class="pp-search-dialog" aria-labelledby="pp-filter-title"><div class="pp-dialog-top"><h2 id="pp-filter-title">Immobilien filtern</h2><button type="button" data-close-dialog aria-label="Filter schließen">×</button></div><div id="pp-filter-slot"></div></dialog><dialog id="pp-sort-dialog" class="pp-search-dialog" aria-labelledby="pp-sort-title"><div class="pp-dialog-top"><h2 id="pp-sort-title">Sortieren</h2><button type="button" data-close-dialog aria-label="Sortierung schließen">×</button></div><label for="pp-mobile-sort-select">Reihenfolge</label><select id="pp-mobile-sort-select"></select></dialog>');
    const form=$('#pp-form'),placeholder=document.createComment('filter form');form.before(placeholder);
    restoringBrowse=history.state?.ppBrowse||null;
    if(!restoringBrowse && url.searchParams.has('city')) form.elements.city.value=url.searchParams.get('city');
    if(restoringBrowse){
      browsePage=Math.max(1,Number(restoringBrowse.batches)||1);
      viewMode=restoringBrowse.view==='map'?'map':'list';
      for(const [name,value] of Object.entries(restoringBrowse.fields||{}))if(form.elements.namedItem(name))form.elements.namedItem(name).value=value;
      $('#pp-sort').value=restoringBrowse.sort||'default';
      $('#pp-quick-query').value=form.elements.query.value;
    }
    const filtersReady=setupPropertyFilters(form,{demoItems:demo?[sample]:undefined,restore:restoringBrowse?.fields});
    // Restored subtype selections need their options; fresh browsing can start immediately.
    if(demo||restoringBrowse)await filtersReady;
    history.scrollRestoration='manual';
    const saveBrowse=()=>{
      if(restoringBrowse)return;
      const state={batches:currentPage,view:viewMode,fields:Object.fromEntries(new FormData(form)),sort:$('#pp-sort').value,scrollY:window.scrollY};
      history.replaceState({...history.state,ppBrowse:state},'',location.href);
    };
    document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(link&&new URL(link.href).searchParams.has('objekt'))saveBrowse()},{capture:true});
    window.addEventListener('pagehide',saveBrowse);

    $('#pp-mobile-filter').addEventListener('click',()=>{$('#pp-filter-slot').append(form);$('#pp-filter-dialog').showModal()});
    $('#pp-filter-dialog').addEventListener('close',()=>placeholder.after(form));
    $('#pp-mobile-sort-select').innerHTML=$('#pp-sort').innerHTML;
    $('#pp-mobile-sort').addEventListener('click',()=>{$('#pp-mobile-sort-select').value=$('#pp-sort').value;$('#pp-sort-dialog').showModal()});
    $('#pp-mobile-sort-select').addEventListener('change',()=>{$('#pp-sort').value=$('#pp-mobile-sort-select').value;resetBrowse();$('#pp-sort-dialog').close()});
    document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
    document.querySelectorAll('.pp-search-dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}}));
    $('#pp-quick-search').addEventListener('submit',event=>{event.preventDefault();form.elements.query.value=$('#pp-quick-query').value;resetBrowse()});
    const setView=mode=>{viewMode=mode;browsePage=1;const next=new URL(location.href);if(mode==='map')next.searchParams.set('ansicht','karte');else next.searchParams.delete('ansicht');history.replaceState({...history.state,ppBrowse:null},'',next);resetBrowse()};
    document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
    $('#pp-mobile-map').addEventListener('click',()=>setView(viewMode==='map'?'list':'map'));

    for(const eventName of ['mouseover','focusin'])grid.addEventListener(eventName,event=>{const card=event.target.closest('[data-property-id]');if(card&&viewMode==='map'&&!card.contains(event.relatedTarget))mapApi?.focus(card.dataset.propertyId)});
    window.addEventListener('scroll',scheduleMoreVisible,{passive:true});
    window.addEventListener('resize',scheduleMoreVisible);
    window.addEventListener('resize',()=>{mapApi?.resize();if(window.innerWidth>850){$('#pp-filter-dialog').close();$('#pp-sort-dialog').close()}});
  }
  function initSimilarProperties(p){
    const section=$('#pp-similar');
    const overview=demo?'/immobilien-test/?demo=1':'/immobilien-test/';
    const render=items=>{
      section.innerHTML=`<div class="pp-related-heading"><h2 id="pp-similar-title">${items.length?'Ähnliche Immobilien':'Weitere Immobilien entdecken'}</h2></div>${items.length?`<div class="pp-grid">${items.map(item=>card(item).replace('<h2>','<h3>').replace('</h2>','</h3>')).join('')}</div>`:'<p>Entdecken Sie unsere aktuellen Angebote in der Immobilienübersicht.</p>'}<a class="pp-related-overview" href="${overview}">Alle Immobilien ansehen →</a>`;
      section.removeAttribute('aria-busy');
    };
    const loadSimilar=async()=>{
      if(demo){render([]);return}
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),20000);
      try{
        const response=await fetch(`/api/propstack-properties?similarTo=${encodeURIComponent(p.id)}`,{signal:controller.signal});
        if(!response.ok)throw new Error('Angebote nicht abrufbar');
        const data=await response.json();if(!Array.isArray(data.items))throw new Error('Ungültige Angebotsliste');
        render(data.items);

      }catch{render([])}finally{clearTimeout(timeout)}
    };
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();loadSimilar()}
      },{rootMargin:'800px 0px'});
      observer.observe(section);
    }else loadSimilar();
  }
  function renderDetail(p){
    $('#pp-search').hidden=true;$('#pp-detail').hidden=false;
    document.body.classList.add('pp-is-detail');
    document.title=`${p.title} · SLS Immobilienpartner · Testseite`;
    setSeo(p);
    $('.pp-back').href=demo?'/immobilien-test/?demo=1':browsePath;
    const floorplanImages=p.floorplanImages||[];
    const pictures=[...(p.images||[]).map((src,i)=>({src,alt:`${p.title} – Bild ${i+1}`,isFloorplan:false})),...floorplanImages.map(plan=>({src:plan.preview,alt:plan.title,isFloorplan:true,url:plan.url}))];
    const extraFloorplans=(p.floorplans||[]).filter(plan=>!floorplanImages.some(image=>image.url===plan.url || image.preview===plan.url));
    const hasPlans=Boolean(floorplanImages.length||extraFloorplans.length);
    const pf=p.propertyFacts||{}, energy=p.energy||{};
    const amenityPaths={Balkon:'<path d="M3 13h18M5 13V4h14v9M5 13v7m14-7v7M3 20h18"/>',Garage:'<path d="m3 9 9-6 9 6v12H3V9Zm3 12v-9h12v9M8 15h8"/>',Garten:'<path d="M12 21v-8m0 4-5-3m5 1 5-4M12 3c5 0 9 4 9 9 0 4-3 6-7 5M12 3C7 3 3 7 3 12c0 4 3 6 7 5"/>',Keller:'<path d="M3 8h18v13H3V8Zm4-5h10v5M7 13h4m-4 4h4m3-4h3m-3 4h3"/>',Aufzug:'<path d="M5 3h14v18H5V3Zm4 5 2-2 2 2m-4 8 2 2 2-2M16 7v10"/>',Bodenbelag:'<path d="M3 3h18v18H3V3Zm0 9h18M12 3v18"/>',Dusche:'<path d="M5 21V7a4 4 0 0 1 8 0m-2 1h7m-7 4v2m3-2v2m3-2v2M4 21h16"/>','Bad mit Badewanne':'<path d="M3 12h18v4a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-4Zm2 0V5a2 2 0 0 1 4 0"/>','Bad mit Fenster':'<path d="M3 3h18v18H3V3Zm9 0v18M3 12h18"/>','Gäste-WC':'<path d="M5 3h14v9a7 7 0 0 1-14 0V3Zm3 18h8M12 19v2"/>'};
    const icon=label=>`<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${amenityPaths[label.split(':')[0]]||amenityPaths.Bodenbelag}</svg>`;
    const gallery=pictures.length?`<div class="pp-gallery"><div class="pp-gallery-stage${pictures[0].isFloorplan?' is-floorplan':''}"><img class="pp-gallery-current" src="${esc(pictures[0].src)}" alt="${esc(pictures[0].alt)}" loading="eager" fetchpriority="high"><span class="pp-gallery-count" aria-live="polite">1 / ${pictures.length}</span><span class="pp-gallery-plan-label" ${pictures[0].isFloorplan?'':'hidden'}>Grundriss</span><button class="pp-gallery-plan-open" type="button" ${pictures[0].isFloorplan?'':'hidden'}>Vergrößern</button>${pictures.length>1?'<button class="pp-gallery-arrow pp-gallery-prev" type="button" aria-label="Vorheriges Bild">‹</button><button class="pp-gallery-arrow pp-gallery-next" type="button" aria-label="Nächstes Bild">›</button>':''}</div>${pictures.length>1?`<div class="pp-gallery-rail" aria-label="Weitere Objektbilder">${pictures.map((item,i)=>`<button type="button" class="pp-gallery-thumb${i===0?' is-active':''}${item.isFloorplan?' is-floorplan':''}" data-photo="${i}" aria-label="${item.isFloorplan?`${esc(item.alt)} – Grundriss`:`Bild ${i+1} von ${pictures.length}`} anzeigen" aria-pressed="${i===0}">${photo(item.src,item.alt,"eager")}${item.isFloorplan?'<span class="pp-thumb-plan-label">Grundriss</span>':''}</button>`).join('')}</div>`:''}</div>`:'';
    const summary=[fact('Zimmer',p.rooms),fact('Schlafzimmer',p.bedrooms),fact('Badezimmer',p.baths),fact('Wohnfläche',p.area==null?null:area(p.area)),fact('Grundstücksfläche',p.plot==null?null:area(p.plot)),fact('Baujahr',p.year)].join('');
    const property=(p.objectFacts||[]).map(({label,value,kind})=>fact(label,kind==='monthlyCurrency'?`${format(value)} / Monat`:kind==='currency'?format(value):kind==='area'?area(value):value)).join('');
    const energyLabel=/verbrauch/i.test(energy.kind||'')?'Endenergieverbrauch':/bedarf/i.test(energy.kind||'')?'Endenergiebedarf':'Endenergiekennwert';
    const energyFacts=[fact('Energieausweis',energy.availability),fact('Energieausweistyp',energy.kind),fact(energyLabel,energy.value==null?null:`${new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(energy.value)} kWh/(m²·a)`),fact('Wesentlicher Energieträger',energy.fuel),fact(energy.yearFromCertificate?'Baujahr laut Energieausweis':'Baujahr laut Objektdaten',energy.buildingYear),fact('Energieeffizienzklasse',energy.rating),fact('Ausgestellt am',energy.issuedOn?date(energy.issuedOn):null),fact('Gültig bis',energy.validUntil?date(energy.validUntil):null),fact('Baujahr Anlagentechnik',energy.equipmentYear),fact('Heizungsart',energy.heating)].join('');
    const energyComplete=Boolean(energy.kind&&energy.value!=null&&energy.fuel&&energy.buildingYear&&energy.rating);
    const money=`<section class="pp-panel pp-money" aria-labelledby="pp-money-heading"><div class="pp-section-lead"><h2 id="pp-money-heading">Kaufpreis & Provision</h2></div><dl class="pp-facts">${fact('Kaufpreis',format(p.price))}${fact('Käuferprovision',p.courtage)}</dl>${p.courtageNote?`<div class="pp-provision-note"><strong>Provisionshinweis</strong><p>${esc(p.courtageNote)}</p></div>`:''}</section>`;
    const energyScale=energy.rating?`<div class="pp-energy-scale" aria-label="Energieeffizienzklasse ${esc(energy.rating)}">${['A+','A','B','C','D','E','F','G','H'].map((rating,i)=>`<span class="pp-scale-step pp-scale-${i}${energy.rating.toUpperCase()===rating?' is-current':''}" ${energy.rating.toUpperCase()===rating?'aria-current="true"':''}>${rating}</span>`).join('')}</div>`:'';
    const floorplans=hasPlans?`<section class="pp-panel pp-floorplans" id="pp-floorplans"><h2>Grundrisse</h2>${floorplanImages.length?`<div class="pp-floorplan-grid">${floorplanImages.map((plan,i)=>`<button class="pp-floorplan-card" type="button" data-plan="${i}" aria-label="${esc(plan.title)} vergrößern"><img src="${esc(plan.preview)}" alt="${esc(plan.title)}" loading="eager" fetchpriority="low"><span>${esc(plan.title)} <small>Vergrößern</small></span></button>`).join('')}</div>`:''}${extraFloorplans.length?`<div class="pp-file-list">${extraFloorplans.map(plan=>`<a href="${esc(plan.url)}" target="_blank" rel="noopener noreferrer">${esc(plan.title)} ↗</a>`).join('')}</div>`:''}</section>`:'';
    const planDialog=floorplanImages.length?`<dialog class="pp-plan-dialog" aria-label="Grundriss vergrößert"><div class="pp-plan-dialog-header"><strong class="pp-plan-dialog-title"></strong><button class="pp-plan-dialog-close" type="button" aria-label="Vorschau schließen">×</button></div><img class="pp-plan-dialog-image" alt=""></dialog>`:'';
    const tour=p.tour?`<section class="pp-panel pp-tour"><h2>Virtueller Rundgang</h2><p>Entdecken Sie die Immobilie Raum für Raum.</p>${p.tourEmbed?`<iframe class="pp-tour-frame" src="${esc(p.tour)}" title="Virtueller Rundgang: ${esc(p.title)}" loading="eager" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`:`<div class="pp-tour-placeholder"><a class="pp-button" href="${esc(p.tour)}" target="_blank" rel="noopener noreferrer">Rundgang öffnen ↗</a></div>`}</section>`:'';
    const amenities=[...(p.amenities||[]),...(p.flooring?[`Bodenbelag: ${p.flooring}`]:[])];
    const dial=number=>String(number||'').replace(/[^+\d]/g,'');
    const broker=p.broker||{};
    const brokerContacts=`<div class="pp-contact-details">${broker.phone?`<p><span>Telefon</span><a href="tel:${esc(dial(broker.phone))}">${esc(broker.phone)}</a></p>`:''}${broker.email?`<p><span>E-Mail</span><a href="mailto:${esc(broker.email)}">${esc(broker.email)}</a></p>`:''}${broker.mobile?`<p><span>Mobil</span><a href="tel:${esc(dial(broker.mobile))}">${esc(broker.mobile)}</a></p>`:''}</div>`;
    const inquiryPreview=`<div class="pp-inquiry-object">${p.images?.[0]?`<img src="${esc(p.images[0])}" alt="" loading="eager" fetchpriority="low">`:'<span class="pp-inquiry-fallback" aria-hidden="true">SLS Immobilienpartner</span>'}<div><strong>${esc(p.title)}</strong>${p.city?`<span>${esc([p.zip,p.city].filter(Boolean).join(' '))}</span>`:''}</div></div>`;
    const inquiryForm=`<form class="pp-inquiry pp-panel" id="pp-inquiry"><h2>Ihre Anfrage zu diesem Objekt</h2>${inquiryPreview}<div class="pp-form-grid"><label><span>Vorname <span aria-hidden="true">*</span></span><input name="firstName" autocomplete="given-name" required maxlength="100"></label><label><span>Nachname <span aria-hidden="true">*</span></span><input name="lastName" autocomplete="family-name" required maxlength="100"></label><label class="pp-full"><span>E-Mail <span aria-hidden="true">*</span></span><input type="email" name="email" autocomplete="email" required maxlength="254"></label><label class="pp-full"><span>Telefon <span aria-hidden="true">*</span></span><input type="tel" name="phone" autocomplete="tel" required maxlength="60"></label></div><label class="pp-consent"><input type="checkbox" name="privacy" required><span>Ich habe die <a href="/datenschutz/" target="_blank" rel="noopener noreferrer">Datenschutzerklärung</a> gelesen und willige in die Verarbeitung meiner Daten zur Bearbeitung meiner Anfrage ein. <span aria-hidden="true">*</span></span></label><label class="pp-consent pp-owner-interest"><input type="checkbox" name="ownerInterest"><span>Ich möchte außerdem wissen, was meine eigene Immobilie aktuell wert ist. Bitte kontaktieren Sie mich für eine kostenlose und unverbindliche Einschätzung.</span></label><button type="submit" class="pp-button" ${p.inquiryEnabled&&!demo?'':'disabled'}>Jetzt Anfrage senden</button><p class="form-required-note">* Pflichtfelder.</p><p class="pp-data-note" role="status" aria-live="polite"></p></form>`;
    const mainSections=[
      money,
      summary?`<section class="pp-panel pp-overview"><h2>Eckdaten</h2><dl class="pp-facts">${summary}</dl></section>`:'',
      `<section class="pp-panel pp-energy" id="pp-energy"><h2>Energieausweis</h2>${energyScale}${energyFacts?`<dl class="pp-facts pp-facts-data">${energyFacts}</dl>`:''}${!energyNotRequired(energy)&&!energyComplete?'<p class="form-required-note">* Pflichtfelder.</p><p class="pp-data-note">Weitere Angaben zum Energieausweis erhalten Sie auf Anfrage.</p>':''}</section>`,
      `<section class="pp-panel"><h2>Objektdaten</h2><dl class="pp-facts pp-facts-data">${property}</dl></section>`,
      p.description?`<section class="pp-panel"><h2>Objektbeschreibung</h2><p class="pp-text">${esc(p.description)}</p></section>`:'',
      p.features?`<section class="pp-panel"><h2>Ausstattung</h2><p class="pp-text">${esc(p.features)}</p></section>`:'',
      amenities.length?`<section class="pp-panel"><h2>Merkmale</h2><div class="pp-amenities">${amenities.map(label=>`<span>${icon(label)}${esc(label)}</span>`).join('')}</div></section>`:'',
      p.otherNote?`<section class="pp-panel"><h2>Weitere Informationen</h2><p class="pp-text">${esc(p.otherNote)}</p></section>`:'',
      floorplans,
      tour,
      p.location?`<section class="pp-panel"><h2>Lagebeschreibung</h2><p class="pp-text">${esc(p.location)}</p></section>`:'',
      `<section class="pp-panel pp-map"><h2>Lage auf der Karte</h2><p>Standort: ${esc([p.zip,p.city].filter(Boolean).join(' '))}. Die genaue Objektadresse wird hier nicht veröffentlicht.</p><iframe class="pp-map-frame" src="https://www.google.com/maps?q=${encodeURIComponent([p.zip,p.city].filter(Boolean).join(' '))}&output=embed" title="Karte von ${esc([p.zip,p.city].filter(Boolean).join(' '))}" loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe><small class="pp-external-note">Kartendienst Google Maps · <a href="https://policies.google.com/privacy?hl=de" target="_blank" rel="noopener noreferrer">Datenschutzbestimmungen von Google</a></small></section>`
    ].join('');
    $('#pp-detail-content').innerHTML=`${gallery}${planDialog}<div class="pp-detail-header"><span class="pp-chip">${esc(p.status||'Immobilie')}</span><p class="pp-city">${p.reference?`${esc(p.reference)} · `:''}${esc(p.zip)} ${esc(p.city)} · ${esc(p.type)}</p><h1>${esc(p.title)}</h1></div><div class="pp-detail-columns"><div class="pp-detail-main">${mainSections}</div><aside class="pp-contact" aria-label="Immobilie anfragen und Ansprechpartner"><div class="pp-inquiry-shortcut"><a class="pp-button" href="#pp-inquiry">Immobilie anfragen</a><a class="pp-button pp-financing-shortcut" href="#pp-financing">Finanzierung berechnen</a></div>${inquiryForm}<section class="pp-panel pp-agent-card"><div class="pp-agent-intro">${broker.photo?`<img class="pp-agent-photo" src="${esc(broker.photo)}" alt="${esc(broker.name||'Ansprechpartner')}" loading="eager">`:''}<div><span class="pp-agent-label">Ihr Ansprechpartner</span><h2>${esc(broker.name||'SLS Immobilienpartner')}</h2></div></div>${brokerContacts}${broker.phone||broker.mobile?`<a class="pp-button pp-call" href="tel:${esc(dial(broker.mobile||broker.phone))}">${esc(broker.name||'Makler')} anrufen</a>`:''}</section></aside></div>`;
    $('.pp-detail-main').insertAdjacentHTML('beforeend', '<section class="pp-panel pp-financing" id="pp-financing" aria-labelledby="pp-financing-title"><span class="pp-eyebrow">Für Kaufinteressenten</span><h2 id="pp-financing-title">Finanzierungsrechner</h2><p>Welche Finanzierung passt zu Ihrem Vorhaben? Sie nutzen den Rechner von Justhome. Ihre Eingaben werden dort verarbeitet. <a href="https://justhome.co/datenschutz" target="_blank" rel="noopener noreferrer">Datenschutz bei Justhome ↗</a></p><div class="pp-financing-widget"><iframe title="Justhome Finanzierungsrechner" data-external-src="https://calculator.justhome.com/?partner-id=66f3be08e1c9f54400131a96" width="100%" height="630" loading="eager" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen"></iframe></div></section>');
    $('.pp-money')?.insertAdjacentHTML('beforeend', '<div class="pp-finance-teaser"><span>Was würde diese Immobilie monatlich kosten?</span><a class="pp-finance-jump" href="#pp-financing">Monatliche Finanzierung grob berechnen →</a></div>');
    window.slsPrepareExternalFrames?.();
    $('#pp-detail-content').insertAdjacentHTML('beforeend', '<section class="pp-owner-valuation" aria-labelledby="pp-owner-title"><div class="pp-owner-intro"><span class="pp-eyebrow">Für Eigentümer</span><h2 id="pp-owner-title">So könnte auch Ihre Immobilie präsentiert werden</h2><p>Sie überlegen, Ihre Immobilie zu verkaufen? Mit unserem Bewertungsrechner erhalten Sie einen ersten Anhaltspunkt für den Wert Ihrer Immobilie.</p></div><div class="pp-owner-widget"><iframe id="pp-fisher-widget" title="Immobilienbewertung von SLS Immobilienpartner" width="100%" height="600" referrerpolicy="strict-origin-when-cross-origin"></iframe></div></section>');
    $('.pp-owner-valuation').insertAdjacentHTML('beforebegin','<section class="pp-related" id="pp-similar" aria-labelledby="pp-similar-title" aria-busy="true"><div class="pp-related-heading"><h2 id="pp-similar-title">Weitere Immobilien</h2></div><p>Passende Angebote werden geladen …</p></section>');
    initSimilarProperties(p);
    $('.pp-detail-header').insertAdjacentHTML('beforeend',favoriteButton(p,true));
    syncFavorites();
    window.ppInitValuation?.();
    // The contact panel follows every property section in the document.
    // The single-column layout places it after the map on narrow screens.
    const shortcut=$('.pp-inquiry-shortcut'), inquiry=$('#pp-inquiry');
    let shortcutFrame=0;
    const updateShortcut=()=>{
      shortcutFrame=0;
      const header=$('.pp-detail-header').getBoundingClientRect();
      const form=inquiry.getBoundingClientRect();
      const formVisible=form.bottom>110&&form.top<window.innerHeight-70;
      shortcut.classList.toggle('is-active',header.bottom<110&&!formVisible);
    };
    const scheduleShortcut=()=>{
      if(!shortcutFrame)shortcutFrame=requestAnimationFrame(updateShortcut);
    };
    window.addEventListener('scroll',scheduleShortcut,{passive:true});
    window.addEventListener('resize',scheduleShortcut,{passive:true});
    scheduleShortcut();
    $('#pp-inquiry').addEventListener('submit',async event=>{
      event.preventDefault();
      if(!p.inquiryEnabled||demo)return;
      const form=event.currentTarget, button=form.querySelector('button[type=submit]'),status=form.querySelector('[role=status]');
      const fields=Object.fromEntries(new FormData(form).entries());
      button.disabled=true;status.textContent='Anfrage wird gesendet …';
      try {
        const response=await secureFormFetch('/api/propstack-test-inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...fields,propertyId:p.id,privacy:fields.privacy==='on',ownerInterest:fields.ownerInterest==='on',testMode:p.inquiryTestMode===true})});
        const result=await response.json();
        if(response.status===409&&result.code==='CONTACT_IDENTITY_CONFLICT'){status.textContent=result.error;button.disabled=false;return}if(!response.ok)throw new Error(result.error||'Die Anfrage konnte nicht gesendet werden.');
        form.reset();status.textContent='Vielen Dank für Ihre Anfrage. Das Exposé wurde Ihnen per E-Mail zugesandt.';
      } catch(error) {status.textContent=error.message;button.disabled=false}
    });
    if(floorplanImages.length){
      const dialog=$('.pp-plan-dialog');
      let opener;
      const openPlan=(plan,button)=>{
        opener=button;
        $('.pp-plan-dialog-title').textContent=plan.title;
        $('.pp-plan-dialog-image').src=plan.url;
        $('.pp-plan-dialog-image').alt=plan.title;
        dialog.showModal();
        document.body.classList.add('pp-plan-is-open');
      };
      $('.pp-gallery-plan-open').addEventListener('click',event=>{
        const selected=document.querySelector('.pp-gallery-thumb.is-active');
        const planIndex=selected?Number(selected.dataset.photo)-(p.images||[]).length:0;
        if(floorplanImages[planIndex])openPlan(floorplanImages[planIndex],event.currentTarget);
      });
      document.querySelectorAll('.pp-floorplan-card').forEach(button=>button.addEventListener('click',()=>openPlan(floorplanImages[Number(button.dataset.plan)],button)));
      $('.pp-plan-dialog-close').addEventListener('click',()=>dialog.close());
      dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
      dialog.addEventListener('close',()=>{document.body.classList.remove('pp-plan-is-open');opener?.focus()});
    }
    if(pictures.length>1){
      let index=0;
      const setPhoto=n=>{index=(n+pictures.length)%pictures.length;const item=pictures[index];$('.pp-gallery-current').src=item.src;$('.pp-gallery-current').alt=item.alt;$('.pp-gallery-stage').classList.toggle('is-floorplan',item.isFloorplan);$('.pp-gallery-count').textContent=`${index+1} / ${pictures.length}`;$('.pp-gallery-plan-label').hidden=!item.isFloorplan;$('.pp-gallery-plan-open').hidden=!item.isFloorplan;document.querySelectorAll('.pp-gallery-thumb').forEach((button,i)=>{button.classList.toggle('is-active',i===index);button.setAttribute('aria-pressed',String(i===index))});};
      const stage=$('.pp-gallery-stage');
      let swipeStart=null;
      stage.addEventListener('touchstart',event=>{
        if(event.touches.length!==1||event.target.closest('button')){swipeStart=null;return}
        swipeStart={x:event.touches[0].clientX,y:event.touches[0].clientY};
      },{passive:true});
      stage.addEventListener('touchend',event=>{
        if(!swipeStart||event.changedTouches.length!==1)return;
        const dx=event.changedTouches[0].clientX-swipeStart.x;
        const dy=event.changedTouches[0].clientY-swipeStart.y;
        swipeStart=null;
        if(Math.abs(dx)>=45&&Math.abs(dx)>Math.abs(dy)*1.3)setPhoto(index+(dx<0?1:-1));
      },{passive:true});
      stage.addEventListener('touchcancel',()=>{swipeStart=null});
      $('.pp-gallery-prev').addEventListener('click',()=>setPhoto(index-1));
      $('.pp-gallery-next').addEventListener('click',()=>setPhoto(index+1));
      document.querySelectorAll('.pp-gallery-thumb').forEach(button=>button.addEventListener('click',()=>setPhoto(Number(button.dataset.photo))));
    }
  }

  function renderUnavailable(){
    $('#pp-search').hidden=true;$('#pp-detail').hidden=false;
    document.body.classList.add('pp-is-detail');
    setInactiveSeo('Immobilie nicht mehr verfügbar','Dieses Immobilienangebot ist nicht mehr verfügbar. Finden Sie aktuelle Kaufimmobilien bei SLS Immobilienpartner.');
    $('.pp-back').href=browsePath;
    $('#pp-banner').textContent='Dieses Angebot ist nicht mehr verfügbar.';
    $('#pp-detail-content').innerHTML=`<section class="pp-unavailable pp-panel" aria-labelledby="pp-unavailable-title"><span class="pp-eyebrow">SLS Immobilienpartner</span><h1 id="pp-unavailable-title">Diese Immobilie ist nicht mehr verfügbar.</h1><p>Das Angebot wurde aus der aktuellen Vermarktung genommen. Entdecken Sie unsere derzeit verfügbaren Immobilien oder speichern Sie Ihre Suche, damit wir Sie über passende neue Angebote informieren können.</p><div class="pp-unavailable-actions"><a class="pp-button" href="${browsePath}">Aktuelle Immobilien ansehen</a><a class="pp-button pp-button-secondary" href="${browsePath}#pp-search">Neue Suche starten</a></div></section>`;
  }

  function renderNotFound(){
    setInactiveSeo('Immobilie nicht gefunden','Dieses Immobilienangebot wurde nicht gefunden. Entdecken Sie die aktuellen Angebote von SLS Immobilienpartner.');
    $('#pp-search').hidden=true;$('#pp-detail').hidden=false;document.body.classList.add('pp-is-detail');
    $('.pp-back').href=browsePath;
    $('#pp-detail-content').innerHTML=`<section class="pp-panel"><h1>Immobilie nicht gefunden</h1><p>Unter dieser Adresse ist kein Immobilienangebot verfügbar.</p><a class="pp-button" href="${browsePath}">Aktuelle Immobilien ansehen</a></section>`;
  }

  async function load(){
    try {
      if(serverData){
        if(serverData.status===410){renderUnavailable();return}
        if(serverData.status===404){renderNotFound();return}
        if(serverData.status===200&&String(serverData.property?.id)===id){renderDetail(serverData.property);return}
        return; // Keep the server-rendered temporary error and its retry link.
      }
      if(favoritesView){
        document.title='Ihre Favoriten · SLS Immobilienpartner';
        $('.pp-heading h1').textContent='Ihre Favoriten';
        $('.pp-heading>p:last-child').textContent='Ihre gemerkten Immobilien – gespeichert in diesem Browser auf diesem Gerät.';
        $('#pp-form').hidden=true;$('.pp-toolbar label').hidden=true;$('#pp-load-sentinel').hidden=true;
        $('#pp-banner').textContent='Preise und Verfügbarkeit werden beim Öffnen der Favoriten aktualisiert.';
        await loadFavorites();return;
      }
      if(productionRoute&&!id&&location.pathname.startsWith('/immobilie/')){renderNotFound();return}
      if(!id)await setupBrowse();
      if(demo){all=[sample];total=1;hasMore=false;$('#pp-banner').textContent='Designvorschau mit einem öffentlich sichtbaren Beispielobjekt. Keine Live-Abfrage; Angaben und Verfügbarkeit bitte auf sls.de prüfen.'}
      else if(id){const response=await fetch(`/api/propstack-properties?id=${encodeURIComponent(id)}`,{cache:'no-store'});const data=await response.json();if(response.status===410&&data.code==='PROPERTY_UNAVAILABLE'){renderUnavailable();return}if(!response.ok){if(response.status===404){renderNotFound();return}throw new Error(data.error||'Daten nicht abrufbar')}all=data.items;$('#pp-banner').textContent=productionRoute?'Aktuelles Immobilienangebot von SLS Immobilienpartner.':'Getrennter Vercel-Test: Objektanfragen werden hier noch nicht versendet. Bewertungs- und Finanzierungsrechner sind live; abgeschickte Angaben können echte Anfragen auslösen.'}
      else {committedQuery=captureQuery();currentPage=0;await loadNextPage();$('#pp-banner').textContent='Entdecken Sie unsere aktuellen Kaufimmobilien.'}
      if(id){const p=all.find(item=>item.id===id);if(p)renderDetail(p);else {renderNotFound();return}}
      else if(demo){renderList()}
    } catch(error){if(id||location.pathname.startsWith('/immobilie/'))setInactiveSeo('Immobilie derzeit nicht abrufbar','Das Immobilienangebot kann gerade nicht geladen werden. Bitte versuchen Sie es später erneut.');$('#pp-count').textContent='Noch keine Immobilien verfügbar';$('#pp-results').innerHTML=`<div class="pp-error">${esc(error.message)}<br><a href="${esc(location.pathname+location.search)}">Erneut laden</a><br><a href="/immobilien-test/?demo=1">Design mit einem Beispielobjekt ansehen</a></div>`}
  }
  $('#pp-form').addEventListener('submit',event=>{event.preventDefault();browsePage=1;const quick=$('#pp-quick-query');if(quick)quick.value=$('#pp-form').elements.query.value;$('#pp-filter-dialog')?.close();resetBrowse()});
  $('#pp-sort').addEventListener('change',()=>{resetBrowse()});
  load();
})();

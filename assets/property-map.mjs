let assetsPromise;
const postcodeFiles=new Map();
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>value==null?'Preis auf Anfrage':new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(value);
function loadLeaflet(){
  if(window.L)return Promise.resolve(window.L);
  if(!assetsPromise)assetsPromise=new Promise((resolve,reject)=>{
    const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/vendor/leaflet/leaflet.css';document.head.append(css);
    const script=document.createElement('script');script.src='/assets/vendor/leaflet/leaflet.js';script.onload=()=>resolve(window.L);script.onerror=()=>{assetsPromise=null;script.remove();reject(new Error('Kartenbibliothek nicht verfügbar'))};document.head.append(script);
  });
  return assetsPromise;
}
async function coordinates(items){
  const prefixes=[...new Set(items.map(p=>String(p.zip||'').trim()).filter(zip=>/^\d{5}$/.test(zip)).map(zip=>zip[0]))];
  const entries=await Promise.all(prefixes.map(async prefix=>{
    if(!postcodeFiles.has(prefix))postcodeFiles.set(prefix,fetch(`/assets/data/postcodes-de-${prefix}.json`).then(r=>{if(!r.ok)throw new Error('Ortsdaten fehlen');return r.json()}).catch(e=>{postcodeFiles.delete(prefix);throw e}));
    return postcodeFiles.get(prefix);
  }));
  const lookup=Object.assign({},...entries);
  return items.flatMap(item=>{const point=lookup[String(item.zip||'').trim()];return point?[{item,point}]:[]});
}
export async function createPropertyMap(container,status,onSelect,detailLink){
  const L=await loadLeaflet();
  const map=L.map(container,{scrollWheelZoom:false,maxZoom:14}).setView([51.3,7.2],7);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · Orte: <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a>'}).addTo(map);
  const summaries=new Map();
  import('/assets/google-property-basemap.mjs').then(({googleBasemap})=>googleBasemap(L,map,tiles,()=>{status.textContent='Google Maps derzeit nicht verfügbar. Ersatzkarte wird angezeigt.'})).catch(()=>{status.textContent='Google Maps derzeit nicht verfügbar. Ersatzkarte wird angezeigt.'});
  let tileFailed=false,points=[],markers=new Map(),currentKey='',version=0;
  const layer=L.layerGroup().addTo(map);
  tiles.on('tileerror',()=>{tileFailed=true;status.textContent='Kartenhintergrund derzeit nicht verfügbar. Die Objektliste bleibt nutzbar.'});
  const draw=()=>{
    layer.clearLayers();markers.clear();
    const groups=new Map();
    points.forEach(record=>{const pixel=map.project(record.point,map.getZoom()),key=`${Math.floor(pixel.x/65)}:${Math.floor(pixel.y/65)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(record)});
    groups.forEach(group=>{
      const center=[0,1].map(axis=>group.reduce((sum,p)=>sum+p.point[axis],0)/group.length);
      const label=group.length>1?String(group.length):money(group[0].item.price);
      const marker=L.marker(center,{keyboard:true,title:group.length>1?`${group.length} Immobilien – ungefähre Lage`:`${group[0].item.zip} ${group[0].item.city} – ungefähre Lage`,icon:L.divIcon({className:'pp-map-marker',html:`<span>${escape(label)}</span>`,iconSize:[group.length>1?44:112,40],iconAnchor:[group.length>1?22:56,20]})}).addTo(layer);
      const popup=document.createElement('div');popup.className='pp-map-popup';
      popup.innerHTML=`<p class="pp-map-popup-hint">Ungefähre Lage · ${group.length} ${group.length===1?'Immobilie':'Immobilien'}</p>`+group.map(({item})=>`<article data-popup-id="${escape(item.id)}"><strong>${escape(item.zip)} ${escape(item.city)}</strong><p>${escape(money(item.price))}</p><button type="button" data-select="${escape(item.id)}">In Liste zeigen</button><a href="${escape(detailLink(item))}">Objekt ansehen →</a></article>`).join('');
      // Fetch card details only for popup entries actually scrolled into view.
      let observer;
      marker.on('popupopen',()=>{
        observer?.disconnect();
        observer=new IntersectionObserver(entries=>entries.forEach(async entry=>{
          if(!entry.isIntersecting)return;
          observer.unobserve(entry.target);
          const node=entry.target,id=node.dataset.popupId;if(node.dataset.loaded)return;
          try{
            if(!summaries.has(id))summaries.set(id,fetch(`/api/propstack-properties?summary=${encodeURIComponent(id)}`,{signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok)throw new Error('Objekt fehlt');return (await r.json()).items[0]}).catch(e=>{summaries.delete(id);throw e}));
            const item=await summaries.get(id);if(!item)return;
            node.querySelector('strong').textContent=item.title;
            if(item.images?.[0]){const img=document.createElement('img');img.src=item.images[0];img.alt='';img.loading='lazy';node.prepend(img)}
            node.dataset.loaded='1';
          }catch{}
        }),{root:popup.closest('.leaflet-popup-content'),rootMargin:'50px'});
        popup.querySelectorAll('[data-popup-id]').forEach(node=>observer.observe(node));
      });
      marker.on('popupclose',()=>observer?.disconnect());
      popup.addEventListener('click',event=>{const button=event.target.closest('[data-select]');if(button)onSelect(button.dataset.select)});
      marker.bindPopup(popup,{maxWidth:310,maxHeight:320});
      group.forEach(({item})=>markers.set(String(item.id),marker));
    });
  };
  map.on('zoomend',draw);
  return {
    async update(items){
      const own=++version,key=items.map(p=>p.id).join(',');
      const located=await coordinates(items);if(own!==version)return;
      points=located;map.invalidateSize();
      if(key!==currentKey){currentKey=key;if(points.length)map.fitBounds(L.latLngBounds(points.map(p=>p.point)),{padding:[35,35],maxZoom:11});}
      draw();
      if(!tileFailed)status.textContent=items.length?`${located.length} von ${items.length} Treffern auf der Karte.${located.length<items.length?' Für weitere Angebote fehlt eine zuordenbare Postleitzahl.':''}`:'Keine passenden Immobilien. Bitte ändern Sie Ihre Filter.';
    },
    focus(id){new Set(markers.values()).forEach(marker=>marker.getElement()?.classList.remove('is-selected'));const marker=markers.get(String(id));if(marker){marker.openPopup();marker.getElement()?.classList.add('is-selected')}},
    resize(){map.invalidateSize()},
  };
}

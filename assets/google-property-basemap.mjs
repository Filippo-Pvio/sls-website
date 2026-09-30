let googlePromise;
function script(src){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.async=true;el.onload=resolve;el.onerror=()=>{el.remove();reject(new Error('Kartenbibliothek nicht verfügbar'))};document.head.append(el)})}
export async function googleBasemap(L,map,fallback,onFallback){
  const response=await fetch('/api/property-map-config',{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Kartenkonfiguration fehlt');
  const {key}=await response.json();if(!key)throw new Error('Google Maps nicht konfiguriert');
  let layer,failed=false;
  const restore=()=>{failed=true;if(layer)map.removeLayer(layer);if(!map.hasLayer(fallback))fallback.addTo(map);onFallback()};
  window.gm_authFailure=restore;
  if(!googlePromise)googlePromise=(async()=>{
    await script('/assets/vendor/google-mutant/Leaflet.GoogleMutant.js');
    if(!window.google?.maps)await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Google Maps Zeitüberschreitung')),15000);
      window.ppGoogleMapsReady=()=>{clearTimeout(timer);delete window.ppGoogleMapsReady;resolve()};
      script(`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=ppGoogleMapsReady&language=de&region=DE`).catch(e=>{clearTimeout(timer);reject(e)});
    });
  })().catch(e=>{googlePromise=null;throw e});
  await googlePromise;
  if(failed)throw new Error('Google Maps nicht freigegeben');
  layer=L.gridLayer.googleMutant({type:'roadmap',maxZoom:20,styles:[
    {elementType:'geometry',stylers:[{color:'#f7f5f1'}]},
    {elementType:'labels.text.fill',stylers:[{color:'#5f5d5b'}]},
    {elementType:'labels.text.stroke',stylers:[{color:'#fff9f3'}]},
    {featureType:'road',elementType:'geometry',stylers:[{color:'#ffffff'}]},
    {featureType:'road.highway',elementType:'geometry',stylers:[{color:'#e5e1db'}]},
    {featureType:'water',elementType:'geometry',stylers:[{color:'#d9e6ea'}]},
    {featureType:'poi',elementType:'geometry',stylers:[{color:'#edf0e9'}]},
    {featureType:'transit',stylers:[{visibility:'off'}]}
  ]});
  layer.addTo(map);map.removeLayer(fallback);map.invalidateSize(false);
  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution('Orte: <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a>');
}

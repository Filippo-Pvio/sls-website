// This browser widget uses the public PriceHubble key already present on sls.de.
// Propstack credentials stay server-side.
window.ppInitValuation = () => {
  const iframe = document.getElementById('pp-fisher-widget');
  if (!iframe || iframe.dataset.externalReady) return;
  iframe.dataset.externalReady='1';iframe.hidden=true;
  const {notice,text,button}=window.slsExternalNotice({frame:iframe,title:'Eine erste Einschätzung für Ihre Immobilie',description:'Die Bewertung wird von PriceHubble bereitgestellt. Erst beim Laden werden Verbindungsdaten an den Anbieter übertragen. Ihre Eingaben erfolgen direkt dort.',buttonLabel:'Bewertungsrechner laden'});
  button.addEventListener('click',async()=>{button.disabled=true;try{
    if(!window.FisherWidget?.init)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://fisher.pricehubble.com/widget.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
    iframe.hidden=false;notice.remove();
  window.FisherWidget.init({
    apiKey: "SMPfz9cTNasXXRESOj168p59kPPKaDFN",
    iframe: '#pp-fisher-widget',
    activeColor: '6c97ab',
    buttonColor: '6c97ab',
    textColor: '26353c',
    lang: 'de',
    host: 'https://fisher.pricehubble.com',
    resizable: true,
    scrollTopOffset: 110,
    custom: 'SLS Exposé Vorschau',
    consentGranted: false,
  });
  }catch{text.textContent='Der Bewertungsrechner konnte nicht geladen werden. Bitte kontaktieren Sie SLS direkt.';button.disabled=false;}
  });
};

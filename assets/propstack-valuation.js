// This browser widget uses the public PriceHubble key already present on sls.de.
// Propstack credentials stay server-side.
window.ppInitValuation = async () => {
  const iframe = document.getElementById('pp-fisher-widget');
  if (!iframe || iframe.dataset.externalReady) return;
  iframe.dataset.externalReady='1';iframe.hidden=false;iframe.loading='eager';
  try{
    if(!window.FisherWidget?.init)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://fisher.pricehubble.com/widget.js';script.onload=resolve;script.onerror=reject;document.head.append(script);});
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
  }catch{
    iframe.hidden=true;
    const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Der Bewertungsrechner konnte nicht geladen werden. Bitte kontaktieren Sie SLS direkt.';iframe.before(status);
  }
};

// This browser widget uses the public PriceHubble key already present on sls.de.
// Propstack credentials stay server-side.
window.ppInitValuation = () => {
  const iframe = document.getElementById('pp-fisher-widget');
  if (!iframe || iframe.dataset.externalReady) return;
  iframe.dataset.externalReady='1';iframe.hidden=true;
  const notice=document.createElement('div'),text=document.createElement('p'),button=document.createElement('button');
  notice.className='external-service-notice';text.textContent='Beim Laden des Bewertungsrechners werden Verbindungsdaten an PriceHubble übertragen. Ihre Eingaben erfolgen direkt beim Anbieter.';button.type='button';button.className='button';button.textContent='Bewertungsrechner laden';notice.append(text,button);iframe.before(notice);
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

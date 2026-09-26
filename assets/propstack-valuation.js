// This browser widget uses the public PriceHubble key already present on sls.de.
// Propstack credentials stay server-side.
window.ppInitValuation = () => {
  const iframe = document.getElementById('pp-fisher-widget');
  if (!iframe || !window.FisherWidget?.init) return;
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
};

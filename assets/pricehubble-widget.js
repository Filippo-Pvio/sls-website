(() => {
  const frame = document.getElementById("fisher-widget");
  if (!frame) return;

  const showFallback = () => {
    frame.hidden = true;
    const fallback = document.querySelector("[data-valuation-fallback]");
    if (fallback) fallback.hidden = false;
  };

  const script = document.createElement("script");
  script.src = "https://fisher.pricehubble.com/widget.js";
  script.async = true;
  script.onload = () => {
    try {
      // Public widget identifier already used by SLS on sls.de; not a Propstack API credential.
      window.FisherWidget.init({
        apiKey: "SMPfz9cTNasXXRESOj168p59kPPKaDFN",
        iframe: "#fisher-widget",
        activeColor: "6c97ab",
        buttonColor: "ff596f",
        textColor: "26353c",
        lang: "de",
        resizable: true,
        scrollTopOffset: 100,
        consentGranted: false,
        custom: "SLS Relaunch – Immobilienbewertung"
      });
    } catch {
      showFallback();
    }
  };
  script.onerror = showFallback;
  document.head.appendChild(script);
})();

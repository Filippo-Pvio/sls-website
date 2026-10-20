(function () {
  'use strict';
  var duration = 20000;
  var slides = [
    {title:'Was ist Ihre Immobilie heute wert?',accent:'Jetzt online einschätzen.',copy:'Erhalten Sie eine erste Wertindikation für Ihr Haus oder Ihre Wohnung. Persönlich prüfen wir anschließend die Besonderheiten Ihrer Immobilie.',image:'/assets/images/valuation-hero/beratung-1536.webp'},
    {title:'Sie kennen Ihr Zuhause. Wir erkennen seinen Wert.',accent:'Mehr als Quadratmeter.',copy:'Lage, Zustand, Ausstattung und Modernisierungen: Wir betrachten, was Ihre Immobilie besonders macht.',image:'/assets/images/valuation-hero/besichtigung-1536.webp'},
    {title:'Ein erster Wertrahmen. Direkt online.',accent:'Digital beginnen.',copy:'Beschreiben Sie Ihre Immobilie in wenigen Schritten. Der Bewertungsrechner ordnet Ihre Angaben anhand verfügbarer Marktdaten ein.',image:'/assets/images/hero-scenes/consultation-1536.webp'},
    {title:'Verkaufen beginnt mit einer guten Grundlage.',accent:'Persönlich für Sie da.',copy:'Wir verbinden regionale Marktkenntnis mit einer persönlichen Einschätzung. Sie entscheiden in Ruhe über Ihren nächsten Schritt.',image:'/assets/images/valuation-hero/kontakt-1536.webp'}
  ];
  var index = 0, started = Date.now(), generation = 0, front = 0;
  function el(id) { return document.getElementById(id); }
  function show(at) {
    index = at % slides.length; started = Date.now(); var token = ++generation, slide = slides[index];
    el('valuation-title').textContent = slide.title; el('valuation-accent').textContent = slide.accent;
    el('valuation-copy').textContent = slide.copy; el('counter').textContent = (index + 1) + ' / ' + slides.length;
    el('progress-fill').style.width = '0%';
    var image = new Image();
    image.onload = function () {
      if(token !== generation)return;
      front = 1 - front; var target = el(front ? 'photo-b' : 'photo-a'), old = el(front ? 'photo-a' : 'photo-b');
      target.style.backgroundImage = 'url(' + JSON.stringify(slide.image) + ')'; target.classList.add('visible'); old.classList.remove('visible');
    };
    // Keep the last usable photograph if an image cannot load; the presentation keeps running.
    image.src = slide.image;
    var next = new Image(); next.src = slides[(index + 1) % slides.length].image;
  }
  try {
    var qr = qrcode(0, 'Q'); qr.addData('https://sls.de/immobilienbewertung/', 'Byte'); qr.make();
    el('qr-symbol').innerHTML = qr.createSvgTag({cellSize:4,margin:16,scalable:true});
  } catch (_) { /* The written destination remains visible and usable. */ }
  setInterval(function () {
    if(window.SLSSignagePaused)return;
    var elapsed = Date.now() - started;
    if(elapsed >= duration){show(index + 1);return;}
    el('progress-fill').style.width = Math.min(100,elapsed / duration * 100) + '%';
  },250);
  document.addEventListener('visibilitychange',function () { if(!document.hidden)show(index); });
  var programmeActivated=false;
  window.addEventListener('sls-signage-activation',function(event){if(event.detail.active){if(programmeActivated)show(index+1);else started=Date.now();programmeActivated=true;}});
  show(0);
})();

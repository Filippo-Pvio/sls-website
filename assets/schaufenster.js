(function () {
  'use strict';
  var references = Boolean(document.documentElement && document.documentElement.getAttribute('data-display-kind') === 'references');
  var failureMessage = references ? 'Unsere Verkaufserfolge finden Sie auf sls.de/referenzen. Wir sind persönlich für Sie da.' : 'Entdecken Sie unsere Immobilien auf sls.de. Wir sind persönlich für Sie da.';
  var emptyMessage = references ? 'Entdecken Sie unsere erfolgreich vermittelten Immobilien auf sls.de/referenzen.' : 'Neue Immobilienangebote finden Sie auf sls.de. Wir beraten Sie gerne persönlich.';
  var SLIDE_MS = 20000, REFRESH_MS = 300000, MAX_AGE_MS = 1800000;
  var items = [], index = -1, started = 0, lastSuccess = 0, refreshPending = false;
  var generation = 0, photos = [], photoIndex = -1, front = 0, imagePending = false;
  var detailCache = new Map(), imagesFailed = new Set(), lastTick = Date.now();
  var number = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
  var euros = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var el = function (id) { return document.getElementById(id); };
  var positive = function (n) { return n != null && Number.isFinite(Number(n)) && Number(n) > 0; };
  function text(id, value) { el(id).textContent = value || ''; }
  function shuffled(rows, previousId) {
    var result = rows.slice();
    for (var i = result.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), swap = result[i];
      result[i] = result[j]; result[j] = swap;
    }
    // Do not repeat the last property immediately at the start of a new round.
    if (result.length > 1 && result[0].id === previousId) {
      var next = 1 + Math.floor(Math.random() * (result.length - 1)), first = result[0];
      result[0] = result[next]; result[next] = first;
    }
    return result;
  }
  function safeImage(value) {
    try { var url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch (_) { return ''; }
  }
  function request(url) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, references ? 45000 : 18000);
    return fetch(url, { cache: 'no-store', signal: controller.signal }).then(function (response) {
      if (!response.ok) { var error = new Error('HTTP ' + response.status); error.status = response.status; throw error; }
      return response.json();
    }).finally(function () { clearTimeout(timer); });
  }
  function resetImages() {
    generation++; imagePending = false; photos = []; photoIndex = -1;
    ['photo-a', 'photo-b'].forEach(function (id) { el(id).classList.remove('visible'); el(id).style.backgroundImage = ''; });
    el('photo-dots').replaceChildren();
  }
  function standby(message) {
    index = -1; resetImages();
    el('property-qr').hidden = true; el('property-qr').removeAttribute('href');
    el('qr-symbol').replaceChildren(); text('qr-reference', '');
    el('property-content').hidden = true; el('standby').hidden = false;
    text('standby', message); text('location', 'SLS Immobilienpartner');
    text('title', references ? 'Erfolgreich vermittelt. Persönlich begleitet.' : 'Ihr nächstes Kapitel beginnt hier.');
    el('title').classList.remove('long');
    text('offer-type', 'Persönlich für Sie da'); text('photo-caption', 'Wir finden den Raum für Ihre Pläne.'); text('counter', '');
    el('progress-fill').style.width = '0%';
  }
  function energyLine(p) {
    var e = p.energy || {};
    if (/^(?:wird\s+)?nicht\s+benötigt[.!]?$/i.test(String(e.availability || '').trim())) return 'Energieausweis wird nicht benötigt';
    var parts = [e.kind];
    if (e.value != null && Number.isFinite(Number(e.value))) parts.push(number.format(e.value) + ' kWh/(m²·a)');
    if (e.fuel) parts.push(e.fuel);
    if (e.buildingYear) parts.push('Baujahr ' + e.buildingYear);
    if (e.rating) parts.push('Klasse ' + e.rating);
    return parts.filter(Boolean).join(' · ') || 'Energieangaben auf Anfrage';
  }
  function renderFacts(p) {
    var facts = [];
    if(references){
      facts=(p.facts||[]).filter(function(fact){return Array.isArray(fact)&&fact.length===2;}).map(function(fact){return [fact[1],fact[0]];});
    }
    if (!references && positive(p.area)) facts.push([number.format(p.area) + ' m²', 'Fläche']);
    if (!references && positive(p.rooms)) facts.push([number.format(p.rooms), 'Zimmer']);
    if (!references && positive(p.plot)) facts.push([number.format(p.plot) + ' m²', 'Grundstück']);
    if (!references && facts.length < 3 && positive(p.year)) facts.push([String(p.year), 'Baujahr']);
    el('facts').replaceChildren();
    facts.slice(0, 3).forEach(function (fact) {
      var node = document.createElement('div'), value = document.createElement('strong'), label = document.createElement('span');
      node.className = 'fact'; value.textContent = fact[0]; label.textContent = fact[1]; node.append(value, label); el('facts').appendChild(node);
    });
  }
  function renderData(p) {
    text('location', [p.zip, p.city].filter(Boolean).join(' ')); text('title', p.title);
    el('title').classList.toggle('long', p.title.length > 100);
    text('offer-type', references ? (p.type || 'Immobilie') + ' · Verkauft' : (p.type || 'Immobilie') + ' · Kauf');
    text('price', references ? 'Erfolgreich vermittelt' : positive(p.price) ? euros.format(p.price) : 'Preis auf Anfrage');
    el('price').classList.toggle('on-request', references || !positive(p.price));
    var commission = String(p.courtage || '').trim();
    if (/^\d+(?:[.,]\d+)?$/.test(commission)) commission += ' %';
    text('commission', !references && commission ? 'Käuferprovision: ' + commission : '');
    text('energy', references ? '' : energyLine(p)); text('reference', (references ? 'Referenz ' : 'Objekt ') + (p.reference || p.id));
    text('counter', (index + 1) + ' / ' + items.length); renderFacts(p);
    renderQr(p);
  }
  function renderQr(p) {
    var card = el('property-qr');
    if (!/^\d+$/.test(String(p.id))) { card.hidden = true; card.removeAttribute('href'); return; }
    // Existing stable object-ID route redirects to this property's current canonical exposé.
    var href = references ? 'https://sls.de/referenz/objekt-' + encodeURIComponent(p.id) + '/' : 'https://sls.de/immobilien/?objekt=' + encodeURIComponent(p.id);
    if (card.getAttribute('href') !== href) {
      card.hidden = true;
      try {
        var qr = qrcode(0, 'Q'); qr.addData(href, 'Byte'); qr.make();
        var count = qr.getModuleCount(), quiet = 4;
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 ' + (count + quiet * 2) + ' ' + (count + quiet * 2));
        svg.setAttribute('shape-rendering', 'crispEdges');
        var background = document.createElementNS(svg.namespaceURI, 'rect');
        background.setAttribute('width', '100%'); background.setAttribute('height', '100%'); background.setAttribute('fill', '#ffffff'); svg.appendChild(background);
        var path = document.createElementNS(svg.namespaceURI, 'path'), segments = [];
        for (var row = 0; row < count; row++) for (var col = 0; col < count; col++) {
          if (qr.isDark(row, col)) segments.push('M' + (col + quiet) + ',' + (row + quiet) + 'h1v1h-1z');
        }
        path.setAttribute('d', segments.join('')); path.setAttribute('fill', '#000000'); svg.appendChild(path);
        el('qr-symbol').replaceChildren(svg); card.setAttribute('href', href);
      } catch (_) { card.removeAttribute('href'); el('qr-symbol').replaceChildren(); return; }
    }
    text('qr-reference', (references ? 'Referenz ' : 'Objekt ') + (p.reference || p.id)); card.hidden = false;
  }
  function showPhoto(next) {
    if (imagePending || !photos.length) return;
    var url = photos[next]; if (!url || imagesFailed.has(url)) return;
    var token = generation, img = new Image(), settled = false;
    imagePending = true;
    var timer = setTimeout(function () { finish(false); }, 8000);
    function finish(ok) {
      if (settled) return; settled = true; clearTimeout(timer); img.onload = img.onerror = null;
      if (token !== generation) return;
      imagePending = false;
      if (!ok) { imagesFailed.add(url); return; }
      front = 1 - front;
      var target = el(front ? 'photo-b' : 'photo-a'), old = el(front ? 'photo-a' : 'photo-b');
      target.style.backgroundImage = 'url(' + JSON.stringify(url) + ')'; target.classList.add('visible'); old.classList.remove('visible');
      photoIndex = next;
      Array.from(el('photo-dots').children).forEach(function (dot, i) { dot.classList.toggle('active', i === next); });
    }
    img.onload = function () { finish(true); }; img.onerror = function () { finish(false); }; img.src = url;
  }
  function setPhotos(p) {
    photos = (p.images || []).map(safeImage).filter(Boolean).filter(function (url) { return !imagesFailed.has(url); }).slice(0, 3);
    el('photo-dots').replaceChildren();
    photos.forEach(function () { var dot = document.createElement('span'); el('photo-dots').appendChild(dot); });
    photoIndex = -1; showPhoto(0);
  }
  function getDetail(p) {
    if(references)return Promise.resolve(p);
    var hit = detailCache.get(p.id);
    if (hit && Date.now() - hit.time < REFRESH_MS) return Promise.resolve(hit.data);
    return request('/api/propstack-properties/?id=' + encodeURIComponent(p.id)).then(function (data) {
      var result = data.items && data.items[0];
      if (!result || String(result.id) !== p.id) throw new Error('Invalid detail');
      // Keep only the current and next few objects; never accumulate an entire gallery catalog.
      if (detailCache.size >= 4) detailCache.delete(detailCache.keys().next().value);
      detailCache.set(p.id, { data: result, time: Date.now() });
      return result;
    });
  }
  function show(at) {
    if (!items.length) return;
    if (at >= items.length) {
      items = shuffled(items, items[index] && items[index].id); at = 0;
    }
    index = (at + items.length) % items.length; started = Date.now(); resetImages();
    var p = items[index], token = generation;
    el('property-content').hidden = false; el('standby').hidden = true;
    renderData(p); text('photo-caption', p.type || (references ? 'Erfolgreich vermittelt' : 'Ihre neue Immobilie')); setPhotos(p);
    getDetail(p).then(function (detail) {
      if (token !== generation) return;
      renderData(Object.assign({}, p, detail));
      // Invalidate pending low-resolution image loads before switching to the gallery.
      generation++; imagePending = false; setPhotos(detail);
    }).catch(function (error) {
      if (token !== generation) return;
      if (error.status === 404 || error.status === 410) {
        items = items.filter(function (item) { return item.id !== p.id; }); detailCache.delete(p.id);
        if (items.length) show(index); else standby(emptyMessage);
      }
    });
    // Warm the next object's first high-resolution photograph, with a bounded cache.
    if (items.length > 1) {
      var next = items[(index + 1) % items.length];
      getDetail(next).then(function (detail) { var url = safeImage((detail.images || [])[0]); if (url) { var img = new Image(); img.src = url; } }).catch(function () {});
    }
  }
  function refresh() {
    if (refreshPending) return;
    refreshPending = true;
    request(references ? '/api/propstack-sold-references/?display=1' : '/api/propstack-properties/?display=1').then(function (data) {
      if (!Array.isArray(data.items)) throw new Error('Invalid catalog');
      var seen = new Set();
      var updated = data.items.filter(function (p) {
        if (!p || !/^\d+$/.test(String(p.id)) || typeof p.title !== 'string' || seen.has(String(p.id))) return false;
        p.id = String(p.id); seen.add(p.id); return true;
      });
      // A partial or malformed response must never masquerade as a complete removal.
      if (updated.length !== data.items.length) throw new Error('Incomplete catalog');
      var current = items[index] && items[index].id, previousStarted = started;
      var byId = new Map(updated.map(function (p) { return [p.id, p]; }));
      var knownIds = new Set(items.map(function (p) { return p.id; }));
      var remainingBefore = items.slice(0, Math.max(0, index)).filter(function (p) { return byId.has(p.id); }).length;
      // Refresh facts without restoring server order or replaying already shown properties.
      var retained = items.filter(function (p) { return byId.has(p.id); }).map(function (p) { return byId.get(p.id); });
      var added = updated.filter(function (p) { return !knownIds.has(p.id); });
      items = current ? retained.concat(shuffled(added)) : shuffled(updated);
      lastSuccess = Date.now(); detailCache.clear(); imagesFailed.clear();
      if (!items.length) { standby(emptyMessage); return; }
      var found = items.findIndex(function (p) { return p.id === current; });
      show(found >= 0 ? found : current ? remainingBefore : 0);
      if (found >= 0) started = previousStarted;
    }).catch(function () {
      if (!lastSuccess || Date.now() - lastSuccess > MAX_AGE_MS) {
        items = []; detailCache.clear(); standby(failureMessage);
      }
    }).finally(function () { refreshPending = false; });
  }
  function tick() {
    var now = Date.now();
    // Reconnect after sleep or a suspended Android WebView.
    if (now - lastTick > 60000) refresh(); lastTick = now;
    if (lastSuccess && now - lastSuccess > MAX_AGE_MS && index >= 0) {
      items = []; detailCache.clear(); standby(failureMessage); return;
    }
    if (index < 0) return;
    var elapsed = now - started;
    if (elapsed >= SLIDE_MS) { show(index + 1); return; }
    el('progress-fill').style.width = Math.min(100, elapsed / SLIDE_MS * 100) + '%';
    var usable = photos.filter(function (url) { return !imagesFailed.has(url); });
    if (usable.length && !imagePending) {
      var desired = photos.indexOf(usable[Math.min(usable.length - 1, Math.floor(elapsed / (SLIDE_MS / usable.length)))]);
      if (desired !== photoIndex) showPhoto(desired);
    }
  }
  window.addEventListener('online', refresh);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  setInterval(tick, 250); setInterval(refresh, REFRESH_MS);
  // Faster retries during initial startup, empty results, and extended outages.
  setInterval(function () { if (index < 0) refresh(); }, 30000);
  refresh();
})();

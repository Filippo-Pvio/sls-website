(() => {
  'use strict';
  const VERSION = '2026-10-16.1', KEY = 'sls-privacy-choice-v1', LIFETIME = 180 * 86400000;
  const categories = {
    media: ['Videos und externe Medien', 'Instagram und YouTube, virtuelle Rundgänge sowie Bewertungsanzeigen von ImmoScout24 und Immowelt. Anbieter erhalten Verbindungsdaten und können Cookies oder ähnliche Techniken einsetzen. Verarbeitung außerhalb der EU ist möglich.'],
    maps: ['Karten', 'Google Maps und OpenStreetMap zeigen Standorte und ungefähre Objektlagen. Dabei erhalten die Anbieter Ihre IP-Adresse und weitere Verbindungsdaten; Google kann zusätzliche Speicher- und Trackingtechniken verwenden.'],
    tools: ['Bewertungs- und Finanzierungsrechner', 'PriceHubble und Justhome stellen Rechner bereit. Verbindungsdaten und Ihre dort eingegebenen Angaben werden von diesen Anbietern verarbeitet; zusätzliche Speichertechniken und Verarbeitung außerhalb der EU sind möglich.'],
    analytics: ['Statistik', 'Anonyme und pseudonyme Nutzungsstatistiken mit Google Analytics 4 zur Verbesserung unserer Website.'],
    marketing: ['Marketing', 'Messung und Optimierung von Werbekampagnen über Google Ads und Meta (Facebook/Instagram); dabei können Anbieter Cookies und vergleichbare Technologien einsetzen.'],
    comfort: ['Optionale Darstellung speichern', 'Wir speichern die Auswahl wechselnder Magazinartikel und Referenzen sowie den eingeklappten SIA-Hinweis für diesen Browserbesuch. Ohne Zustimmung funktioniert die Website ebenfalls; die Auswahl kann sich beim Seitenwechsel ändern.']
  };
  let choice = null, dialog, previousFocus;
  const mounts = new Set();
  function valid(value) {
    return value && value.version === VERSION && Number.isFinite(value.at) && value.at <= Date.now() && Date.now() - value.at < LIFETIME && Object.keys(categories).every(key => typeof value[key] === 'boolean');
  }
  try { const value = JSON.parse(localStorage.getItem(KEY)); if (valid(value)) choice = value; else localStorage.removeItem(KEY); } catch { /* Start with no optional permissions. */ }
  const allowed = category => Boolean(choice?.[category] && valid(choice));
  function categoryFor(src) {
    try {
      const host = new URL(src, location.href).hostname;
      if (host === 'www.google.com' || host.endsWith('.googleapis.com') || host.endsWith('.gstatic.com') || host === 'tile.openstreetmap.org') return 'maps';
      if (host.endsWith('.pricehubble.com') || host.endsWith('.justhome.com')) return 'tools';
    } catch { /* Unknown embedded providers require media permission. */ }
    return 'media';
  }
  function notice(category, title) {
    const box = document.createElement('div'); box.className = 'privacy-placeholder';
    const heading = document.createElement('strong'); heading.textContent = title || categories[category][0];
    const text = document.createElement('p'); text.textContent = 'Dieser Inhalt ist derzeit ausgeschaltet. Sie können ihn in den Datenschutzeinstellungen freigeben.';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'privacy-button'; button.textContent = 'Datenschutzeinstellungen';
    button.addEventListener('click', () => open(category)); box.append(heading, text, button); return box;
  }
  function mount(category, element, start, stop = () => {}) {
    if (!categories[category] || !element) return;
    if (element.dataset.consentMounted) return;
    element.dataset.consentMounted = category;
    const placeholder = notice(category, element.title);
    const record = {category, element, placeholder, active:false, start, stop}; mounts.add(record);
    const sync = () => {
      if (!element.isConnected) return;
      if (allowed(category)) {
        placeholder.remove(); element.hidden = false;
        if (!record.active) { record.active = true; Promise.resolve().then(() => { if (allowed(category) && element.isConnected) return start(() => allowed(category) && element.isConnected); }).catch(() => { element.hidden = true; placeholder.querySelector('p').textContent = 'Der Inhalt konnte nicht geladen werden. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns.'; element.before(placeholder); }); }
      } else {
        if (record.active) { stop(); record.active = false; }
        element.hidden = true; if (!placeholder.isConnected) element.before(placeholder);
      }
    };
    record.sync = sync; sync(); return record;
  }
  function frame(element, src) {
    element.dataset.consentSrc = src;
    if (element.isConnected) prepare(element.parentElement);
    return element;
  }
  function prepare(root = document) {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll('img[data-consent-image]:not([data-consent-mounted])').forEach(element => {
      element.dataset.consentMounted = 'media';
      const record = {sync(){element.src = allowed('media') ? element.dataset.consentImage : '/assets/images/magazin/dennis.jpg';}};
      mounts.add(record); record.sync();
    });
    root.querySelectorAll('iframe[data-external-src],iframe[data-consent-src]').forEach(element => {
      const src = element.dataset.consentSrc || element.dataset.externalSrc;
      mount(categoryFor(src), element, () => { element.loading = 'eager'; element.src = src; }, () => element.removeAttribute('src'));
    });
  }
  function close() { if (!dialog?.open) return; dialog.close(); document.body.classList.remove('privacy-dialog-open'); previousFocus?.focus?.({preventScroll:true}); }
  function save(values) {
    const revoked = Object.keys(categories).some(key => allowed(key) && !values[key]);
    choice = {version:VERSION, at:Date.now(), ...Object.fromEntries(Object.keys(categories).map(key => [key, values[key] === true]))};
    try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch { /* Choice works in this tab even when persistent storage is blocked. */ }
    if (!choice.comfort) {
      try { for (let i=sessionStorage.length-1;i>=0;i--) { const key=sessionStorage.key(i); if (/^(sls-(home-magazine|home-reference|profile-magazine|sia-quickbar)|sls\.(?:city\.references\.|home\.references\.))/.test(key)) sessionStorage.removeItem(key); } } catch {}
    }
    close(); mounts.forEach(record => record.sync()); window.dispatchEvent(new CustomEvent('sls:consent-change',{detail:{...choice}}));
    // A full reload also stops SDK-created requests, maps and scripts. Third-party cookies cannot be deleted by SLS.
    if (revoked) location.reload();
  }
  function open(category) {
    if (!dialog) return;
    previousFocus = document.activeElement;
    Object.keys(categories).forEach(key => { dialog.querySelector(`[name="${key}"]`).checked = allowed(key); });
    dialog.showModal(); document.body.classList.add('privacy-dialog-open');
    const details = dialog.querySelector('[data-privacy-details]'); details.open = Boolean(category);
    const target = category ? dialog.querySelector(`[name="${category}"]`) : dialog.querySelector('#privacy-title'); target.focus({preventScroll:true});
  }
  function ready() {
    dialog = document.createElement('dialog'); dialog.className = 'privacy-dialog'; dialog.setAttribute('aria-labelledby','privacy-title');
    dialog.innerHTML = `<div class="privacy-dialog-content"><button type="button" class="privacy-close" aria-label="Datenschutzeinstellungen schließen">×</button><p class="privacy-kicker">Ihre Entscheidung</p><h2 id="privacy-title" tabindex="-1" autofocus>Datenschutzeinstellungen</h2><p>Wir verwenden notwendige Speichertechniken für Sicherheit und von Ihnen angeforderte Funktionen. Zusätzliche Inhalte und optionale Speicherung aktivieren wir nur mit Ihrer Zustimmung. Sie können die Website auch ohne diese nutzen.</p><details data-privacy-details><summary>Auswahl und Anbieter ansehen</summary><div class="privacy-option"><strong>Notwendige Funktionen · immer aktiv</strong><p>Ihre Datenschutzauswahl, Missbrauchsschutz für SIA sowie ausdrücklich angeforderte Favoriten und freiwillig gespeicherte Verkaufscheck-Fortschritte. Weitere Informationen und Fristen stehen in unserer Datenschutzerklärung.</p></div>${Object.entries(categories).map(([key,[label,description]]) => `<label class="privacy-option"><span><input type="checkbox" name="${key}" aria-label="${label}"><strong>${label}</strong></span><p>${description}</p></label>`).join('')}</details><p class="privacy-links"><a href="/datenschutz/">Datenschutzerklärung und Speicherfristen</a></p><div class="privacy-actions"><button type="button" class="privacy-button" data-privacy-reject>Nur notwendige</button><button type="button" class="privacy-button" data-privacy-save>Auswahl speichern</button><button type="button" class="privacy-button" data-privacy-accept>Alle akzeptieren</button></div><p class="privacy-footnote">Auswahl für bis zu sechs Monate auf diesem Gerät. Jederzeit über „Datenschutzeinstellungen“ im Footer änderbar.</p></div>`;
    document.body.append(dialog);
    dialog.querySelector('[data-privacy-reject]').addEventListener('click',()=>save({}));
    dialog.querySelector('[data-privacy-accept]').addEventListener('click',()=>save(Object.fromEntries(Object.keys(categories).map(key=>[key,true]))));
    dialog.querySelector('[data-privacy-save]').addEventListener('click',()=>save(Object.fromEntries(Object.keys(categories).map(key=>[key,dialog.querySelector(`[name="${key}"]`).checked]))));
    dialog.querySelector('.privacy-close').addEventListener('click',close);
    dialog.addEventListener('keydown',event=>{
      if(event.key!=='Tab')return;
      const items=[...dialog.querySelectorAll('button,input,a[href],summary,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);
      const first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    dialog.addEventListener('cancel', event=>{event.preventDefault();close();});
    document.addEventListener('click',event=>{if(event.target.closest('[data-privacy-settings]'))open();});
    prepare();
    new MutationObserver(changes=>{for(const change of changes)for(const node of change.addedNodes)if(node.nodeType===1){if(node.matches('iframe[data-consent-src],iframe[data-external-src]'))prepare(node.parentElement);else prepare(node);}}).observe(document.body,{childList:true,subtree:true});
    if (!choice) open();
  }
  window.SLSConsent = {allowed, mount, frame, prepare, open, version:VERSION,
    session: {getItem(key){if(!allowed('comfort'))return null;try{return sessionStorage.getItem(key)}catch{return null}},setItem(key,value){if(allowed('comfort'))try{sessionStorage.setItem(key,value)}catch{}},removeItem(key){try{sessionStorage.removeItem(key)}catch{}}}
  };
  window.addEventListener('pageshow',event=>{if(!event.persisted)return;try{const stored=JSON.parse(localStorage.getItem(KEY));if(!valid(stored)||JSON.stringify(stored)!==JSON.stringify(choice))location.reload();}catch{location.reload();}});
  window.addEventListener('storage',event=>{if(event.key===KEY)location.reload();});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();

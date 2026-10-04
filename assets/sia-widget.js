/* SIA is enabled only on the approved site or in a preview. */
(async () => {
  if (document.querySelector('sls-sia')) return;
  try {
    const config = await fetch('/api/sia-config', { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
    if (!config?.enabled) return;
  } catch { return; }
  const host = document.createElement('sls-sia');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <link rel="stylesheet" href="/assets/sia-widget.css">
    <div class="quickbar" role="group" aria-label="SLS Immobilienpartner Schnellkontakt">
      <button class="launch" type="button" aria-haspopup="dialog" aria-expanded="false"><strong>SIA</strong><span class="launch-label">fragen</span></button>
      <a class="quick-call" href="tel:+4923697428020" aria-label="SLS Immobilienpartner telefonisch anrufen"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.91.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg></a>
    </div>
    <dialog aria-labelledby="sia-title">
      <header><span class="brand" aria-hidden="true">SIA</span><div class="identity"><h2 id="sia-title"><b>S</b>LS <b>I</b>mmobilien <b>A</b>ssistenz</h2><span class="sub">KI-Assistent von SLS Immobilienpartner</span></div><button class="close" type="button" aria-label="SIA schließen" autofocus><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
      <div class="content">
        <section class="intro"><h3>Was möchten Sie über Immobilien wissen?</h3><p>Ich helfe Ihnen, Ihren nächsten Schritt einzuordnen.</p><div class="suggestions" role="group" aria-label="Thema für Ihre Frage wählen"><button type="button">Verkaufen</button><button type="button">Bewerten</button><button type="button">Kaufen</button><button type="button">Finanzieren</button><button class="why-sls" type="button">Warum SLS Immobilienpartner?</button></div></section>
        <p class="status" role="status" aria-live="polite"></p>
        <section class="result" hidden tabindex="-1" aria-label="Antwort von SIA"><p class="question"></p><span class="origin"></span><div class="answer"></div><details class="sources"><summary>Grundlage dieser Antwort</summary><div class="source-list"></div></details></section>
        <div class="contact"><a href="/kontakt/">Mit unserem Team sprechen</a></div>
      </div>
      <form><label for="sia-question">Ihre Frage an SIA</label><div class="input-row"><textarea id="sia-question" name="question" rows="2" minlength="3" maxlength="1200" required placeholder="Ihre Frage an SIA …" aria-describedby="sia-privacy"></textarea><button class="send" type="submit">Senden</button></div><p class="privacy" id="sia-privacy">SIA ist eine KI und kann Fehler machen. Bitte keine personenbezogenen oder vertraulichen Angaben eingeben. Fragen werden zur Verarbeitung an OpenAI übermittelt.</p><p class="privacy-compact">KI kann Fehler machen. Keine persönlichen Daten eingeben. Verarbeitung durch OpenAI.</p><button class="notes-open" type="button" aria-controls="sia-notes" aria-expanded="false">Hinweise zu KI und Datenschutz</button></form>
      <section class="source-view" hidden aria-labelledby="sia-source-title"><h3 id="sia-source-title" tabindex="-1"></h3><p class="source-meta"></p><div class="source-text"></div><button class="source-back" type="button">Zurück zur Antwort</button></section>
      <section class="notes" id="sia-notes" hidden aria-labelledby="sia-notes-title">
        <h3 id="sia-notes-title" tabindex="-1">Hinweise zu SIA</h3>
        <h4>Eine erste Orientierung</h4><p>SIA ist der KI-Assistent von SLS Immobilienpartner. Die Antworten dienen der allgemeinen Information rund um Immobilien. Sie können fehlerhaft, unvollständig oder nicht aktuell sein.</p>
        <h4>Ihre persönliche Situation</h4><p>SIA ersetzt keine individuelle fachliche, rechtliche oder steuerliche Beratung. Lassen Sie wichtige Entscheidungen und Angaben durch eine geeignete Fachperson prüfen. Unser Team unterstützt Sie bei Ihrem nächsten Schritt rund um Ihre Immobilie.</p>
        <h4>Ihre Frage und Ihre Daten</h4><p>Zum Absenden einer Frage sind keine Kontaktdaten erforderlich. Geben Sie bitte keine Namen, Kontaktdaten oder andere personenbezogene oder vertrauliche Informationen ein. Ihre Frage wird über den SLS-Fragedienst zur Verarbeitung an OpenAI übermittelt. Wenn die KI-Antwort nicht verfügbar ist, können Informationen aus der Wissensbasis von SLS Immobilienpartner angezeigt werden.</p>
        <p>Weitere Informationen finden Sie in unserer <a href="https://sls.de/datenschutz/" target="_blank" rel="noopener">Datenschutzerklärung</a>.</p>
        <button class="notes-back" type="button">Zurück zu SIA</button>
      </section>
    </dialog>`;
  document.body.append(host);
  const $ = s => root.querySelector(s);
  const dialog = $('dialog'), launch = $('.launch'), field = $('textarea'), status = $('.status');
  const quickbar = $('.quickbar');
  let compactTimer = 0;
  const compactQuickbar = () => {
    quickbar?.classList.add('is-compact');
    try { sessionStorage.setItem('sls-sia-quickbar-seen', '1'); } catch {}
  };
  try {
    if (sessionStorage.getItem('sls-sia-quickbar-seen') === '1') quickbar?.classList.add('is-compact');
    else compactTimer = window.setTimeout(compactQuickbar, 3200);
  } catch {
    compactTimer = window.setTimeout(compactQuickbar, 3200);
  }
  let busy = false;
  let viewportFrame = 0;
  let restorePage = null;
  const mobileLayout = window.matchMedia('(max-width: 600px), (hover: none) and (pointer: coarse)');
  function lockPage() {
    if (restorePage || !mobileLayout.matches) return;
    const { scrollX, scrollY } = window;
    const style = document.body.style;
    const properties = ['position', 'top', 'left', 'width', 'overflow'];
    const saved = properties.map(name => [name, style.getPropertyValue(name), style.getPropertyPriority(name)]);
    // Keep Safari from scrolling the underlying page to centre the focused input.
    style.setProperty('position', 'fixed');
    style.setProperty('top', `${-scrollY}px`);
    style.setProperty('left', `${-scrollX}px`);
    style.setProperty('width', '100%');
    style.setProperty('overflow', 'hidden');
    restorePage = () => {
      for (const [name, value, priority] of saved) {
        if (value) style.setProperty(name, value, priority);
        else style.removeProperty(name);
      }
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
      restorePage = null;
    };
  }
  // Mobile keyboards resize/pan the visual viewport independently of the page.
  function updateViewport() {
    const viewport = window.visualViewport;
    dialog.style.setProperty('--sia-viewport-height', `${viewport?.height ?? window.innerHeight}px`);
    dialog.style.setProperty('--sia-viewport-top', `${viewport?.offsetTop ?? 0}px`);
    dialog.toggleAttribute('data-compact', (viewport?.height ?? window.innerHeight) < 500);
    dialog.toggleAttribute('data-keyboard-open', root.activeElement === field && !!viewport && window.innerHeight - viewport.height > 120);
    dialog.scrollTop = 0;
  }
  function scheduleViewportUpdate() {
    if (!dialog.open || viewportFrame) return;
    viewportFrame = window.requestAnimationFrame(() => {
      viewportFrame = 0;
      if (dialog.open) updateViewport();
    });
  }
  const openSia = () => {
    window.clearTimeout(compactTimer);
    compactQuickbar();
    if (dialog.open) return;
    lockPage();
    updateViewport();
    dialog.showModal();
    launch.setAttribute('aria-expanded', 'true');
    $('.close').focus({ preventScroll: true });
    window.visualViewport?.addEventListener('resize', scheduleViewportUpdate);
    window.visualViewport?.addEventListener('scroll', scheduleViewportUpdate);
    window.addEventListener('resize', scheduleViewportUpdate);
  };
  launch.addEventListener('click', openSia);
  window.addEventListener('sls:sia-open', openSia);
  if (window.__slsSiaOpenRequested) {
    window.__slsSiaOpenRequested = false;
    openSia();
  }
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') dialog.setAttribute('data-keyboard-navigation', '');
  });
  dialog.addEventListener('pointerdown', () => dialog.removeAttribute('data-keyboard-navigation'));
  dialog.addEventListener('focusin', scheduleViewportUpdate);
  dialog.addEventListener('focusout', scheduleViewportUpdate);
  $('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    window.visualViewport?.removeEventListener('resize', scheduleViewportUpdate);
    window.visualViewport?.removeEventListener('scroll', scheduleViewportUpdate);
    window.removeEventListener('resize', scheduleViewportUpdate);
    window.cancelAnimationFrame(viewportFrame);
    viewportFrame = 0;
    restorePage?.();
    launch.setAttribute('aria-expanded', 'false');
    launch.focus({ preventScroll: true });
  });
  const topicQuestions = [
    'Wie bereite ich den Verkauf meiner Immobilie vor?',
    'Wie wird der Wert meiner Immobilie ermittelt?',
    'Wie läuft der Immobilienkauf bei SLS Immobilienpartner ab?',
    'Was sollte ich bei der Finanzierung einer Immobilie beachten?',
    'Was zeichnet SLS Immobilienpartner aus?'
  ];
  let notesScroll = 0;
  function showNotes(show, restoreFocus = true) {
    if (show) notesScroll = $('.content').scrollTop;
    $('.notes').hidden = !show;
    $('.content').hidden = show;
    $('form').hidden = show;
    $('.notes-open').setAttribute('aria-expanded', String(show));
    if (show) $('#sia-notes-title').focus({ preventScroll: true });
    else {
      $('.content').scrollTop = notesScroll;
      if (restoreFocus) $('.notes-open').focus({ preventScroll: true });
    }
    scheduleViewportUpdate();
  }
  $('.notes-open').addEventListener('click', () => showNotes(true));
  $('.notes-back').addEventListener('click', () => showNotes(false));
  dialog.addEventListener('close', () => showNotes(false, false));
  root.querySelectorAll('.suggestions button').forEach((button, index) => button.addEventListener('click', () => {
    field.value = topicQuestions[index];
    status.textContent = 'Ihre Frage ist vorbereitet. Sie können sie bearbeiten oder direkt senden.';
  }));
  let sourceTrigger = null, sourceScroll = 0;
  function showSource(source, trigger) {
    sourceTrigger = trigger;
    sourceScroll = $('.content').scrollTop;
    $('#sia-source-title').textContent = `[${source.number ?? ''}] ${source.title || 'Quelle'}`;
    $('.source-meta').textContent = source.snapshotDate ? `Stand der Grundlage: ${source.snapshotDate}` : 'Grundlage aus der SIA-Wissensbasis';
    $('.source-text').textContent = typeof source.text === 'string' && source.text.trim() ? source.text : 'Zu dieser Grundlage ist derzeit kein Quellentext verfügbar.';
    $('.source-view').hidden = false;
    $('.source-view').scrollTop = 0;
    $('.content').hidden = true;
    $('form').hidden = true;
    $('#sia-source-title').focus({ preventScroll: true });
    scheduleViewportUpdate();
  }
  function hideSource(restoreFocus = true) {
    if (!sourceTrigger) return;
    $('.source-view').hidden = true;
    $('.content').hidden = false;
    $('form').hidden = false;
    $('.content').scrollTop = sourceScroll;
    if (restoreFocus) sourceTrigger.focus({ preventScroll: true });
    sourceTrigger = null;
    scheduleViewportUpdate();
  }
  $('.source-back').addEventListener('click', () => hideSource());
  dialog.addEventListener('close', () => hideSource(false));
  function sourceCard(source) {
    const box = document.createElement('div'); box.className = 'source';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'source-open';
    button.textContent = `[${source.number ?? ''}] ${source.title || 'Quelle'}`;
    button.addEventListener('click', () => showSource(source, button));
    box.append(button);
    return box;
  }
  $('form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const question = field.value.trim();
    if (question.length < 3 || question.length > 1200) { status.textContent = 'Bitte 3 bis 1200 Zeichen eingeben.'; field.focus(); return; }
    busy = true; $('.send').disabled = true; $('.result').hidden = true; $('.intro').hidden = true;
    status.textContent = 'SIA bereitet Ihre Antwort vor…'; $('.content').setAttribute('aria-busy', 'true');
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 48000);
    try {
      const response = await fetch('/api/sia-ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error('Unavailable');
      if (!['OpenAI', 'Wissensbasis von SLS Immobilienpartner'].includes(data.provider) || typeof data.answer !== 'string' || !Array.isArray(data.sources)) throw new Error('Invalid response');
      $('.question').textContent = question;
      $('.origin').textContent = data.provider === 'OpenAI' ? 'KI-Antwort · OpenAI' : 'Antwort aus der Wissensbasis von SLS Immobilienpartner';
      $('.answer').textContent = data.answer;
      $('.source-list').replaceChildren(...data.sources.filter(s => s && typeof s === 'object').map(sourceCard));
      $('.sources').hidden = !data.sources.length; $('.sources').open = false;
      $('.result').hidden = false;
      status.textContent = data.provider === 'OpenAI' ? 'Ihre Antwort ist da.' : 'Die KI-Antwort ist derzeit nicht verfügbar. Hier finden Sie Informationen aus der Wissensbasis.';
      if (field.value.trim() === question) field.value = '';
      if (dialog.open) {
        // An arriving answer must not dismiss the keyboard while someone is typing.
        if (root.activeElement !== field) $('.result').focus({ preventScroll: true });
        $('.content').scrollTop = 0;
      }
    } catch {
      status.textContent = 'SIA konnte gerade keine Antwort abrufen. Bitte versuchen Sie es erneut oder wenden Sie sich persönlich an Ihren SLS Immobilienpartner.';
    } finally {
      clearTimeout(timeout); busy = false; $('.send').disabled = false; $('.content').removeAttribute('aria-busy');
    }
  });
})();

/* SIA is enabled only on the approved site or in a preview. */
(async () => {
  if (document.querySelector('sls-sia')) return;
  let dailyLimit = null;
  let dialogueEnabled = false;
  try {
    const config = await fetch('/api/sia-config', { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
    if (!config?.enabled) return;
    dailyLimit = config.dailyLimit;
    dialogueEnabled = config.dialogueEnabled === true;
  } catch { return; }

  let propertyContext = null;
  try {
    const bootstrap = document.querySelector('#pp-server-data');
    const data = bootstrap ? JSON.parse(bootstrap.textContent || '{}') : null;
    const property = data?.status === 200 && data?.property && /^\d+$/.test(String(data.property.id || '')) ? data.property : null;
    if (property) propertyContext = {
      id: String(property.id),
      title: String(property.title || 'Diese Immobilie'),
      hasCourtage: Boolean(property.courtage || property.courtageNote),
      hasEnergy: Boolean(property.energy && Object.values(property.energy).some(value => value !== null && value !== undefined && value !== '')),
      hasFeatures: Boolean(property.features || (Array.isArray(property.amenities) && property.amenities.length))
    };
  } catch { /* Keep general SIA if page context cannot be read. */ }

  const pageContext = propertyContext
    ? { type: 'property', propertyId: propertyContext.id }
    : {
        type: 'page',
        path: location.pathname.slice(0, 180),
        title: document.title.slice(0, 180),
        heading: (document.querySelector('main h1')?.textContent || '').trim().slice(0, 180)
      };

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
        <details class="conversation" hidden><summary>Bisheriges Gespräch</summary><div class="conversation-list"></div></details>
        <section class="result" hidden tabindex="-1" aria-label="Antwort von SIA"><p class="question"></p><span class="origin"></span><div class="answer"></div><details class="sources"><summary>Grundlage dieser Antwort</summary><div class="source-list"></div></details></section>
        <div class="contact"><a href="/kontakt/">Mit unserem Team sprechen</a></div>
      </div>
      <form><label for="sia-question">Ihre Frage an SIA</label><div class="input-row"><textarea id="sia-question" name="question" rows="2" minlength="3" maxlength="1200" required placeholder="Ihre Frage an SIA …" aria-describedby="sia-privacy"></textarea><button class="send" type="submit">Senden</button></div><p class="privacy" id="sia-privacy">SIA ist eine KI und kann Fehler machen. Bitte keine personenbezogenen oder vertraulichen Angaben eingeben. Fragen${dialogueEnabled ? ' und der kurze Gesprächskontext' : ''} werden zur Verarbeitung an OpenAI übermittelt.</p><p class="privacy-compact">KI kann Fehler machen. Keine persönlichen Daten eingeben. Verarbeitung durch OpenAI.</p><button class="notes-open" type="button" aria-controls="sia-notes" aria-expanded="false">Hinweise zu KI und Datenschutz</button><button class="conversation-reset" type="button" hidden>Neues Gespräch</button></form>
      <section class="source-view" hidden aria-labelledby="sia-source-title"><h3 id="sia-source-title" tabindex="-1"></h3><p class="source-meta"></p><div class="source-text"></div><button class="source-back" type="button">Zurück zur Antwort</button></section>
      <section class="notes" id="sia-notes" hidden aria-labelledby="sia-notes-title">
        <h3 id="sia-notes-title" tabindex="-1">Hinweise zu SIA</h3>
        <h4>Eine erste Orientierung</h4><p>SIA ist der KI-Assistent von SLS Immobilienpartner. Die Antworten dienen der allgemeinen Information rund um Immobilien. Sie können fehlerhaft, unvollständig oder nicht aktuell sein.</p>
        <h4>Ihre persönliche Situation</h4><p>SIA ersetzt keine individuelle fachliche, rechtliche oder steuerliche Beratung. Lassen Sie wichtige Entscheidungen und Angaben durch eine geeignete Fachperson prüfen. Unser Team unterstützt Sie bei Ihrem nächsten Schritt rund um Ihre Immobilie.</p>
        <h4>Ihre Frage und Ihre Daten</h4><p>Zum Absenden einer Frage sind keine Kontaktdaten erforderlich. Geben Sie bitte keine Namen, Kontaktdaten oder andere personenbezogene oder vertrauliche Informationen ein. Ihre Frage wird über den SLS-Fragedienst zur Verarbeitung an OpenAI übermittelt. Wenn die KI-Antwort nicht verfügbar ist, können Informationen aus der Wissensbasis von SLS Immobilienpartner angezeigt werden.</p>
        ${dialogueEnabled ? '<h4>Ihr Gespräch</h4><p>SIA kann eine kurze Rückfrage stellen, wenn eine wesentliche Angabe fehlt. Die letzten drei Frage-Antwort-Paare werden zur Einordnung Ihrer nächsten Nachricht an OpenAI übermittelt. Sie bleiben nur im geöffneten Widget gespeichert. Mit „Neues Gespräch“ oder durch Neuladen der Seite löschen Sie diesen Kontext.</p>' : ''}
        ${dailyLimit === 10 ? `<h4>Ihr Tageskontingent</h4><p>Pro Browser sind täglich zehn Antworten möglich. Technische Fehler${dialogueEnabled ? ' und reine Klärungsfragen' : ''} zählen nicht mit. Für den Zähler verwenden wir ein anonymes Cookie, das bei Nutzung auf 24 Stunden verlängert wird. Es enthält keine Fragen oder Kontaktdaten. Das Kontingent wird um Mitternacht deutscher Zeit zurückgesetzt.</p>` : ''}
        <p>Weitere Informationen finden Sie in unserer <a href="https://sls.de/datenschutz/" target="_blank" rel="noopener">Datenschutzerklärung</a>.</p>
        <button class="notes-back" type="button">Zurück zu SIA</button>
      </section>
    </dialog>`;
  document.body.append(host);
  const $ = s => root.querySelector(s);

  let topicQuestions = [
    'Wie bereite ich den Verkauf meiner Immobilie vor?',
    'Wie wird der Wert meiner Immobilie ermittelt?',
    'Wie läuft der Immobilienkauf bei SLS Immobilienpartner ab?',
    'Was sollte ich bei der Finanzierung einer Immobilie beachten?',
    'Was zeichnet SLS Immobilienpartner aus?'
  ];
  if (propertyContext) {
    $('.intro h3').textContent = 'Fragen zu dieser Immobilie?';
    $('.intro > p').textContent = 'Ich beantworte Fragen auf Grundlage der veröffentlichten Objektdaten.';
    const propertyQuestions = [
      ['Eckdaten', 'Was sind die wichtigsten Eckdaten dieser Immobilie?'],
      propertyContext.hasCourtage
        ? ['Käuferprovision', 'Wie hoch ist die Käuferprovision bei dieser Immobilie?']
        : ['Preis & Kosten', 'Welche Preis- und Kostenangaben sind zu dieser Immobilie veröffentlicht?'],
      propertyContext.hasEnergy
        ? ['Energieausweis', 'Welche Angaben zum Energieausweis gibt es bei dieser Immobilie?']
        : ['Baujahr & Zustand', 'Was ist zu Baujahr und Zustand dieser Immobilie veröffentlicht?'],
      propertyContext.hasFeatures
        ? ['Ausstattung', 'Welche Ausstattung und Merkmale hat diese Immobilie?']
        : ['Beschreibung', 'Was ist in der Objektbeschreibung zu dieser Immobilie wichtig?'],
      ['Ansprechpartner', 'Wer ist Ansprechpartner für diese Immobilie und wie kann ich sie anfragen?']
    ];
    topicQuestions = propertyQuestions.map(([, question]) => question);
    root.querySelectorAll('.suggestions button').forEach((button, index) => {
      button.textContent = propertyQuestions[index]?.[0] || button.textContent;
      button.classList.toggle('why-sls', index === propertyQuestions.length - 1);
    });
    $('.contact a').textContent = 'Diese Immobilie anfragen';
    $('.contact a').href = '#pp-inquiry';
  } else {
    const path = location.pathname;
    if (path.startsWith('/verkaufen')) {
      $('.intro h3').textContent = 'Fragen zu Ihrem Immobilienverkauf?';
      $('.intro > p').textContent = 'Ich helfe Ihnen bei Bewertung, Vorbereitung und Verkaufsprozess.';
    } else if (/finanz/i.test(path)) {
      $('.intro h3').textContent = 'Fragen zur Finanzierung?';
      $('.intro > p').textContent = 'Ich ordne wichtige Begriffe und nächste Schritte für Sie ein.';
    } else if (path.startsWith('/immobilien')) {
      $('.intro h3').textContent = 'Fragen zum Immobilienkauf?';
      $('.intro > p').textContent = 'Ich helfe Ihnen bei Suche, Auswahl und Kaufprozess.';
    }
  }
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
  let conversation = [];
  function resetConversation() {
    if (busy) return;
    conversation = []; field.value = ''; field.minLength = 3;
    $('.conversation').hidden = true; $('.conversation-list').replaceChildren(); $('.conversation-reset').hidden = true;
    $('.result').hidden = true; $('.intro').hidden = false;
    $('form label').textContent = 'Ihre Frage an SIA'; field.placeholder = 'Ihre Frage an SIA …';
    status.textContent = 'Ein neues Gespräch beginnt. Ihr Tageskontingent bleibt unverändert.';
  }
  $('.conversation-reset').addEventListener('click', resetConversation);
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

  if (propertyContext) {
    $('.contact a').addEventListener('click', event => {
      event.preventDefault();
      const target = document.querySelector('#pp-inquiry');
      if (!target) return;
      if (dialog.open) dialog.close();
      // Wait until the mobile page lock has been fully restored, then move to the form.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try { history.replaceState(null, '', '#pp-inquiry'); } catch {}
      }));
    });
  }
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
  function renderAnswer(data) {
    const box = $('.answer');
    if (!Array.isArray(data.citations) || !data.citations.length) { box.textContent = data.answer; return; }
    const fragments = []; let cursor = 0;
    for (const citation of data.citations) {
      const source = data.sources.find(s => s.number === citation.number);
      if (!source || !Number.isInteger(citation.start) || !Number.isInteger(citation.end) || citation.start < cursor || citation.end <= citation.start || citation.end > data.answer.length) { box.textContent = data.answer; return; }
      const text = document.createElement('span'); text.textContent = data.answer.slice(cursor, citation.start); fragments.push(text);
      const button = document.createElement('button'); button.className = 'inline-source'; button.type = 'button'; button.textContent = `[${citation.number}]`;
      button.setAttribute('aria-label', `Quelle ${citation.number}: ${source.title || 'Grundlage dieser Antwort'}`);
      button.addEventListener('click', () => showSource(source, button)); fragments.push(button); cursor = citation.end;
    }
    const tail = document.createElement('span'); tail.textContent = data.answer.slice(cursor); fragments.push(tail); box.replaceChildren(...fragments);
  }
  $('form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const question = field.value.trim();
    if (question.length < (dialogueEnabled && conversation.length ? 1 : 3) || question.length > 1200) { status.textContent = 'Bitte eine Frage mit höchstens 1200 Zeichen eingeben.'; field.focus(); return; }
    busy = true; $('.send').disabled = true; $('.result').hidden = true; $('.intro').hidden = true;
    status.textContent = 'SIA bereitet Ihre Antwort vor…'; $('.content').setAttribute('aria-busy', 'true');
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch('/api/sia-ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, pageContext, ...(dialogueEnabled ? { history: conversation } : {}) }), signal: controller.signal });
      const data = await response.json();
      if (response.status === 429 && ['daily_limit', 'pending_limit', 'slow_down'].includes(data.code)) {
        status.textContent = data.code === 'daily_limit'
          ? 'Sie haben heute zehn Antworten von SIA erhalten. Morgen können Sie wieder Fragen stellen. Unser Team ist weiterhin persönlich für Sie da.'
          : 'Bitte warten Sie einen Moment, bevor Sie die nächste Frage senden.';
        return;
      }
      if (!response.ok) throw new Error('Unavailable');
      if (!['OpenAI', 'Wissensbasis von SLS Immobilienpartner'].includes(data.provider) || typeof data.answer !== 'string' || !Array.isArray(data.sources)) throw new Error('Invalid response');
      $('.question').textContent = question;
      $('.origin').textContent = data.provider === 'OpenAI' ? 'KI-Antwort · OpenAI' : 'Antwort aus der Wissensbasis von SLS Immobilienpartner';
      renderAnswer(data);
      $('.source-list').replaceChildren(...data.sources.filter(s => s && typeof s === 'object').map(sourceCard));
      $('.sources').hidden = !data.sources.length; $('.sources').open = false;
      $('.result').hidden = false;
      status.textContent = data.kind === 'clarification' ? 'Eine kurze Rückfrage hilft SIA, Ihr Anliegen einzuordnen. Sie zählt nicht zum Tageskontingent.'
        : data.kind === 'offtopic' ? 'SIA unterstützt Sie bei Immobilienfragen.'
        : data.reason === 'unanswered' ? 'Für diese Frage fehlt derzeit eine ausreichend belegte Grundlage.'
        : data.provider === 'OpenAI' ? 'Ihre Antwort ist da.'
        : data.reason === 'general_definition' ? 'Hier finden Sie eine belegte Erklärung aus unserer Wissensbasis.'
        : ['invalid_sources', 'verification_failed'].includes(data.reason) ? (data.sources.length ? 'Hier finden Sie belegte Informationen aus unserer Wissensbasis.' : 'Zu dieser Frage konnte SIA keine ausreichend belegte Antwort erstellen.')
        : 'Die KI-Antwort ist derzeit nicht verfügbar. Hier finden Sie Informationen aus der Wissensbasis.';
      if (Number.isInteger(data.quota?.remaining) && data.quota.remaining >= 0 && data.quota.remaining <= 3) {
        status.textContent += data.quota.remaining === 0 ? ' Ihr Tageslimit ist erreicht. Morgen sind wieder Fragen möglich.'
          : ` Heute ${data.quota.remaining === 1 ? 'ist noch eine weitere Antwort' : `sind noch ${data.quota.remaining} weitere Antworten`} möglich.`;
      }
      if (field.value.trim() === question) field.value = '';
      if (dialogueEnabled && !['unanswered'].includes(data.reason) && data.kind !== 'offtopic') {
        $('.conversation-list').replaceChildren(...conversation.map(turn => { const p = document.createElement('p'); p.textContent = `${turn.role === 'user' ? 'Sie' : 'SIA'}: ${turn.content}`; return p; }));
        $('.conversation').hidden = !conversation.length; $('.conversation').open = false;
        conversation = [...conversation, { role: 'user', content: question }, { role: 'assistant', content: data.answer.slice(0,3000), ...(data.kind === 'clarification' ? { kind: 'clarification' } : {}) }].slice(-6);
        $('.conversation-reset').hidden = false; field.minLength = 1;
        $('form label').textContent = data.kind === 'clarification' ? 'Ihre Antwort an SIA' : 'Ihre Frage an SIA';
        field.placeholder = data.kind === 'clarification' ? 'Ihre Antwort auf die Rückfrage …' : 'Ihre nächste Frage an SIA …';
      }
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

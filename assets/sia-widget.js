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
    <button class="launch" type="button" aria-haspopup="dialog" aria-expanded="false"><strong>SIA</strong><span>fragen</span></button>
    <dialog aria-labelledby="sia-title">
      <header><span class="brand" aria-hidden="true">SIA</span><div class="identity"><h2 id="sia-title"><b>S</b>LS <b>I</b>mmobilien <b>A</b>ssistenz</h2><span class="sub">KI-ASSISTENZ</span></div><button class="close" type="button" aria-label="SIA schließen">×</button></header>
      <div class="content">
        <section class="intro"><h3>Ein guter Anfang für Ihren nächsten Schritt.</h3><p>Ich bin SIA, die KI-Assistenz von SLS Immobilienpartner. Hier finden Sie Orientierung rund um Verkauf, Kauf und Ihre Immobilie.</p><div class="suggestions"><button type="button">Verkauf und Wohnungssuche koordinieren</button><button type="button">Kosten bei SLS Immobilienpartner</button></div></section>
        <p class="status" role="status" aria-live="polite"></p>
        <section class="result" hidden tabindex="-1" aria-label="Antwort von SIA"><p class="question"></p><span class="origin"></span><div class="answer"></div><details class="sources"><summary>Verwendete Quellen</summary><div class="source-list"></div></details></section>
        <p class="disclaimer">SIA ist eine KI und kann Fehler machen. Die Antworten dienen der Orientierung und ersetzen keine individuelle Beratung. Besprechen Sie Ihre Situation und die nächsten Schritte gerne persönlich mit Ihrem SLS Immobilienpartner.</p>
        <div class="contact"><a href="tel:+4923697428020">Persönlich anrufen ↗</a><a href="mailto:service@sls.de">E-Mail schreiben ↗</a></div>
      </div>
      <form><label for="sia-question">Ihre Nachricht an SIA</label><div class="input-row"><textarea id="sia-question" name="question" rows="2" minlength="3" maxlength="1200" required placeholder="Zum Beispiel: Haus verkaufen und zur Miete wohnen" aria-describedby="sia-privacy"></textarea><button class="send" type="submit">Senden</button></div><p class="privacy" id="sia-privacy">Ihre Frage wird zur Verarbeitung an OpenAI übermittelt. Bitte keine personenbezogenen oder vertraulichen Angaben eingeben. <a href="/datenschutz/" target="_blank" rel="noopener">Datenschutz ↗</a></p></form>
    </dialog>`;
  document.body.append(host);
  const $ = s => root.querySelector(s);
  const dialog = $('dialog'), launch = $('.launch'), field = $('textarea'), status = $('.status');
  let busy = false;
  launch.addEventListener('click', () => { dialog.showModal(); launch.setAttribute('aria-expanded', 'true'); field.focus(); });
  $('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { launch.setAttribute('aria-expanded', 'false'); launch.focus(); });
  root.querySelectorAll('.suggestions button').forEach((button, index) => button.addEventListener('click', () => {
    field.value = index === 0 ? 'Kann ich mein Haus verkaufen und gleichzeitig eine Mietwohnung suchen?' : 'Welche Kosten entstehen bei SLS Immobilienpartner?';
    field.focus();
  }));
  function sourceCard(source) {
    const box = document.createElement('div'); box.className = 'source';
    const title = document.createElement('strong'); title.textContent = `[${source.number ?? ''}] ${source.title || 'Quelle'}`; box.append(title);
    if (typeof source.text === 'string') { const text = document.createElement('p'); text.textContent = source.text; box.append(text); }
    if (typeof source.url === 'string' && /^\/quellen\/[a-z0-9-]+\.html$/.test(source.url)) {
      const link = document.createElement('a'); link.textContent = 'Quelle öffnen ↗'; link.href = 'https://frag-sls.vercel.app' + source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; box.append(link);
    }
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
      field.value = '';
      if (dialog.open) { $('.result').focus({ preventScroll: true }); $('.content').scrollTop = 0; }
    } catch {
      status.textContent = 'SIA konnte gerade keine Antwort abrufen. Bitte versuchen Sie es erneut oder wenden Sie sich persönlich an Ihren SLS Immobilienpartner.';
    } finally {
      clearTimeout(timeout); busy = false; $('.send').disabled = false; $('.content').removeAttribute('aria-busy');
    }
  });
})();

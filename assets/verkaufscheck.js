(() => {
  const root = document.querySelector('.sales-check-page');
  if (!root) return;
  const typeButtons = [...document.querySelectorAll('[data-property-type]')];
  const items = [...document.querySelectorAll('.sales-check-item')];
  const progressBar = document.querySelector('[data-progress-bar]');
  const progressTitle = document.querySelector('[data-progress-title]');
  const progressCopy = document.querySelector('[data-progress-copy]');
  const resultTitle = document.querySelector('[data-result-title]');
  const resultCopy = document.querySelector('[data-result-copy]');
  const counts = {
    ready: document.querySelector('[data-count-ready]'),
    open: document.querySelector('[data-count-open]'),
    unsure: document.querySelector('[data-count-unsure]')
  };
  let activeType = 'house';
  const key = 'sls-sales-check-v1';
  let state = {};
  try { state = JSON.parse(sessionStorage.getItem(key) || '{}') || {}; } catch { state = {}; }

  items.forEach((item,index) => {
    item.dataset.checkId = 'item-' + index;
    const saved = state[item.dataset.checkId];
    if (saved) item.querySelectorAll('[data-state]').forEach(button => button.dataset.selected = String(button.dataset.state === saved));
  });

  const visibleItems = () => items.filter(item => !item.hidden);
  const save = () => { try { sessionStorage.setItem(key, JSON.stringify(state)); } catch {} };
  const update = () => {
    const visible = visibleItems();
    const summary = {ready:0,open:0,unsure:0,answered:0};
    visible.forEach(item => {
      const selected = item.querySelector('[data-selected="true"]');
      if (!selected) return;
      summary.answered++;
      summary[selected.dataset.state]++;
    });
    const percent = visible.length ? Math.round(summary.answered / visible.length * 100) : 0;
    progressBar.style.width = percent + '%';
    progressTitle.textContent = summary.answered ? summary.answered + ' von ' + visible.length + ' Punkten eingeordnet' : 'Noch nichts markiert';
    progressCopy.textContent = summary.answered === visible.length ? 'Sie haben alle sichtbaren Punkte geprüft.' : 'Gehen Sie die Punkte in Ruhe durch.';
    Object.entries(counts).forEach(([name,node]) => node.textContent = summary[name]);
    if (!summary.answered) {
      resultTitle.textContent = 'Sie können jetzt mit dem Check beginnen.';
      resultCopy.textContent = 'Markieren Sie die Punkte, die bereits geklärt sind, fehlen oder bei denen Sie unsicher sind.';
    } else if (summary.open + summary.unsure === 0 && summary.answered === visible.length) {
      resultTitle.textContent = 'Die wichtigsten Punkte wirken bereits gut vorbereitet.';
      resultCopy.textContent = 'Vor der Vermarktung sollten die Angaben dennoch gemeinsam auf Aktualität und Vollständigkeit geprüft werden.';
    } else {
      resultTitle.textContent = 'Offene Punkte früh zu erkennen, macht den Verkauf planbarer.';
      resultCopy.textContent = 'Aktuell sind ' + (summary.open + summary.unsure) + ' Punkte offen oder noch nicht eindeutig geklärt. Genau diese Themen lassen sich vor dem Verkaufsstart strukturiert angehen.';
    }
  };

  const applyType = type => {
    activeType = type;
    typeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.propertyType === type)));
    items.forEach(item => { item.hidden = !item.dataset.types.split(' ').includes(type); });
    update();
  };

  typeButtons.forEach(button => button.addEventListener('click', () => applyType(button.dataset.propertyType)));
  document.querySelectorAll('.sales-check-status').forEach(group => group.addEventListener('click', event => {
    const button = event.target.closest('[data-state]');
    if (!button) return;
    const item = group.closest('.sales-check-item');
    const same = button.dataset.selected === 'true';
    group.querySelectorAll('[data-state]').forEach(candidate => candidate.dataset.selected = 'false');
    if (same) delete state[item.dataset.checkId];
    else {
      button.dataset.selected = 'true';
      state[item.dataset.checkId] = button.dataset.state;
    }
    save();
    update();
  }));

  applyType(activeType);
})();

// Keep the latest contribution visible; shuffle the remaining choices per visit.
export function chooseArticleIds(ids, random = Math.random) {
  const shuffle = values => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  if (!ids.length) return [];
  return shuffle([ids[0], ...shuffle(ids.slice(1)).slice(0, 2)]);
}

if (typeof document !== 'undefined') {
  const grid = document.querySelector('[data-home-magazine-grid]');
  if (grid) {
    const cards = [...grid.querySelectorAll('[data-magazine-id]')];
    const ids = cards.map(card => card.dataset.magazineId);
    const signature = JSON.stringify(ids);
    let selected;
    try {
      const saved = JSON.parse(sessionStorage.getItem('sls-home-magazine'));
      if (saved?.signature === signature && Array.isArray(saved.ids) &&
          saved.ids.length === Math.min(3, ids.length) &&
          new Set(saved.ids).size === saved.ids.length &&
          saved.ids.every(id => ids.includes(id)) && saved.ids.includes(ids[0])) {
        selected = saved.ids;
      }
    } catch { /* Storage is optional; the magazine works without it. */ }
    selected ??= chooseArticleIds(ids);
    try {
      sessionStorage.setItem('sls-home-magazine', JSON.stringify({ signature, ids: selected }));
    } catch { /* Browsers can disable storage. */ }
    cards.forEach(card => { card.hidden = !selected.includes(card.dataset.magazineId); });
    selected.forEach(id => grid.append(cards.find(card => card.dataset.magazineId === id)));
  }
}

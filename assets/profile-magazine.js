import { chooseArticleIds } from './home-magazine.js';

for (const section of document.querySelectorAll('[data-profile-magazine]')) {
  const track = section.querySelector('[data-profile-magazine-track]');
  const pool = [...track.querySelectorAll('[data-magazine-id]')];
  const ids = pool.map(card => card.dataset.magazineId);
  if (!ids.length) continue;
  const signature = JSON.stringify(ids);
  const key = `sls-profile-magazine-${section.dataset.profileMagazine}`;
  let selected;
  try {
    const saved = JSON.parse(sessionStorage.getItem(key));
    if (saved?.signature === signature && Array.isArray(saved.ids) &&
        saved.ids.length === Math.min(3, ids.length) && new Set(saved.ids).size === saved.ids.length &&
        saved.ids.every(id => ids.includes(id)) && saved.ids.includes(ids[0])) selected = saved.ids;
  } catch { /* The selection also works without browser storage. */ }
  selected ??= chooseArticleIds(ids);
  try { sessionStorage.setItem(key, JSON.stringify({ signature, ids: selected })); } catch { /* Optional storage. */ }
  pool.forEach(card => { card.hidden = !selected.includes(card.dataset.magazineId); });
  const cards = selected.map(id => pool.find(card => card.dataset.magazineId === id));
  cards.forEach((card, index) => {
    track.append(card);
    card.setAttribute('role', 'group');
    card.setAttribute('aria-roledescription', 'Beitrag');
    card.setAttribute('aria-label', `${index + 1} von ${cards.length}`);
  });
  const controls = section.querySelector('[data-profile-magazine-controls]');
  const dots = section.querySelector('[data-magazine-dots]');
  const position = section.querySelector('[data-magazine-position]');
  let active = 0;
  const buttons = cards.map((card, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Beitrag ${index + 1}: ${card.querySelector('h3').textContent}`);
    button.addEventListener('click', () => go(index));
    dots.append(button);
    return button;
  });
  function update() {
    cards.forEach((card, index) => {
      const current = index === active;
      card.inert = !current;
      card.setAttribute('aria-current', String(current));
      buttons[index].setAttribute('aria-current', String(current));
    });
    position.textContent = `${active + 1} von ${cards.length}`;
  }
  function go(index) {
    const next = (index + cards.length) % cards.length;
    track.scrollTo({ left: next * track.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  controls.hidden = cards.length < 2;
  section.querySelector('[data-magazine-prev]').addEventListener('click', () => go(active - 1));
  section.querySelector('[data-magazine-next]').addEventListener('click', () => go(active + 1));
  track.addEventListener('keydown', event => {
    if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    go(event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : active + (event.key === 'ArrowRight' ? 1 : -1));
  });
  let scheduled = false;
  track.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const index = Math.min(cards.length - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth)));
      if (index !== active) { active = index; update(); }
    });
  }, { passive: true });
  let width = track.clientWidth;
  new ResizeObserver(() => {
    if (width === track.clientWidth) return;
    width = track.clientWidth;
    track.scrollTo({ left: active * width, behavior: 'instant' });
  }).observe(track);
  track.scrollTo({ left: 0, behavior: 'instant' });
  update();
}

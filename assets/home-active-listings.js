import {objectPath} from './property-seo.mjs';

(() => {
  const section = document.querySelector('[data-home-active-listings]');
  if (!section) return;

  const track = section.querySelector('[data-home-active-track]');
  const previous = section.querySelector('[data-home-active-prev]');
  const next = section.querySelector('[data-home-active-next]');
  const controls = section.querySelector('[data-home-active-controls]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let loaded = false;
  let realCount = 0;
  let cloneCount = 0;
  let scrollTimer;

  const euro = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
  const number = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

  const card = (item, clone = false) => {
    const link = document.createElement('a');
    link.className = 'home-active-card';
    link.href = objectPath(item);
    link.setAttribute('aria-label', `${item.title} in ${item.city} ansehen`);
    if (clone) {
      link.setAttribute('aria-hidden', 'true');
      link.tabIndex = -1;
    }

    const media = document.createElement('div');
    media.className = 'home-active-card-media';
    const image = document.createElement('img');
    image.src = item.images[0];
    image.alt = clone ? '' : `${item.title} in ${item.city}`;
    image.loading = 'lazy';
    image.decoding = 'async';
    media.appendChild(image);

    const body = document.createElement('div');
    body.className = 'home-active-card-content';

    const tag = document.createElement('span');
    tag.className = 'home-active-card-tag';
    tag.textContent = item.type || 'Immobilie · Kauf';

    const heading = document.createElement('h3');
    heading.textContent = item.title;

    const details = document.createElement('p');
    details.className = 'home-active-card-details';
    const facts = [item.city];
    if (item.area) facts.push(`ca. ${number.format(item.area)} m²`);
    if (item.rooms) facts.push(`${number.format(item.rooms)} Zimmer`);
    details.textContent = facts.join(' · ');

    const bottom = document.createElement('div');
    bottom.className = 'home-active-card-bottom';
    const price = document.createElement('strong');
    price.textContent = item.price > 0 ? euro.format(item.price) : 'Preis auf Anfrage';
    const action = document.createElement('span');
    action.className = 'home-active-card-action';
    action.textContent = 'Immobilie ansehen';
    bottom.append(price, action);

    body.append(tag, heading, details, bottom);
    link.append(media, body);
    return link;
  };

  const cards = () => [...track.children];
  const nearestIndex = () => {
    const all = cards();
    const left = track.scrollLeft;
    return all.reduce((best, el, index) =>
      Math.abs(el.offsetLeft - track.offsetLeft - left) <
      Math.abs(all[best].offsetLeft - track.offsetLeft - left) ? index : best, 0);
  };
  const jumpTo = index => {
    const target = track.children[index];
    if (!target) return;
    track.style.scrollSnapType = 'none';
    track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: 'instant' });
    requestAnimationFrame(() => { track.style.scrollSnapType = ''; });
  };
  const normalizeLoop = () => {
    if (realCount < 2) return;
    const index = nearestIndex();
    if (index < cloneCount) jumpTo(index + realCount);
    else if (index >= cloneCount + realCount) jumpTo(index - realCount);
  };
  const move = direction => {
    if (realCount < 2) return;
    const index = nearestIndex();
    const target = track.children[index + direction];
    if (!target) return;
    track.scrollTo({
      left: target.offsetLeft - track.offsetLeft,
      behavior: reducedMotion.matches ? 'instant' : 'smooth'
    });
  };

  const show = async () => {
    if (loaded) return;
    loaded = true;
    try {
      const response = await fetch('/api/propstack-properties?per=12&page=1', {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return;
      const data = await response.json();
      const items = Array.isArray(data.items) ? data.items.filter(item =>
        item && /^\d+$/.test(String(item.id)) && typeof item.title === 'string' &&
        Array.isArray(item.images) && /^https:\/\//.test(item.images[0] || '')) : [];
      if (!items.length) return;

      realCount = items.length;
      cloneCount = Math.min(4, realCount);
      const prefix = items.slice(-cloneCount).map(item => card(item, true));
      const originals = items.map(item => card(item));
      const suffix = items.slice(0, cloneCount).map(item => card(item, true));
      track.replaceChildren(...prefix, ...originals, ...suffix);

      controls.hidden = realCount < 2;
      previous.disabled = realCount < 2;
      next.disabled = realCount < 2;
      section.hidden = false;

      requestAnimationFrame(() => jumpTo(cloneCount));
    } catch {
      // Keep the optional homepage section hidden when the feed is unavailable.
    }
  };

  previous?.addEventListener('click', () => move(-1));
  next?.addEventListener('click', () => move(1));
  track?.addEventListener('scroll', () => {
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(normalizeLoop, 120);
  }, { passive: true });
  window.addEventListener('resize', () => window.setTimeout(normalizeLoop, 0), { passive: true });

  show();
})();
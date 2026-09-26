(() => {
  const section = document.querySelector('[data-home-active-listings]');
  if (!section) return;

  const track = section.querySelector('[data-home-active-track]');
  const previous = section.querySelector('[data-home-active-prev]');
  const next = section.querySelector('[data-home-active-next]');
  const controls = section.querySelector('[data-home-active-controls]');
  let loaded = false;
  let items = [];

  const euro = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
  const number = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

  const card = item => {
    const link = document.createElement('a');
    link.className = 'home-active-card';
    link.href = item.url;
    link.setAttribute('aria-label', `${item.title} in ${item.city} ansehen`);

    const media = document.createElement('div');
    media.className = 'home-active-card-media';
    const image = document.createElement('img');
    image.src = item.image;
    image.alt = `${item.title} in ${item.city}`;
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
    if (item.livingSpace) facts.push(`ca. ${number.format(item.livingSpace)} m²`);
    if (item.rooms) facts.push(`${number.format(item.rooms)} Zimmer`);
    details.textContent = facts.join(' · ');

    const bottom = document.createElement('div');
    bottom.className = 'home-active-card-bottom';
    const price = document.createElement('strong');
    price.textContent = euro.format(item.price);
    const action = document.createElement('span');
    action.className = 'home-active-card-action';
    action.textContent = 'Immobilie ansehen';
    bottom.append(price, action);

    body.append(tag, heading, details, bottom);
    link.append(media, body);
    return link;
  };

  const update = () => {
    const cards = [...track.children];
    if (!cards.length) return;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth - 2);
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= maxScroll;
  };

  const move = direction => {
    const first = track.firstElementChild;
    if (!first) return;
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0') || 0;
    track.scrollBy({ left: direction * (first.getBoundingClientRect().width + gap), behavior: 'smooth' });
  };

  const show = async () => {
    if (loaded) return;
    loaded = true;
    try {
      const response = await fetch('/api/propstack-active-listings', {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return;
      const data = await response.json();
      items = Array.isArray(data.listings) ? data.listings.filter(item =>
        item && typeof item.id === 'string' && typeof item.title === 'string' &&
        typeof item.city === 'string' && typeof item.image === 'string' &&
        typeof item.url === 'string' && Number.isFinite(Number(item.price))) : [];
      if (!items.length) return;

      track.replaceChildren(...items.map(card));
      controls.hidden = items.length < 2;
      section.hidden = false;
      requestAnimationFrame(update);
    } catch {
      // Keep the optional homepage section hidden when the feed is unavailable.
    }
  };

  previous?.addEventListener('click', () => move(-1));
  next?.addEventListener('click', () => move(1));
  track?.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  window.addEventListener('resize', update, { passive: true });

  const trigger = section.previousElementSibling || section;
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      show();
    }, { rootMargin: '900px 0px' });
    observer.observe(trigger);
  } else {
    show();
  }
})();

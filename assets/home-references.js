(() => {
  const section = document.querySelector('[data-home-references]');
  if (!section) return;
  const track = section.querySelector('[data-home-references-track]');
  const previous = section.querySelector('[data-home-references-prev]');
  const next = section.querySelector('[data-home-references-next]');
  let loaded = false;
  let currentIndex = 0;
  const selectionSize = 10;
  const selectionKey = 'sls.home.references.previous';
  const shuffle = items => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  const selectReferences = items => {
    let previous = [];
    try {
      const stored = JSON.parse(sessionStorage.getItem(selectionKey));
      if (Array.isArray(stored)) previous = stored;
    } catch {
      // Selection still works when storage is unavailable.
    }
    const priorIds = new Set(previous);
    const selected = [
      ...shuffle(items.filter(item => !priorIds.has(item.id))),
      ...shuffle(items.filter(item => priorIds.has(item.id)))
    ].slice(0, selectionSize);
    if (selected.length > 1 && selected[0].id === previous[0]) {
      [selected[0], selected[1]] = [selected[1], selected[0]];
    }
    try {
      sessionStorage.setItem(selectionKey, JSON.stringify(selected.map(item => item.id)));
    } catch {
      // Private browsing can block session storage.
    }
    return selected;
  };

  const update = () => {
    const cards = [...track.children];
    if (!cards.length) return;
    const left = track.scrollLeft;
    currentIndex = cards.reduce((best, card, index) =>
      Math.abs(card.offsetLeft - track.offsetLeft - left) <
      Math.abs(cards[best].offsetLeft - track.offsetLeft - left) ? index : best, 0);
    previous.disabled = currentIndex === 0;
    next.disabled = currentIndex === cards.length - 1;
  };
  const card = item => {
    const article = document.createElement('article');
    article.className = 'home-reference-card';
    const photo = document.createElement('img');
    photo.src = item.image;
    photo.alt = `Verkaufte Immobilie in ${item.city}`;
    photo.loading = 'lazy';
    photo.decoding = 'async';
    const body = document.createElement('div');
    body.className = 'home-reference-card-content';
    const tag = document.createElement('span');
    tag.className = 'home-reference-card-tag';
    tag.textContent = 'Erfolgreich vermarktet';
    const heading = document.createElement('h3');
    heading.textContent = item.title;
    const location = document.createElement('p');
    location.textContent = item.city;
    body.append(tag, heading, location);
    article.append(photo, body);
    return article;
  };
  const show = async () => {
    if (loaded) return;
    loaded = true;
    try {
      const response = await fetch('/api/propstack-sold-references', {
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) return;
      const data = await response.json();
      const items = Array.isArray(data.references) ? data.references.filter(item =>
        item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.city === 'string' &&
        typeof item.image === 'string' && item.image.startsWith('https://')) : [];
      if (!items.length) return;
      track.replaceChildren(...selectReferences(items).map(card));
      section.hidden = false;
      const move = direction => {
        const cards = [...track.children];
        const target = cards[Math.max(0, Math.min(cards.length - 1, currentIndex + direction))];
        if (!target) return;
        track.scrollTo({
          left: target.offsetLeft - track.offsetLeft,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
        });
      };
      previous.addEventListener('click', () => move(-1));
      next.addEventListener('click', () => move(1));
      track.addEventListener('scroll', () => window.requestAnimationFrame(update), { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();
    } catch {
      // The homepage remains unchanged when the optional Propstack feed is unavailable.
    }
  };

  const target = document.querySelector('.review-platforms-section') || section.previousElementSibling;
  if ('IntersectionObserver' in window && target) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      show();
    }, { rootMargin: '900px 0px' });
    observer.observe(target);
  } else {
    show();
  }
})();

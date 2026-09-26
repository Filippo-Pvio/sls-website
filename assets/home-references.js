(() => {
  const section = document.querySelector('[data-home-references]');
  if (!section) return;
  const track = section.querySelector('[data-home-references-track]');
  const previous = section.querySelector('[data-home-references-prev]');
  const next = section.querySelector('[data-home-references-next]');
  const progress = section.querySelector('[data-home-references-progress]');
  let loaded = false;

  const update = () => {
    const cards = [...track.children];
    if (!cards.length) return;
    const left = track.scrollLeft;
    const current = cards.reduce((best, card, index) =>
      Math.abs(card.offsetLeft - track.offsetLeft - left) <
      Math.abs(cards[best].offsetLeft - track.offsetLeft - left) ? index : best, 0);
    progress.textContent = `${current + 1} / ${cards.length}`;
    previous.disabled = current === 0;
    next.disabled = current === cards.length - 1;
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
        item && typeof item.title === 'string' && typeof item.city === 'string' &&
        typeof item.image === 'string' && item.image.startsWith('https://')) : [];
      if (!items.length) return;
      track.replaceChildren(...items.map(card));
      section.hidden = false;
      previous.addEventListener('click', () => {
        const cards = [...track.children];
        const current = Math.max(0, Number(progress.textContent.split('/')[0]) - 1);
        cards[Math.max(0, current - 1)]?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          block: 'nearest', inline: 'start'
        });
      });
      next.addEventListener('click', () => {
        const cards = [...track.children];
        const current = Math.max(0, Number(progress.textContent.split('/')[0]) - 1);
        cards[Math.min(cards.length - 1, current + 1)]?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          block: 'nearest', inline: 'start'
        });
      });
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

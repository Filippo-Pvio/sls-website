(() => {
  const section = document.querySelector('[data-home-references]');
  if (!section) return;
  const track = section.querySelector('[data-home-references-track]');
  const previous = section.querySelector('[data-home-references-prev]');
  const next = section.querySelector('[data-home-references-next]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const selectionSize = 20;
  const selectionKey = 'sls.home.references.previous';
  const interval = 4500;
  let loaded = false;
  let currentIndex = 0;
  let realCount = 0;
  let autoplayTimer;
  let resumeTimer;
  let wrapTimer;
  let visible = false;
  let paused = false;
  let resetLoop = () => {};

  const shuffle = items => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  const selectReferences = items => {
    let previousSelection = [];
    try {
      const stored = JSON.parse(sessionStorage.getItem(selectionKey));
      if (Array.isArray(stored)) previousSelection = stored;
    } catch {
      // The selection still works when storage is unavailable.
    }
    const priorIds = new Set(previousSelection);
    const selected = [
      ...shuffle(items.filter(item => !priorIds.has(item.id))),
      ...shuffle(items.filter(item => priorIds.has(item.id)))
    ].slice(0, selectionSize);
    if (selected.length > 1 && selected[0].id === previousSelection[0]) {
      [selected[0], selected[1]] = [selected[1], selected[0]];
    }
    try {
      sessionStorage.setItem(selectionKey, JSON.stringify(selected.map(item => item.id)));
    } catch {
      // Private browsing may block session storage.
    }
    return selected;
  };

  const update = () => {
    const cards = [...track.children];
    if (!cards.length) return;
    const left = track.scrollLeft;
    currentIndex = Math.min(realCount, cards.reduce((best, card, index) =>
      Math.abs(card.offsetLeft - track.offsetLeft - left) <
      Math.abs(cards[best].offsetLeft - track.offsetLeft - left) ? index : best, 0));
    previous.disabled = currentIndex === 0;
    next.disabled = realCount < 2;
    if (currentIndex === realCount && !wrapTimer) {
      wrapTimer = window.setTimeout(resetLoop, 900);
    }
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
      const selected = selectReferences(items);
      realCount = selected.length;
      const copies = selected.slice(0, Math.min(3, realCount)).map(item => {
        const copy = card(item);
        copy.setAttribute('aria-hidden', 'true');
        return copy;
      });
      track.replaceChildren(...selected.map(card), ...copies);
      section.hidden = false;

      resetLoop = () => {
        window.clearTimeout(wrapTimer);
        wrapTimer = null;
        track.style.scrollSnapType = 'none';
        track.scrollTo({ left: 0, behavior: 'instant' });
        currentIndex = 0;
        window.requestAnimationFrame(() => {
          track.style.scrollSnapType = '';
          update();
        });
      };
      const move = direction => {
        if (wrapTimer) return;
        const targetIndex = Math.max(0, Math.min(realCount, currentIndex + direction));
        const target = track.children[targetIndex];
        if (!target) return;
        track.scrollTo({
          left: target.offsetLeft - track.offsetLeft,
          behavior: reducedMotion.matches ? 'instant' : 'smooth'
        });
        if (targetIndex === realCount) {
          wrapTimer = window.setTimeout(resetLoop, 900);
        }
      };
      const schedule = () => {
        window.clearTimeout(autoplayTimer);
        if (!visible || document.hidden || reducedMotion.matches || paused ||
            section.matches(':hover') || section.contains(document.activeElement) || realCount < 2) return;
        autoplayTimer = window.setTimeout(() => {
          move(1);
          schedule();
        }, interval);
      };
      const pause = () => {
        paused = true;
        window.clearTimeout(autoplayTimer);
        window.clearTimeout(resumeTimer);
        resumeTimer = window.setTimeout(() => {
          paused = false;
          schedule();
        }, 8000);
      };
      previous.addEventListener('click', () => { pause(); move(-1); });
      next.addEventListener('click', () => { pause(); move(1); });
      track.addEventListener('pointerdown', pause, { passive: true });
      track.addEventListener('wheel', pause, { passive: true });
      section.addEventListener('pointerenter', () => window.clearTimeout(autoplayTimer));
      section.addEventListener('pointerleave', schedule);
      section.addEventListener('focusin', () => window.clearTimeout(autoplayTimer));
      section.addEventListener('focusout', () => window.setTimeout(schedule, 0));
      track.addEventListener('scroll', () => window.requestAnimationFrame(update), { passive: true });
      window.addEventListener('resize', update, { passive: true });
      document.addEventListener('visibilitychange', schedule);
      reducedMotion.addEventListener('change', schedule);
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
          visible = entries.some(entry => entry.isIntersecting);
          schedule();
        }, { threshold: 0.25 });
        observer.observe(section);
      } else {
        visible = true;
      }
      update();
      schedule();
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

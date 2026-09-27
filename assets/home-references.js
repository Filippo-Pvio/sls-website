(() => {
  const section = document.querySelector('[data-home-references]');
  if (!section) return;
  const track = section.querySelector('[data-home-references-track]');
  const previous = section.querySelector('[data-home-references-prev]');
  const next = section.querySelector('[data-home-references-next]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const interval = 4500;
  const selectionKey = 'sls.home.references.first';
  let loaded = false;
  let realCount = 0;
  let cloneCount = 0;
  let autoplayTimer;
  let resumeTimer;
  let scrollTimer;
  let visible = false;
  let paused = false;

  const shuffle = items => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const orderReferences = items => {
    const selected = shuffle(items);
    let previousFirst = null;
    try { previousFirst = sessionStorage.getItem(selectionKey); } catch {}
    if (selected.length > 1 && selected[0]?.id === previousFirst) {
      [selected[0], selected[1]] = [selected[1], selected[0]];
    }
    try { sessionStorage.setItem(selectionKey, selected[0]?.id || ''); } catch {}
    return selected;
  };

  const card = (item, clone = false) => {
    const article = document.createElement('article');
    article.className = 'home-reference-card';
    if (clone) article.setAttribute('aria-hidden', 'true');
    const photo = document.createElement('img');
    photo.src = item.image;
    photo.alt = clone ? '' : `Verkaufte Immobilie in ${item.city}`;
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
      const response = await fetch('/api/propstack-sold-references', {
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) return;
      const data = await response.json();
      const items = Array.isArray(data.references) ? data.references.filter(item =>
        item && typeof item.id === 'string' && typeof item.title === 'string' &&
        typeof item.city === 'string' && typeof item.image === 'string' &&
        item.image.startsWith('https://')) : [];
      if (!items.length) return;

      const selected = orderReferences(items);
      realCount = selected.length;
      cloneCount = Math.min(4, realCount);
      const prefix = selected.slice(-cloneCount).map(item => card(item, true));
      const originals = selected.map(item => card(item));
      const suffix = selected.slice(0, cloneCount).map(item => card(item, true));
      track.replaceChildren(...prefix, ...originals, ...suffix);
      previous.disabled = realCount < 2;
      next.disabled = realCount < 2;
      section.hidden = false;

      requestAnimationFrame(() => jumpTo(cloneCount));

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
      track.addEventListener('scroll', () => {
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(() => {
          normalizeLoop();
          schedule();
        }, 120);
      }, { passive: true });
      window.addEventListener('resize', () => window.setTimeout(normalizeLoop, 0), { passive: true });
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
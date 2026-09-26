(() => {
  const hero = document.querySelector('.home-editorial .hero-premium');
  const current = hero?.querySelector('.hero-scene-current');
  const incoming = hero?.querySelector('.hero-scene-next');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!current || !incoming) return;

  const scenes = ['handshake', 'viewing', 'presentation', 'consultation'];
  const dwell = 7000;
  const fade = 1600;
  const path = (scene) => `/assets/images/hero-scenes/${scene}-${window.innerWidth <= 900 ? 900 : 1536}.webp`;
  let active = current;
  let standby = incoming;
  let index = 0;
  let timer;
  let generation = 0;
  let visible = true;
  let scheduled = false;

  const hideStandby = () => {
    standby.classList.add('is-resetting');
    standby.classList.remove('is-visible');
    void standby.offsetWidth;
    standby.classList.remove('is-resetting');
  };

  const stop = () => {
    generation++;
    scheduled = false;
    window.clearTimeout(timer);
    hideStandby();
  };

  const schedule = () => {
    if (scheduled || !visible || document.hidden || reducedMotion.matches) return;
    scheduled = true;
    const token = ++generation;
    const next = (index + 1) % scenes.length;
    const image = new Image();
    image.src = path(scenes[next]);
    const ready = async () => {
      if (token !== generation || !visible || document.hidden) return;
      try { await image.decode(); } catch { /* The load event already verified the image. */ }
      if (token !== generation) return;
      standby.srcset = '';
      standby.src = image.src;
      standby.dataset.scene = scenes[next];
      try { await standby.decode(); } catch { /* Keep the loaded image as a fallback. */ }
      if (token !== generation || !visible || document.hidden) return;
      timer = window.setTimeout(() => {
        if (token !== generation || !visible || document.hidden || reducedMotion.matches) return;
        standby.style.zIndex = '2';
        active.style.zIndex = '1';
        standby.classList.add('is-visible');
        timer = window.setTimeout(() => {
          if (token !== generation) return;
          // Keep the new image visible while retiring the old layer underneath it.
          active.classList.add('is-resetting');
          active.classList.remove('is-visible');
          void active.offsetWidth;
          active.classList.remove('is-resetting');
          [active, standby] = [standby, active];
          index = next;
          scheduled = false;
          schedule();
        }, fade);
      }, dwell);
    };
    if (image.complete && image.naturalWidth) ready();
    else image.addEventListener('load', ready, { once: true });
    image.addEventListener('error', () => {
      if (token !== generation) return;
      scheduled = false;
      index = next;
      timer = window.setTimeout(schedule, dwell);
    }, { once: true });
  };

  const observer = new IntersectionObserver(([entry]) => {
    const wasVisible = visible;
    visible = entry.isIntersecting;
    if (!visible) stop();
    else if (!wasVisible) schedule();
  }, { threshold: 0.05 });
  observer.observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else schedule();
  });
  reducedMotion.addEventListener('change', () => {
    stop();
    schedule();
  });

  const start = () => schedule();
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();

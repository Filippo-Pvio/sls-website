(() => {
  const hero = document.querySelector('.home-editorial .hero-premium');
  const current = hero?.querySelector('.hero-scene-current');
  const incoming = hero?.querySelector('.hero-scene-next');
  const mobile = window.matchMedia('(max-width: 640px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!current || !incoming || mobile.matches || reducedMotion.matches) return;

  const scenes = ['handshake', 'viewing', 'presentation', 'consultation'];
  const path = (scene) => `/assets/images/hero-scenes/${scene}-${window.innerWidth <= 900 ? 900 : 1536}.webp`;
  let index = 0;
  let timer;
  let finishTimer;
  let generation = 0;
  let visible = true;

  const schedule = () => {
    if (!visible || document.hidden || mobile.matches || reducedMotion.matches) return;
    const token = ++generation;
    const next = (index + 1) % scenes.length;
    const image = new Image();
    image.src = path(scenes[next]);
    const ready = () => {
      if (token !== generation || !visible || document.hidden) return;
      incoming.src = image.src;
      incoming.dataset.scene = scenes[next];
      timer = window.setTimeout(() => {
        if (token !== generation || !visible || document.hidden || mobile.matches || reducedMotion.matches) return;
        incoming.classList.add('is-visible');
        finishTimer = window.setTimeout(() => {
          if (token !== generation) return;
          current.srcset = '';
          current.src = image.src;
          current.dataset.scene = scenes[next];
          incoming.classList.remove('is-visible');
          index = next;
          schedule();
        }, 1250);
      }, 6200);
    };
    if (image.complete && image.naturalWidth) ready();
    else image.addEventListener('load', ready, { once: true });
  };

  const stop = () => {
    generation++;
    window.clearTimeout(timer);
    window.clearTimeout(finishTimer);
    incoming.classList.remove('is-visible');
  };

  const observer = new IntersectionObserver(([entry]) => {
    const wasVisible = visible;
    visible = entry.isIntersecting;
    if (!visible) stop();
    else if (!wasVisible && !document.hidden) schedule();
  }, { threshold: 0.05 });
  observer.observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (visible) schedule();
  });
  [mobile, reducedMotion].forEach(query => query.addEventListener('change', () => {
    stop();
    if (!mobile.matches && !reducedMotion.matches && visible && !document.hidden) schedule();
  }));

  const start = () => schedule();
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();

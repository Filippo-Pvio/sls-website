(() => {
  const section = document.querySelector('[data-home-reasons]');
  const items = section ? [...section.querySelectorAll('[data-home-reasons-step]')] : [];
  if (!section || !items.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(item => item.classList.add('is-reached'));
    return;
  }

  let scheduled = false;
  const update = () => {
    scheduled = false;
    const focus = window.innerHeight * .62;
    let current = -1;

    items.forEach((item, index) => {
      const reached = item.getBoundingClientRect().top <= focus;
      item.classList.toggle('is-reached', reached);
      if (reached) current = index;
    });

    const bounds = section.getBoundingClientRect();
    const visible = bounds.bottom > window.innerHeight * .18 && bounds.top < window.innerHeight * .82;
    items.forEach((item, index) => item.classList.toggle('is-current', visible && index === current));
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  update();
})();
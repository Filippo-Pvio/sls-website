(() => {
  const section = document.querySelector('[data-home-reasons]');
  const journey = section?.querySelector('[data-home-reasons-journey]');
  const steps = journey ? [...journey.querySelectorAll('[data-home-reasons-step]')] : [];
  if (!section || !journey || steps.length < 2) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) {
    steps.forEach(step => step.classList.add('is-reached'));
    steps[steps.length - 1].classList.add('is-current');
    journey.style.setProperty('--reasons-progress', '1');
    return;
  }

  let scheduled = false;
  const update = () => {
    scheduled = false;
    const focus = window.innerHeight * .62;
    const first = steps[0].getBoundingClientRect();
    const last = steps[steps.length - 1].getBoundingClientRect();
    const firstPoint = first.top + Math.min(36, first.height * .2);
    const lastPoint = last.top + Math.min(36, last.height * .2);
    const progress = Math.max(0, Math.min(1, (focus - firstPoint) / Math.max(1, lastPoint - firstPoint)));
    journey.style.setProperty('--reasons-progress', progress.toFixed(3));

    let current = -1;
    steps.forEach((step, index) => {
      const reached = step.getBoundingClientRect().top + Math.min(36, step.offsetHeight * .2) <= focus;
      step.classList.toggle('is-reached', reached);
      if (reached) current = index;
    });

    const bounds = journey.getBoundingClientRect();
    const visible = bounds.bottom > window.innerHeight * .18 && bounds.top < window.innerHeight * .82;
    steps.forEach((step, index) => step.classList.toggle('is-current', visible && index === current));
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
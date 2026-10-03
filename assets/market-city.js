(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !('IntersectionObserver' in window)) return;
  const targets = [...document.querySelectorAll('[data-city-reveal]')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .06 });
  targets.forEach(target => {
    target.classList.add('city-motion-ready');
    observer.observe(target);
    target.addEventListener('focusin', () => {
      target.classList.add('is-visible');
      observer.unobserve(target);
    });
  });
  const steps = [...document.querySelectorAll('.city-steps li')];
  let scheduled = false;
  const update = () => {
    scheduled = false;
    steps.forEach(step => step.classList.toggle('is-reached', step.getBoundingClientRect().top < innerHeight * .7));
  };
  const schedule = () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  schedule();
  motion.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    targets.forEach(target => target.classList.add('is-visible'));
    removeEventListener('scroll', schedule);
    removeEventListener('resize', schedule);
    steps.forEach(step => step.classList.remove('is-reached'));
  });
})();

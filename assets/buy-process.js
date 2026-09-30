(() => {
  const route = document.querySelector('.buy-steps');
  const steps = route ? [...route.children] : [];
  if (steps.length !== 5 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const intro = document.querySelector('.buy-process-intro');
  intro.classList.add('is-motion-ready');
  const introObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { intro.classList.add('is-visible'); introObserver.disconnect(); }
  }, {threshold: .01, rootMargin: '0px 0px -22% 0px'});
  introObserver.observe(intro);
  // Align every marker with the visual center of its matching step title.
  route.classList.add('is-scroll-timeline');
  let milestoneShown = false;
  let scheduled = false;
  const update = () => {
    scheduled = false;
    const focus = window.innerHeight * .64;

    const markerCenters = steps.map((step) => {
      const title = step.querySelector('h3');
      const center = title ? title.offsetTop + title.offsetHeight / 2 : 13;
      step.style.setProperty('--process-marker-y', `${center.toFixed(1)}px`);
      return center;
    });

    const firstCenter = steps[0].offsetTop + markerCenters[0];
    const lastCenter = steps[steps.length - 1].offsetTop + markerCenters[markerCenters.length - 1];
    const routeTop = route.getBoundingClientRect().top;
    const first = routeTop + firstCenter;
    const last = routeTop + lastCenter;

    route.style.setProperty('--process-line-start', `${firstCenter.toFixed(1)}px`);
    route.style.setProperty('--process-line-length', `${Math.max(0, lastCenter - firstCenter).toFixed(1)}px`);
    const progress = Math.max(0, Math.min(1, (focus - first) / Math.max(1, last - first)));
    route.style.setProperty('--process-progress', progress.toFixed(3));

    let current = -1;
    steps.forEach((step, index) => {
      const point = step.getBoundingClientRect().top + markerCenters[index];
      if (point <= focus) current = index;
      step.classList.toggle('is-reached', point <= focus);
    });
    const visible = route.getBoundingClientRect().bottom > 0 && route.getBoundingClientRect().top < window.innerHeight;
    steps.forEach((step, index) => step.classList.toggle('is-current', visible && index === current));
    if (visible && current === steps.length - 1 && !milestoneShown) {
      milestoneShown = true;
      steps[steps.length - 1].classList.add('is-milestone');
    }
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  schedule();
})();

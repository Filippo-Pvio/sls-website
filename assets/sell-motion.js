(() => {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !('IntersectionObserver' in window)) return;
  const groups = [...document.querySelectorAll('.sell-benefits article')];
  const logos = [...document.querySelectorAll('.sell-partner-logos .trust-badge-card')];
  const targets = [...groups, ...logos];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('sell-motion-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .05 });
  groups.forEach(group => {
    [...group.querySelectorAll('li')].forEach((item, index) => item.style.setProperty('--check-delay', `${index * 65 + 140}ms`));
  });
  logos.forEach((logo, index) => logo.style.setProperty('--reveal-delay', `${(index % 3) * 90}ms`));
  targets.forEach(target => { target.classList.add('sell-motion-ready'); observer.observe(target); });
  // Keyboard navigation must never focus an invisible partner link.
  targets.forEach(target => target.addEventListener('focusin', () => {
    target.classList.add('sell-motion-visible'); observer.unobserve(target);
  }, { once: true }));
  motion.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    targets.forEach(target => target.classList.add('sell-motion-visible'));
  });
})();

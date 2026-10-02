(() => {
  const filters = document.querySelector('.network-filters');
  const cards = [...document.querySelectorAll('.network-partner')];
  const count = document.querySelector('.network-count');
  if (filters && count) {
    filters.hidden = false;
    filters.addEventListener('click', event => {
      const button = event.target.closest('button[data-filter]');
      if (!button) return;
      filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      cards.forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter; });
      count.textContent = `${cards.filter(card => !card.hidden).length} Partner`;
    });
  }
  // Add up to three original-photo variants in the JSON configuration in netzwerk/index.html.
  const config = document.getElementById('network-hero-config');
  const scenes = document.querySelector('[data-network-scenes]');
  if (!config || !scenes) return;
  let images;
  try { images = JSON.parse(config.textContent).images; } catch { return; }
  if (!Array.isArray(images)) return;
  const ready = images.slice(0, 3).filter(item => item && typeof item.src === 'string' && item.src.startsWith('/assets/')).map((item, index) => new Promise(resolve => {
    const image = new Image();
    image.className = 'hero-scene'; image.alt = ''; image.decoding = 'async';
    image.fetchPriority = index === 0 ? 'high' : 'low';
    if (item.position) image.style.objectPosition = item.position;
    if (item.srcset) { image.srcset = item.srcset; image.sizes = '100vw'; }
    image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = item.src;
  }));
  Promise.all(ready).then(result => {
    const slides = result.filter(Boolean);
    if (!slides.length) return;
    slides.forEach(image => scenes.append(image)); slides[0].classList.add('is-visible');
    if (slides.length < 2) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let active = 0, timer = null;
    function sync() {
      clearInterval(timer);
      if (motion.matches || document.hidden) return;
      timer = setInterval(() => {
        slides[active].classList.remove('is-visible'); active = (active + 1) % slides.length;
        slides[active].classList.add('is-visible');
      }, 6500);
    }
    motion.addEventListener('change', sync); document.addEventListener('visibilitychange', sync); sync();
  });
})();

(() => {
  const filters = document.querySelector('.network-filters');
  const cards = [...document.querySelectorAll('.network-directory .network-partner')];
  const form = document.querySelector('.network-search');
  const input = document.querySelector('#partner-query');
  const reset = document.querySelector('[data-network-reset]');
  const status = document.querySelector('.network-results');
  const empty = document.querySelector('.network-empty');
  let category = 'all';
  const normalize = text => text.toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');
  function update() {
    const terms = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
    cards.forEach(card => {
      const text = normalize(card.textContent);
      card.hidden = (category !== 'all' && !card.dataset.category.split(' ').includes(category)) || !terms.every(term => text.includes(term));
    });
    const total = cards.filter(card => !card.hidden).length;
    status.textContent = terms.length || category !== 'all' ? `${total} ${total === 1 ? 'Marktgebiet' : 'Marktgebiete'} gefunden` : '';
    empty.hidden = total !== 0;
    reset.hidden = !input.value;
  }
  if (filters && form && input && reset && status && empty) {
    filters.hidden = false; form.hidden = false;
    filters.addEventListener('click', event => {
      const button = event.target.closest('button[data-filter]');
      if (!button) return;
      category = button.dataset.filter;
      filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      update();
    });
    form.addEventListener('submit', event => { event.preventDefault(); update(); });
    input.addEventListener('input', update);
    reset.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
  }
  // Add up to three original-photo variants in the JSON configuration in standorte/index.html.
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
      }, 13200);
    }
    motion.addEventListener('change', sync); document.addEventListener('visibilitychange', sync); sync();
  });
})();

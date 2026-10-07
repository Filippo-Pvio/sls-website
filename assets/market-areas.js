import { searchMarketAreas } from './market-area-search.mjs';

(() => {
  const filters = document.querySelector('.network-filters');
  const cards = [...document.querySelectorAll('.network-directory .network-partner')];
  const form = document.querySelector('.network-search');
  const input = document.querySelector('#partner-query');
  const reset = document.querySelector('[data-network-reset]');
  const status = document.querySelector('.network-results');
  const empty = document.querySelector('.network-empty');
  const context = document.querySelector('.market-search-context');
  const showAll = document.querySelector('[data-market-show-all]');
  let category = 'all';
  let areas;
  try { areas = JSON.parse(document.getElementById('market-area-search-config').textContent); }
  catch { areas = cards.map(card => ({ city: card.querySelector('h3').textContent, url: card.querySelector('h3 a').getAttribute('href'), regions: card.dataset.category.split(' '), text: card.textContent })); }
  const cardByUrl = new Map(cards.map(card => [card.querySelector('h3 a').getAttribute('href'), card]));
  const regionMatches = match => category === 'all' || match.area.regions.includes(category);
  const syncFilters = () => filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
  function update(expandRegion = false) {
    const query = input.value.trim();
    const matches = searchMarketAreas(areas, query);
    if (expandRegion && query && matches.length && !matches.some(regionMatches)) {
      category = 'all'; syncFilters();
    }
    const visible = matches.filter(regionMatches);
    cards.forEach(card => { card.hidden = true; card.querySelector('[data-place-match]')?.remove(); });
    visible.forEach(match => {
      const card = cardByUrl.get(match.area.url);
      if (!card) return;
      card.hidden = false;
      if (match.exact && ['nearby', 'district'].includes(match.kind)) {
        const note = document.createElement('p'); note.dataset.placeMatch = '';
        note.className = 'market-place-match';
        note.textContent = match.kind === 'nearby' ? `Ihr regionaler Anlaufpunkt für ${match.place}` : `Passend zum Stadtteil ${match.place}`;
        card.querySelector('h3').after(note);
      }
    });
    status.textContent = query || category !== 'all' ? `${visible.length} ${visible.length === 1 ? 'Marktgebiet' : 'Marktgebiete'} gefunden` : '';
    if (visible.length === 1 && visible[0].exact && ['nearby', 'district'].includes(visible[0].kind)) status.textContent += `: ${visible[0].area.city} – passend zu ${visible[0].place}.`;
    empty.hidden = visible.length !== 0;
    if (!empty.hidden) {
      const outside = matches.length > 0;
      empty.querySelector('h3').textContent = outside ? 'Ihr Ort liegt in einer anderen Region.' : 'Ihr Ort ist nicht aufgeführt?';
      empty.querySelector('p').textContent = outside ? 'Für Ihre Suche gibt es ein passendes Marktgebiet außerhalb des gewählten Regionsfilters.' : 'Wir prüfen gern, wie wir Sie dort begleiten können. Sprechen Sie mit uns über Ihre Immobilie und Ihr Vorhaben.';
      showAll.textContent = outside ? 'Passendes Marktgebiet anzeigen' : 'Alle Marktgebiete anzeigen';
    }
    reset.hidden = !query;
    if (context) {
      context.replaceChildren(); context.hidden = true;
      if (visible.length === 1 && visible[0].kind === 'nearby' && visible[0].exact) {
        const { place, area } = visible[0];
        const heading = document.createElement('h3'); heading.textContent = `${place}: Ihr passendes Marktgebiet`;
        const text = document.createElement('p'); text.textContent = `Für ${place} ist ${area.city} und Umgebung Ihr regionaler Anlaufpunkt. Im persönlichen Gespräch klären wir Ihr Vorhaben und die Betreuung Ihrer konkreten Adresse.`;
        const link = document.createElement('a'); link.href = '/kontakt/'; link.className = 'network-link'; link.textContent = `Beratung für ${place} anfragen →`;
        context.append(heading, text, link); context.hidden = false;
      }
    }
  }
  if (filters && form && input && reset && status && empty) {
    filters.hidden = false; form.hidden = false;
    filters.addEventListener('click', event => {
      const button = event.target.closest('button[data-filter]');
      if (!button) return;
      category = button.dataset.filter; syncFilters(); update();
    });
    form.addEventListener('submit', event => { event.preventDefault(); update(true); });
    input.addEventListener('input', () => update(true));
    reset.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
    showAll?.addEventListener('click', () => {
      if (!searchMarketAreas(areas, input.value).length) input.value = '';
      category = 'all'; syncFilters(); update(); input.focus();
    });
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

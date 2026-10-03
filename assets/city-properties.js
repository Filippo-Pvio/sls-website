import {propertyCardHtml} from './property-card.mjs';

const validCity = (item, city) => typeof item?.city === 'string' && item.city.trim().toLocaleLowerCase('de-DE') === city.toLocaleLowerCase('de-DE');
const unique = items => [...new Map(items.map(item => [String(item.id), item])).values()];
const https = value => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };
// Keep the last selection per city for this browser tab, without tracking visitors.
const selectReferences = (items, city) => {
  const key = `sls.city.references.${city.toLocaleLowerCase('de-DE')}`;
  let previous = [];
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || '[]');
    if (Array.isArray(saved)) previous = saved.map(String);
  } catch { /* Storage may be unavailable; random selection still works. */ }
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selected = [...shuffled.filter(item => !previous.includes(String(item.id))),
    ...shuffled.filter(item => previous.includes(String(item.id)))].slice(0, 2);
  try { sessionStorage.setItem(key, JSON.stringify(selected.map(item => String(item.id)))); } catch {}
  return selected;
};
const animate = nodes => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('city-card-enter');
    observer.unobserve(entry.target);
  }), {threshold: .05});
  nodes.forEach(node => observer.observe(node));
};
const referenceCard = item => {
  const article = document.createElement('article'); article.className = 'city-reference-card';
  const image = document.createElement('img');
  image.src = item.image; image.alt = `Verkaufte Immobilie in ${item.city}: ${item.title}`;
  image.loading = 'lazy'; image.decoding = 'async'; image.width = 600; image.height = 450;
  const tag = document.createElement('span'); tag.className = 'city-reference-tag'; tag.textContent = 'Verkauft';
  const heading = document.createElement('h3'); heading.textContent = item.title;
  const location = document.createElement('p'); location.textContent = item.city;
  article.append(image,tag,heading,location); return article;
};

async function load(section, kind) {
  const city = section.dataset.cityProperties;
  const status = section.querySelector('[role="status"]');
  const grid = section.querySelector(kind === 'active' ? '[data-city-active]' : '[data-city-references]');
  grid.setAttribute('aria-busy','true');
  try {
    const endpoint = kind === 'active' ? `/api/propstack-properties?city=${encodeURIComponent(city)}&per=3` : '/api/propstack-sold-references';
    const response = await fetch(endpoint, {signal: AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error('Feed unavailable');
    const data = await response.json();
    const rows = kind === 'active' ? data.items : data.references;
    if (!Array.isArray(rows)) throw new Error('Invalid feed');
    const candidates = unique(rows.filter(item => validCity(item,city) && /^\d+$/.test(String(item.id)) && typeof item.title === 'string' && (kind === 'active' || https(item.image))));
    const items = kind === 'active' ? candidates.slice(0,3) : selectReferences(candidates,city);
    if (!items.length) {
      status.textContent = kind === 'active' ? `Derzeit sind keine Immobilienangebote in ${city} verfügbar. Hinterlegen Sie Ihre Wünsche in einem Suchprofil.` : `Aktuell sind keine Referenzbilder aus ${city} verfügbar. Gerne geben wir Ihnen im persönlichen Gespräch Einblicke in unsere Arbeit.`;
      return;
    }
    if (kind === 'active') grid.innerHTML = items.map(item => propertyCardHtml(item,{heading:'h3'})).join('');
    else grid.replaceChildren(...items.map(referenceCard));
    status.textContent = kind === 'active' ? `Eine Auswahl aktueller Immobilien in ${city}.` : '';
    if (kind === 'references') status.hidden = true;
    animate([...grid.children]);
  } catch {
    status.textContent = kind === 'active' ? 'Die aktuellen Angebote können gerade nicht geladen werden. Bitte versuchen Sie es über die Immobilienübersicht erneut oder sprechen Sie uns direkt an.' : 'Die Referenzen können gerade nicht geladen werden. Gerne stellen wir Ihnen unsere Arbeit im persönlichen Gespräch vor.';
    const link = document.createElement('a'); link.href = '#kontakt'; link.textContent = ' Kontakt aufnehmen'; status.append(link);
  } finally { grid.setAttribute('aria-busy','false'); }
}
document.querySelectorAll('[data-city-properties]').forEach(section => load(section,section.querySelector('[data-city-active]') ? 'active' : 'references'));

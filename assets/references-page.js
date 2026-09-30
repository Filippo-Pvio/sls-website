(async () => {
 const grid = document.getElementById('references-grid');
 const status = document.getElementById('references-status');
 const more = document.getElementById('references-more');
 if (!grid || !status || !more) return;
 const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
 const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(entry => {
   if (!entry.isIntersecting) return;
   if (!reduced.matches) entry.target.classList.add('is-entering');
   observer.unobserve(entry.target);
  });
 }, {threshold:.05}) : null;
 const card = item => {
  const article = document.createElement('article'); article.className = 'reference-card';
  const image = document.createElement('img'); image.src = item.image; image.alt = `Verkaufte Immobilie in ${item.city}`; image.loading = 'lazy'; image.decoding = 'async'; image.width = 600; image.height = 450;
  const tag = document.createElement('span'); tag.className = 'reference-tag'; tag.textContent = 'Erfolgreich vermittelt';
  const heading = document.createElement('h3'); heading.textContent = item.title;
  const location = document.createElement('p'); location.textContent = item.city;
  article.append(image,tag,heading,location); return article;
 };
 try {
  const response = await fetch('/api/propstack-sold-references',{signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('Feed unavailable');
  const data = await response.json();
  const seen = new Set();
  const items = (Array.isArray(data.references) ? data.references : []).filter(item => {
   if (!item || typeof item.id !== 'string' || seen.has(item.id) || typeof item.title !== 'string' || typeof item.city !== 'string' || typeof item.image !== 'string' || !item.image.startsWith('https://')) return false;
   seen.add(item.id); return true;
  });
  if (!items.length) throw new Error('No references');
  let shown = 0;
  const showMore = focus => {
   const batch = items.slice(shown,shown+12).map(card);
   grid.append(...batch); shown += batch.length;
   batch.forEach(item => observer?.observe(item));
   more.hidden = shown >= items.length;
   status.textContent = `${shown} von ${items.length} Referenzimmobilien angezeigt.`;
   if (focus && batch[0]) {batch[0].tabIndex = -1;batch[0].focus({preventScroll:true});}
  };
  more.addEventListener('click',()=>showMore(true)); showMore(false);
 } catch {
  status.textContent = 'Die Referenzgalerie ist gerade nicht verfügbar. Gerne stellen wir Ihnen unsere Referenzen persönlich vor. ';
  const link = document.createElement('a');link.href='/kontakt/';link.textContent='Kontakt aufnehmen';status.append(link);
 }
})();

(async () => {
 const grid = document.getElementById('references-grid');
 const status = document.getElementById('references-status');
 const sentinel = document.getElementById('references-load-sentinel');
 const retry = document.getElementById('references-retry');
 if (!grid || !status || !sentinel || !retry) return;
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
 const seen = new Set();
 let cursor = '1:0', loading = false, failed = false, scheduled = false;
 const scheduleMore = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
   scheduled = false;
   if (!loading && !failed && cursor !== null && sentinel.getBoundingClientRect().top <= window.innerHeight + 600) loadMore();
  });
 };
 const loadMore = async () => {
  if (loading || cursor === null) return;
  loading = true; failed = false; retry.hidden = true;
  grid.setAttribute('aria-busy','true');
  status.hidden = false;
  status.textContent = 'Referenzimmobilien werden geladen …';
  try {
   const query = new URLSearchParams({gallery:'1',cursor});
   const response = await fetch('/api/propstack-sold-references/?'+query,{signal:AbortSignal.timeout(15000)});
   if (!response.ok) throw new Error('Feed unavailable');
   const data = await response.json();
   if (!Array.isArray(data.references) || data.references.length > 12 ||
       !(data.nextCursor === null || typeof data.nextCursor === 'string' && /^[1-9]\d{0,3}:(?:[0-9]|1[01])$/.test(data.nextCursor)) ||
       data.nextCursor === cursor) throw new Error('Invalid reference page');
   const items = data.references.filter(item => {
    if (!item || typeof item.id !== 'string' || seen.has(item.id) || typeof item.title !== 'string' || typeof item.city !== 'string' || typeof item.image !== 'string' || !item.image.startsWith('https://')) return false;
    seen.add(item.id); return true;
   });
   const batch = items.map(card);
   grid.append(...batch); batch.forEach(item => observer?.observe(item));
   cursor = data.nextCursor;
   status.textContent = !seen.size && cursor === null ? 'Derzeit sind keine Referenzimmobilien verfügbar.' : '';
   status.hidden = !status.textContent;
   if (cursor === null) {
    window.removeEventListener('scroll',scheduleMore);
    window.removeEventListener('resize',scheduleMore);
   }
  } catch {
   failed = true; retry.hidden = false;
   status.textContent = seen.size ? 'Weitere Referenzen konnten gerade nicht geladen werden. Bitte versuchen Sie es erneut.'
     : 'Die Referenzgalerie konnte gerade nicht geladen werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns. ';
   if (!seen.size) {
    const link = document.createElement('a');link.href='/kontakt/';link.textContent='Kontakt aufnehmen';status.append(link);
   }
  } finally {
   loading = false;
   grid.setAttribute('aria-busy','false');
   if (!failed && cursor !== null) scheduleMore();
  }
 };
 retry.addEventListener('click',()=>loadMore());
 window.addEventListener('scroll',scheduleMore,{passive:true});
 window.addEventListener('resize',scheduleMore);
 await loadMore();
})();

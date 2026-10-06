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
 const seen = new Set();
 let cursor = '1:0', loading = false;
 const loadMore = async (focus = false) => {
  if (loading || cursor === null) return;
  loading = true; more.disabled = true;
  grid.setAttribute('aria-busy','true');
  more.textContent = 'Referenzen werden geladen …';
  status.textContent = seen.size ? `${seen.size} Referenzimmobilien angezeigt. Weitere werden geladen …` : 'Referenzimmobilien werden geladen …';
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
   more.hidden = cursor === null;
   status.textContent = seen.size ? `${seen.size} Referenzimmobilien angezeigt.` : cursor === null
     ? 'Derzeit sind keine Referenzimmobilien verfügbar.' : 'Weitere Referenzen können geladen werden.';
   if (focus && batch[0]) {
    batch[0].tabIndex = -1;
    batch[0].focus({preventScroll:true});
    batch[0].scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});
   }
  } catch {
   more.hidden = false;
   status.textContent = seen.size ? `${seen.size} Referenzimmobilien angezeigt. Weitere konnten gerade nicht geladen werden. Bitte versuchen Sie es erneut.`
     : 'Die Referenzgalerie konnte gerade nicht geladen werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns. ';
   if (!seen.size) {
    const link = document.createElement('a');link.href='/kontakt/';link.textContent='Kontakt aufnehmen';status.append(link);
   }
  } finally {
   loading = false; more.disabled = false;
   more.textContent = seen.size ? 'Weitere Referenzen anzeigen' : 'Referenzen laden';
   grid.setAttribute('aria-busy','false');
  }
 };
 more.addEventListener('click',()=>loadMore(true));
 await loadMore();
})();

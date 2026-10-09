(async () => {
 const grid = document.getElementById('references-grid');
 const status = document.getElementById('references-status');
 const pagination = document.getElementById('references-pagination');
 const heading = document.getElementById('references-title');
 const retry = document.getElementById('references-retry');
 if (!grid || !status || !pagination || !heading || !retry) return;
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
 const pages = [];
 let current = 0, loading = false, retryPage = 0;
 const renderPagination = () => {
  pagination.replaceChildren();
  const last = pages.length - 1 + (pages.at(-1)?.nextCursor ? 1 : 0);
  pagination.hidden = last < 1;
  if (pagination.hidden) return;
  const button = (label, index, disabled = false, active = false) => {
   const control = document.createElement('button');
   control.type = 'button'; control.textContent = label;
   control.disabled = loading || disabled;
   if (active) control.setAttribute('aria-current','page');
   if (/^\d+$/.test(label)) control.setAttribute('aria-label',`Seite ${label}`);
   control.addEventListener('click',()=>loadPage(index,true));
   pagination.append(control);
  };
  button('Zurück',current-1,current===0);
  const visible = new Set([0,last]);
  for (let index = Math.max(0,current-1); index <= Math.min(last,current+1); index++) visible.add(index);
  let previous = -1;
  [...visible].sort((a,b)=>a-b).forEach(index => {
   if (index > previous+1) { const dots=document.createElement('span');dots.textContent='…';dots.setAttribute('aria-hidden','true');pagination.append(dots); }
   button(String(index+1),index,index===current,index===current);
   previous=index;
  });
  button('Weiter',current+1,current===last);
 };
 const showPage = (index, focus) => {
  const batch = pages[index].items.map(card);
  observer?.disconnect(); grid.replaceChildren(...batch); batch.forEach(item=>observer?.observe(item));
  current=index;
  status.textContent = batch.length ? '' : 'Derzeit sind keine Referenzimmobilien verfügbar.';
  status.hidden = !status.textContent;
  if (focus) {
   heading.focus({preventScroll:true});
   heading.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});
  }
 };
 const loadPage = async (index, focus = false) => {
  if (loading || index < 0 || index > pages.length) return;
  let cursor = index === 0 ? '1:0' : pages[index-1]?.nextCursor;
  if (!pages[index] && !cursor) return;
  loading=true; retryPage=index; retry.hidden=true;
  grid.setAttribute('aria-busy','true'); renderPagination();
  status.hidden=false; status.textContent='Referenzimmobilien werden geladen …';
  try {
   if (!pages[index]) {
    const visited = new Set();
    let items=[], nextCursor;
    do {
     if (visited.has(cursor) || visited.size >= 40) throw new Error('Invalid continuation');
     visited.add(cursor);
     const query = new URLSearchParams({gallery:'1',cursor});
     const response = await fetch('/api/propstack-sold-references/?'+query,{signal:AbortSignal.timeout(15000)});
     if (!response.ok) throw new Error('Feed unavailable');
     const data = await response.json();
     if (!Array.isArray(data.references) || data.references.length > 12 ||
         !(data.nextCursor === null || typeof data.nextCursor === 'string' && /^[1-9]\d{0,3}:(?:[0-9]|1[01])$/.test(data.nextCursor)) ||
         data.nextCursor === cursor) throw new Error('Invalid reference page');
     const seen = new Set();
     items = data.references.filter(item => {
      if (!item || typeof item.id !== 'string' || seen.has(item.id) || typeof item.title !== 'string' || typeof item.city !== 'string' || typeof item.image !== 'string' || !item.image.startsWith('https://')) return false;
      seen.add(item.id); return true;
     });
     nextCursor=data.nextCursor; cursor=nextCursor;
    } while (!items.length && cursor !== null);
    pages[index]={items,nextCursor};
   }
   showPage(index,focus);
  } catch {
   retry.hidden=false;
   status.textContent=pages.length ? 'Diese Referenzseite konnte gerade nicht geladen werden. Bitte versuchen Sie es erneut.' : 'Die Referenzgalerie konnte gerade nicht geladen werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns. ';
   if (!pages.length) { const link=document.createElement('a');link.href='/kontakt/';link.textContent='Kontakt aufnehmen';status.append(link); }
  } finally {
   loading=false; grid.setAttribute('aria-busy','false'); renderPagination();
  }
 };
 retry.addEventListener('click',()=>loadPage(retryPage,true));
 await loadPage(0);
})();

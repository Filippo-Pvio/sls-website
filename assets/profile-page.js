(() => {
  // Repeat a video card with its own ID and title to add further staff videos.
  document.querySelectorAll('[data-video-id]').forEach(play => {
    const id = play.dataset.videoId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) return;
    play.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      frame.title = play.dataset.videoTitle || 'SLS Immobilienpartner · Video';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.tabIndex = 0;
      play.replaceWith(frame);
      frame.focus();
    });
  });
})();

(() => {
  document.querySelectorAll('[data-video-gallery]').forEach(gallery => {
    const track = gallery.querySelector('[data-video-track]');
    const cards = [...track.querySelectorAll('.profile-video-card')];
    if (cards.length < 2) { track.removeAttribute('tabindex'); return; }
    gallery.classList.add('has-multiple-videos');
    const controls = gallery.querySelector('.profile-video-controls');
    controls.hidden = false;
    const prev = controls.querySelector('[data-video-prev]');
    const next = controls.querySelector('[data-video-next]');
    const position = controls.querySelector('[data-video-position]');
    const step = () => cards[1].offsetLeft - cards[0].offsetLeft;
    const index = () => Math.min(cards.length - 1, Math.max(0, Math.round(track.scrollLeft / step())));
    const sync = () => { const n = index(); prev.disabled = n === 0; next.disabled = n === cards.length - 1; position.textContent = `${n + 1} / ${cards.length}`; };
    const move = direction => track.scrollBy({left:direction * step(), behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    prev.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    track.addEventListener('keydown', event => {
      if (event.target !== track || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
    });
    track.addEventListener('scroll', sync, {passive:true});
    window.addEventListener('resize', sync);
    sync();
  });

  const section = document.querySelector('[data-profile-reviews]');
  if (!section) return;
  const safeGoogleUrl = raw => {
    try { const url = new URL(raw); return url.protocol === 'https:' && (url.hostname === 'google.com' || url.hostname.endsWith('.google.com') || url.hostname === 'share.google' || url.hostname === 'maps.app.goo.gl') ? url.href : null; } catch { return null; }
  };
  async function loadReviews() {
    try {
      const response = await fetch(`/api/profile-reviews?profile=${encodeURIComponent(section.dataset.profileReviews)}`);
      if (!response.ok) return;
      const data = await response.json();
      const companyUrl = safeGoogleUrl(data.company?.url);
      if (!data.available || !companyUrl || !Number.isFinite(data.company.rating)) return;
      const review = data.personalReview;
      const original = safeGoogleUrl(review?.googleMapsUri);
      if (review?.text && original) {
        const name = section.dataset.profileName || data.profileName || 'Filippo Livera';
        section.querySelector('[data-review-heading]').textContent = `Erfahrungen mit ${name}.`;
        section.querySelector('[data-review-context]').textContent = 'Eine ausgewählte Google-Bewertung zur persönlichen Beratung.';
        const words = review.text.trim().split(/\s+/);
        section.querySelector('[data-review-text]').textContent = `„${words.slice(0,25).join(' ')}${words.length > 25 ? ' …' : ''}“`;
        section.querySelector('.profile-google-label').textContent = 'Google-Bewertung · Auszug';
        const stars = section.querySelector('[data-review-stars]');
        stars.textContent = '★'.repeat(Math.min(5, Math.max(0, Math.round(review.rating))));
        stars.setAttribute('aria-label', `${review.rating} von 5 Sternen`);
        const author = section.querySelector('[data-review-author]'); author.textContent = review.author; author.href = safeGoogleUrl(review.authorUri) || original;
        const date = new Date(review.publishTime);
        if (!Number.isNaN(date.getTime())) { const time = section.querySelector('[data-review-date]'); time.dateTime = date.toISOString(); time.textContent = date.toLocaleDateString('de-DE'); }
        section.querySelector('[data-review-original]').href = original;
        if (review.individualLink === false) section.querySelector('[data-review-original]').textContent = 'Bewertung auf Google nachlesen';
        section.querySelector('[data-personal-review]').hidden = false;
        section.hidden = false;
      }
    } catch { /* Keep the verified editorial excerpt when the live connection is unavailable. */ }
  }
  // Fetch once per visit near the section, without storing Google content in the browser.
  if ('IntersectionObserver' in window) {
    const anchor = section.previousElementSibling;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); loadReviews(); } }, {rootMargin:'300px'});
    observer.observe(anchor);
  } else loadReviews();
})();

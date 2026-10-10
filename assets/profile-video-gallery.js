(() => {
  document.querySelectorAll('[data-profile-video-gallery]').forEach(gallery => {
    const track = gallery.querySelector('[data-video-track]');
    const cards = [...track.querySelectorAll('.profile-video-card')];
    if (!cards.length) return;
    const players = cards.map(card => card.querySelector('.profile-video-player'));
    const previews = players.map(player => player.innerHTML);
    const controls = gallery.querySelector('[data-video-controls]');
    const previous = controls.querySelector('[data-video-prev]');
    const next = controls.querySelector('[data-video-next]');
    const position = controls.querySelector('[data-video-position]');
    gallery.classList.toggle('has-multiple-videos', cards.length > 1);
    gallery.classList.toggle('only-reels', cards.every(card => card.dataset.videoProvider === 'instagram'));
    controls.hidden = cards.length < 2;
    if (cards.length < 2) track.removeAttribute('tabindex');

    const frameFor = (src, title, autoplay = false) => {
      const frame = document.createElement('iframe');
      frame.src = src;
      frame.title = title;
      frame.allow = `${autoplay ? 'autoplay; ' : ''}encrypted-media; picture-in-picture; fullscreen`;
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      return frame;
    };
    const loadReel = index => {
      const player = players[index];
      const id = player.dataset.reelId;
      if (!/^[A-Za-z0-9_-]{11}$/.test(id || '') || player.querySelector('iframe')) return;
      player.replaceChildren(frameFor(`https://www.instagram.com/reel/${id}/embed/`, cards[index].querySelector('h3').textContent));
    };
    const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const step = () => cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : cards[0].clientWidth;
    const sync = () => {
      const left = Math.max(0, track.scrollLeft);
      const first = Math.min(cards.length - 1, Math.round(left / step()));
      previous.hidden = next.hidden = maxScroll() < 2;
      previous.disabled = left < 2;
      next.disabled = left >= maxScroll() - 2;
      position.textContent = maxScroll() < 2 ? `${cards.length} Videos` : `${first + 1} von ${cards.length}`;
    };
    const moveTo = index => track.scrollTo({ left: Math.min(maxScroll(), Math.max(0, index * step())), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    previous.addEventListener('click', () => moveTo(Math.ceil(track.scrollLeft / step()) - 1));
    next.addEventListener('click', () => moveTo(Math.floor(track.scrollLeft / step()) + 1));
    track.addEventListener('scroll', sync, { passive: true });
    track.addEventListener('keydown', event => {
      if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      moveTo(event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : Math.round(track.scrollLeft / step()) + (event.key === 'ArrowRight' ? 1 : -1));
    });
    gallery.addEventListener('click', event => {
      const play = event.target.closest('[data-video-id]');
      if (!play || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const index = cards.findIndex(card => card.contains(play));
      const id = play.dataset.videoId;
      if (index < 0 || !/^[A-Za-z0-9_-]{11}$/.test(id || '')) return;
      event.preventDefault();
      // Stop other YouTube players when starting a new one.
      players.forEach((player, other) => {
        if (other !== index && cards[other].dataset.videoProvider === 'youtube') player.innerHTML = previews[other];
      });
      const frame = frameFor(`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`, play.dataset.videoTitle, true);
      players[index].replaceChildren(frame);
      frame.focus({ preventScroll: true });
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const index = cards.indexOf(entry.target);
          if (entry.isIntersecting) loadReel(index);
          else if (players[index].querySelector('iframe')) players[index].innerHTML = previews[index];
        });
      }, { threshold: 0.15 });
      cards.forEach(card => observer.observe(card));
    } else cards.forEach((_, index) => loadReel(index));
    new ResizeObserver(sync).observe(track);
    sync();
  });
})();

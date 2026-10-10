(() => {
  document.querySelectorAll('[data-profile-video-gallery]').forEach(gallery => {
    const track = gallery.querySelector('[data-video-track]');
    const cards = [...track.querySelectorAll('.profile-video-card')];
    if (!cards.length) return;
    const players = cards.map(card => card.querySelector('.profile-video-player'));
    const previews = players.map(player => player.innerHTML);
    const controls = gallery.querySelector('[data-video-controls]');
    const choices = gallery.querySelector('[data-video-choices]');
    const previous = controls.querySelector('[data-video-prev]');
    const next = controls.querySelector('[data-video-next]');
    const position = controls.querySelector('[data-video-position]');
    let selected = 0;
    let visible = false;

    gallery.classList.toggle('has-reels', cards.some(card => card.dataset.videoProvider === 'instagram'));
    gallery.classList.toggle('has-multiple-videos', cards.length > 1);
    gallery.classList.toggle('only-reels', cards.every(card => card.dataset.videoProvider === 'instagram'));

    const frameFor = (src, title, autoplay = false) => {
      const frame = document.createElement('iframe');
      frame.src = src;
      frame.title = title;
      frame.allow = `${autoplay ? 'autoplay; ' : ''}encrypted-media; picture-in-picture; fullscreen`;
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      return frame;
    };
    const loadSelectedReel = () => {
      const player = players[selected];
      const id = player.dataset.reelId;
      if (!visible || !/^[A-Za-z0-9_-]{11}$/.test(id || '') || player.querySelector('iframe')) return;
      const title = cards[selected].querySelector('h3').textContent;
      player.replaceChildren(frameFor(`https://www.instagram.com/reel/${id}/embed/`, title));
    };
    const buttons = cards.map((card, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'profile-video-choice';
      button.setAttribute('aria-label', `Video ${index + 1} auswählen: ${card.querySelector('h3').textContent}`);
      const symbol = document.createElement('span');
      symbol.className = 'profile-video-choice-symbol';
      symbol.textContent = '▶';
      symbol.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span');
      const provider = document.createElement('small');
      provider.textContent = card.dataset.videoProvider === 'instagram' ? 'Instagram · Reel' : 'YouTube · Video';
      const title = document.createElement('span');
      title.textContent = card.querySelector('h3').textContent;
      copy.append(provider, title);
      button.append(symbol, copy);
      button.addEventListener('click', () => select(index));
      choices.append(button);
      return button;
    });
    const sync = () => {
      previous.disabled = selected === 0;
      next.disabled = selected === cards.length - 1;
      position.textContent = `${selected + 1} von ${cards.length}`;
      buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === selected)));
      cards.forEach((card, index) => {
        card.hidden = index !== selected;
        card.inert = index !== selected;
        card.setAttribute('aria-hidden', String(index !== selected));
      });
    };
    function select(index) {
      if (index < 0 || index >= cards.length) return;
      if (index !== selected) {
        // Removing the old iframe stops playback for either provider.
        players[selected].innerHTML = previews[selected];
        selected = index;
      }
      sync();
      loadSelectedReel();
    }
    controls.hidden = choices.hidden = cards.length < 2;
    if (cards.length < 2) track.removeAttribute('tabindex');
    previous.addEventListener('click', () => select(selected - 1));
    next.addEventListener('click', () => select(selected + 1));
    track.addEventListener('keydown', event => {
      if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      select(event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : selected + (event.key === 'ArrowRight' ? 1 : -1));
    });
    // Swipe on the gallery's own caption area; iframe controls remain independent.
    let swipeStart = null;
    track.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || event.target.closest('a, button, iframe')) return;
      swipeStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    });
    track.addEventListener('pointerup', event => {
      if (!swipeStart || swipeStart.id !== event.pointerId) return;
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(dx) >= 56 && Math.abs(dx) > Math.abs(dy) * 1.2) select(selected + (dx < 0 ? 1 : -1));
    });
    track.addEventListener('pointercancel', () => { swipeStart = null; });
    gallery.addEventListener('click', event => {
      const play = event.target.closest('[data-video-id]');
      if (!play || !cards[selected].contains(play) || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const id = play.dataset.videoId;
      if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) return;
      event.preventDefault();
      const frame = frameFor(`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`, play.dataset.videoTitle, true);
      players[selected].replaceChildren(frame);
      frame.focus({ preventScroll: true });
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        visible = true;
        loadSelectedReel();
        observer.disconnect();
      }, { rootMargin: '200px 0px' });
      observer.observe(gallery);
    } else {
      visible = true;
    }
    select(0);
  });
})();

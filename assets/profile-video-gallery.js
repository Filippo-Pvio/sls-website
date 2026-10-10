(() => {
  document.querySelectorAll('[data-profile-video-gallery]').forEach(gallery => {
    const track = gallery.querySelector('[data-video-track]');
    const cards = [...track.querySelectorAll('.profile-video-card')];
    if (!cards.length) return;
    const players = cards.map(card => card.querySelector('.profile-video-player'));
    players.forEach((player, index) => {
      if (!player.dataset.reelId) return;
      const preview = document.createElement('div');
      preview.className = 'profile-reel-placeholder';
      preview.setAttribute('aria-hidden', 'true');
      const provider = document.createElement('small');
      provider.textContent = 'Instagram · Reel';
      const symbol = document.createElement('span');
      symbol.textContent = '▶';
      const title = document.createElement('strong');
      title.textContent = cards[index].querySelector('h3').textContent;
      preview.append(provider, symbol, title);
      player.replaceChildren(preview);
    });
    const previews = players.map(player => player.innerHTML);
    const controls = gallery.querySelector('[data-video-controls]');
    const previous = controls.querySelector('[data-video-prev]');
    const next = controls.querySelector('[data-video-next]');
    const position = controls.querySelector('[data-video-position]');
    let selected = 0;
    let visible = false;
    let swipe = null;
    let ignoreClickUntil = 0;
    gallery.classList.toggle('has-multiple-videos', cards.length > 1);
    gallery.classList.toggle('has-reels', cards.some(card => card.dataset.videoProvider === 'instagram'));
    gallery.classList.toggle('only-reels', cards.every(card => card.dataset.videoProvider === 'instagram'));
    gallery.setAttribute('role', 'region');
    gallery.setAttribute('aria-roledescription', 'Karussell');
    controls.hidden = cards.length < 2;
    if (cards.length < 2) track.removeAttribute('tabindex');
    else {
      const hint = document.createElement('p');
      hint.className = 'profile-carousel-hint';
      hint.textContent = 'Weitere Einblicke entdecken · Wischen oder Pfeile nutzen';
      controls.before(hint);
    }
    const buttons = cards.map((card, index) => {
      card.setAttribute('role', 'group');
      card.setAttribute('aria-roledescription', 'Video');
      card.setAttribute('aria-label', `${index + 1} von ${cards.length}`);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'profile-video-cover-button';
      button.setAttribute('aria-label', `Video auswählen: ${card.querySelector('h3').textContent}`);
      const label = document.createElement('span');
      label.textContent = 'Video auswählen →';
      button.append(label);
      button.addEventListener('click', () => {
        if (performance.now() < ignoreClickUntil) return;
        select(index);
        track.focus({ preventScroll: true });
      });
      card.append(button);
      return button;
    });
    const frameFor = (src, title, autoplay = false) => {
      const frame = document.createElement('iframe');
      frame.src = src;
      frame.title = title;
      frame.allow = `${autoplay ? 'autoplay; ' : ''}encrypted-media; picture-in-picture; fullscreen`;
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      return frame;
    };
    const distance = index => {
      let delta = index - selected;
      if (cards.length > 2) {
        if (delta > cards.length / 2) delta -= cards.length;
        if (delta < -cards.length / 2) delta += cards.length;
      }
      return delta;
    };
    const loadReels = () => {
      if (!visible) return;
      cards.forEach((card, index) => {
        const id = players[index].dataset.reelId;
        if (Math.abs(distance(index)) > 1 || !/^[A-Za-z0-9_-]{11}$/.test(id || '') || players[index].querySelector('iframe')) return;
        const frame = frameFor(`https://www.instagram.com/reel/${id}/embed/`, card.querySelector('h3').textContent);
        frame.style.opacity = '0';
        frame.addEventListener('load', () => { frame.style.opacity = '1'; }, { once: true });
        players[index].append(frame);
      });
    };
    const sizeStage = () => {
      if (cards.length < 2) return;
      // Reserve the tallest card so choosing a different format never moves the page.
      const height = Math.ceil(Math.max(...cards.map(card => card.offsetHeight)));
      track.style.height = `${height + 32}px`;
      cards.forEach(card => card.style.setProperty('--video-top', `${16 + (height - card.offsetHeight) / 2}px`));
    };
    function select(index) {
      const nextIndex = (index + cards.length) % cards.length;
      if (nextIndex !== selected) {
        // Recreate the previous player to stop playback, including Instagram.
        players[selected].innerHTML = previews[selected];
        selected = nextIndex;
      }
      cards.forEach((card, cardIndex) => {
        const delta = distance(cardIndex);
        const active = delta === 0;
        const nearby = Math.abs(delta) <= 1;
        card.classList.toggle('is-active', active);
        card.classList.toggle('is-before', delta === -1);
        card.classList.toggle('is-after', delta === 1);
        card.classList.toggle('is-distant', !nearby);
        card.style.setProperty('--video-offset', delta);
        card.setAttribute('aria-current', String(active));
        players[cardIndex].inert = !active;
        card.querySelector('.profile-media-copy').inert = !active;
        buttons[cardIndex].hidden = active || !nearby || cards.length < 2;
        if (!nearby) players[cardIndex].innerHTML = previews[cardIndex];
      });
      position.textContent = `${selected + 1} von ${cards.length}`;
      loadReels();
      sizeStage();
    }
    previous.addEventListener('click', () => select(selected - 1));
    next.addEventListener('click', () => select(selected + 1));
    track.addEventListener('keydown', event => {
      if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      select(event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : selected + (event.key === 'ArrowRight' ? 1 : -1));
    });
    // The card captions and preview covers accept swipes; embedded players keep their controls.
    track.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || event.target.closest('a, iframe')) return;
      swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
    });
    track.addEventListener('pointerup', event => {
      if (!swipe || swipe.id !== event.pointerId) return;
      const dx = event.clientX - swipe.x;
      const dy = event.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        ignoreClickUntil = performance.now() + 400;
        select(selected + (dx < 0 ? 1 : -1));
      }
    });
    track.addEventListener('pointercancel', () => { swipe = null; });
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
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) loadReels();
      else players.forEach((player, index) => { player.innerHTML = previews[index]; });
    }, { threshold: 0 });
    observer.observe(track);
    const resize = new ResizeObserver(sizeStage);
    cards.forEach(card => resize.observe(card));
    select(0);
  });
})();

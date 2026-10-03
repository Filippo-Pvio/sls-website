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

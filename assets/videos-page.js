(() => {
  const players = [...document.querySelectorAll('[data-interview-player]')];
  const previews = new Map(players.map(player => [player, player.innerHTML]));
  document.addEventListener('click', event => {
    const play = event.target.closest('[data-interview-play]');
    if (!play || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const id = play.dataset.interviewPlay;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    event.preventDefault();
    const player = play.closest('[data-interview-player]');
    players.forEach(other => { if (other !== player) other.innerHTML = previews.get(other); });
    const frame = document.createElement('iframe');
    frame.title = play.dataset.videoTitle;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    window.SLSConsent?.frame(frame, `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`);
    player.replaceChildren(frame);
    frame.focus({ preventScroll: true });
  });
})();

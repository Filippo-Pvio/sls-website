(() => {
  const button = document.querySelector('[data-home-reel-load]');
  if (!button) return;
  button.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.className = 'home-reach-reel-frame';
    frame.title = 'SLS Instagram-Reel: Gina präsentiert ein Einfamilienhaus in Brüggen-Bracht';
    frame.src = 'https://www.instagram.com/reel/DdCBh6HIWJE/embed/';
    frame.allow = 'encrypted-media; fullscreen; picture-in-picture';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    button.replaceWith(frame);
    frame.focus({ preventScroll: true });
  }, { once: true });
})();

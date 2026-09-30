(() => {
 const play = document.querySelector('.sell-video-play');
 play?.addEventListener('click', () => {
  const frame = document.createElement('iframe');
  frame.src = 'https://www.youtube-nocookie.com/embed/-Pby-CF9f04?autoplay=1&rel=0';
  frame.title = 'SLS Immobilienpartner – Video zum Immobilienverkauf';
  frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  play.replaceWith(frame);
  frame.focus();
 }, { once: true });
})();

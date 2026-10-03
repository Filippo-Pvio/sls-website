document.querySelectorAll('[data-load-map]').forEach(button => {
  button.addEventListener('click', () => {
    const container = button.closest('[data-map-url]');
    const frame = document.createElement('iframe');
    frame.title = 'Anfahrt zu SLS Immobilienpartner';
    frame.src = container.dataset.mapUrl;
    frame.referrerPolicy = 'no-referrer-when-downgrade';
    frame.allowFullscreen = true;
    container.replaceChildren(frame);
  }, { once: true });
});

(() => {
  const frame = document.getElementById('buy-budget-frame');
  if (!frame) return;
  window.addEventListener('message', (event) => {
    if (event.origin !== 'https://budget-check.justhome.com' || event.source !== frame.contentWindow || event.data?.type !== 'resize') return;
    const height = Number(event.data.height);
    if (Number.isFinite(height) && height >= 200 && height <= 10000) frame.height = String(Math.ceil(height));
  });
})();

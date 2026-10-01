(() => {
 const form = document.getElementById('guide-form');
 const select = document.getElementById('guide-select');
 if (!form || !select) return;
 // Layout preview only: never submit or store contact details before dispatch is connected.
 form.addEventListener('submit', event => event.preventDefault());
 document.querySelectorAll('[data-guide]').forEach(link => link.addEventListener('click', () => {
  if (![...select.options].some(option => option.value === link.dataset.guide)) return;
  select.value = link.dataset.guide;
  select.focus({preventScroll:true});
 }));
})();

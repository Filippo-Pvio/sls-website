(() => {
 const form = document.getElementById('guide-form');
 const select = document.getElementById('guide-select');
 if (!form || !select) return;
 const status = document.getElementById('guide-availability');
 const fields = form.querySelector('fieldset');
 const button = form.querySelector('button[type="submit"]');
 const email = form.elements.email;
 const firstName = form.elements.firstName;
 const lastName = form.elements.lastName;
 const reviewActions = document.getElementById('guide-review-actions');
 const correctButton = document.getElementById('guide-correct');
 const endpoint = '/api/propstack-guide-request';
 let token = null;
 let sending = false;
 let completed = false;
 function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle('is-error', error);
 }
 document.querySelectorAll('[data-guide]').forEach(link => link.addEventListener('click', () => {
  if (sending || completed || ![...select.options].some(option => !option.disabled && option.value === link.dataset.guide)) return;
  select.value = link.dataset.guide;
  (fields.disabled ? select : firstName).focus({preventScroll:true});
 }));
 async function prepare(correction = false) {
  token = null;
  try {
   const response = await fetch(endpoint, {headers:{Accept:'application/json'}, cache:'no-store'});
   const data = await response.json();
   if (!response.ok || !data.availableGuides?.includes('VERKAUF') || !data.token) throw new Error(data.error || 'Die Ratgeberanforderung ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut.');
   token = data.token;
   window.setTimeout(() => {
    fields.disabled = false;
    button.disabled = false;
    button.textContent = 'Ratgeber anfordern';
    select.disabled = false;
    message(correction ? 'Bitte prüfen und korrigieren Sie Ihre Angaben. Senden Sie die Anforderung anschließend erneut ab.' : 'Der E-Mail-Versand wird derzeit eingerichtet. Sie können Ihre Anforderung bereits hinterlegen.');
    if (correction) {
     reviewActions.hidden = true;
     firstName.focus({preventScroll:true});
    }
   }, 1600);
  } catch (error) {
   if (correction) correctButton.disabled = false;
   button.textContent = 'Derzeit nicht verfügbar';
   message(error.message || 'Die Ratgeberanforderung ist gerade nicht verfügbar. Bitte kontaktieren Sie uns direkt.', true);
  }
 }
 correctButton.addEventListener('click', () => {
  if (sending || completed || correctButton.disabled) return;
  correctButton.disabled = true;
  button.textContent = 'Wird vorbereitet …';
  prepare(true);
 });
 form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending || completed || !token || fields.disabled || !form.reportValidity()) return;
  const payload = {guide:select.value, email:email.value.trim(), firstName:firstName.value.trim(), lastName:lastName.value.trim(), token, website:form.elements.website.value};
  sending = true;
  select.disabled = true;
  fields.disabled = true;
  form.setAttribute('aria-busy', 'true');
  button.textContent = 'Wird übermittelt …';
  message('Ihre Anforderung wird aufgenommen …');
  try {
   const response = await fetch(endpoint, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
   });
   const data = await response.json();
   if (!response.ok || data.ok !== true) throw new Error(data.error || 'Ihre Anforderung konnte nicht bestätigt werden. Bitte kontaktieren Sie uns direkt.');
   if (data.status === 'review_required') {
    reviewActions.hidden = false;
    correctButton.disabled = false;
    button.textContent = 'Anforderung zur Prüfung gespeichert';
    message(data.message);
    return;
   }
   completed = true;
   email.value = '';
   firstName.value = '';
   lastName.value = '';
   button.textContent = 'Anforderung aufgenommen';
   message(data.message);
  } catch (error) {
   message(error.message || 'Ihre Anforderung konnte nicht bestätigt werden. Bitte kontaktieren Sie uns direkt, bevor Sie sie erneut absenden.', true);
   select.disabled = false;
   fields.disabled = false;
   button.textContent = 'Erneut versuchen';
  } finally {
   sending = false;
   form.removeAttribute('aria-busy');
   status.focus({preventScroll:true});
  }
 });
 prepare();
})();

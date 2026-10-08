(() => {
  const secureFormFetch=(...args)=>import('/assets/form-security.js').then(module=>module.formFetch(...args));
 const form = document.getElementById('guide-form');
 const select = document.getElementById('guide-select');
 if (!form || !select) return;
 const status = document.getElementById('guide-availability');
 const fields = form.querySelector('fieldset');
 const button = form.querySelector('button[type="submit"]');
 const email = form.elements.email;
 const salutation = form.elements.salutation;
 const firstName = form.elements.firstName;
 const lastName = form.elements.lastName;
 const reviewActions = document.getElementById('guide-review-actions');
 const correctButton = document.getElementById('guide-correct');
 const privacyAcknowledged = form.elements.privacyAcknowledged;
 const marketingConsent = form.elements.marketingConsent;
 const marketingAvailability = document.getElementById('guide-marketing-availability');
 const endpoint = '/api/propstack-guide-request';
 let token = null;
 let sending = false;
 let completed = false;
 function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle('is-error', error);
 }
 document.querySelectorAll('[data-guide]').forEach(link => link.addEventListener('click', event => {
  if (sending || completed || ![...select.options].some(option => !option.disabled && option.value === link.dataset.guide)) { event.preventDefault(); return; }
  select.value = link.dataset.guide;
  (fields.disabled ? select : firstName).focus({preventScroll:true});
 }));
 async function prepare(correction = false) {
  token = null;
  try {
   const response = await secureFormFetch(endpoint, {headers:{Accept:'application/json'}, cache:'no-store'});
   const data = await response.json();
   if (!response.ok || !Array.isArray(data.availableGuides) || !data.availableGuides.length || !data.token) throw new Error(data.error || 'Die Ratgeberanforderung ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut.');
   token = data.token;
   for (const option of select.options) option.disabled = !data.availableGuides.includes(option.value);
   if (![...select.options].some(option => option.value === select.value && !option.disabled)) select.value = [...select.options].find(option => !option.disabled)?.value || '';
   document.querySelectorAll('[data-guide]').forEach(link => {
    const available = data.availableGuides.includes(link.dataset.guide);
    link.setAttribute('aria-disabled', String(!available));
    link.textContent = available ? 'Ratgeber auswählen ↗' : 'Derzeit nicht verfügbar';
   });
   const marketingAvailable = data.marketingAvailable === true && data.consentVersion === marketingConsent.dataset.consentVersion;
   marketingConsent.disabled = !marketingAvailable;
   if (!marketingAvailable) marketingConsent.checked = false;
   marketingAvailability.textContent = marketingAvailable ? 'Ihre Anmeldung wird erst nach Ihrer Bestätigung per E-Mail aktiviert.' : 'Die Newsletter-Anmeldung wird noch eingerichtet. Ihren Ratgeber können Sie bereits anfordern.';
   window.setTimeout(() => {
    fields.disabled = false;
    button.disabled = false;
    button.textContent = 'Ratgeber anfordern';
    select.disabled = false;
    message(correction ? 'Bitte prüfen und korrigieren Sie Ihre Angaben. Senden Sie die Anforderung anschließend erneut ab.' : 'Sie erhalten den ausgewählten Ratgeber per E-Mail.' + (marketingAvailable ? ' Weitere Tipps und Angebote können Sie freiwillig abonnieren.' : ''));
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
  if (!privacyAcknowledged.checked) {
   message('Bitte bestätigen Sie, dass Sie die Datenschutzerklärung zur Kenntnis genommen haben.', true);
   privacyAcknowledged.focus();
   return;
  }
  const payload = {salutation:salutation.value, privacyAcknowledged:privacyAcknowledged.checked, privacyVersion:privacyAcknowledged.dataset.privacyVersion, guide:select.value, email:email.value.trim(), firstName:firstName.value.trim(), lastName:lastName.value.trim(), token, website:form.elements.website.value, marketingConsent:!marketingConsent.disabled && marketingConsent.checked, consentVersion:marketingConsent.dataset.consentVersion};
  sending = true;
  select.disabled = true;
  fields.disabled = true;
  form.setAttribute('aria-busy', 'true');
  button.textContent = 'Wird übermittelt …';
  message('Ihre Anforderung wird aufgenommen …');
  try {
   const response = await secureFormFetch(endpoint, {
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
   salutation.value = '';
   firstName.value = '';
   lastName.value = '';
   privacyAcknowledged.checked = false;
   marketingConsent.checked = false;
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

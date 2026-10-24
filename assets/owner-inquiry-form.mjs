export const ownerAddressFields = `<fieldset class="pp-owner-address" id="pp-owner-address" hidden disabled>
  <legend>Ihre eigene Immobilie</legend>
  <p>Bitte nennen Sie die Adresse der Immobilie, die Sie bewerten lassen möchten.</p>
  <div class="pp-form-grid">
    <label><span>Straße *</span><input name="ownerStreet" autocomplete="section-owner address-line1" maxlength="120" required></label>
    <label><span>Hausnummer *</span><input name="ownerHouseNumber" maxlength="20" required></label>
    <label><span>PLZ *</span><input name="ownerZip" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" autocomplete="section-owner postal-code" required></label>
    <label><span>Ort *</span><input name="ownerCity" maxlength="100" autocomplete="section-owner address-level2" required></label>
    <label class="pp-full"><span>Objektart *</span><select name="ownerType" required>
      <option value="">Bitte auswählen</option><option value="HOUSE">Haus</option><option value="APARTMENT">Wohnung</option><option value="TRADE_SITE">Grundstück</option>
    </select></label>
    <label class="pp-full" data-owner-unit hidden><span>Wohnung / Lage im Haus *</span><input name="ownerUnit" maxlength="100" disabled placeholder="z. B. 2. Obergeschoss links, Wohnung 5"></label>
  </div><p class="form-required-note">Für Immobilien in Deutschland. * Pflichtfelder.</p>
</fieldset>`;

export function setupOwnerAddress(form) {
  const toggle=form.elements.ownerInterest, fields=form.querySelector('.pp-owner-address');
  const unit=form.elements.ownerUnit, unitLabel=form.querySelector('[data-owner-unit]');
  const sync=()=>{
    fields.hidden=!toggle.checked;
    fields.disabled=!toggle.checked;
    toggle.setAttribute('aria-expanded',String(toggle.checked));
    const apartment=toggle.checked&&form.elements.ownerType.value==='APARTMENT';
    unitLabel.hidden=!apartment;
    unit.disabled=!apartment;
    unit.required=apartment;
  };
  toggle.setAttribute('aria-controls',fields.id);
  toggle.addEventListener('change',sync);
  form.elements.ownerType.addEventListener('change',sync);
  // reset fires before the browser resets the controls.
  form.addEventListener('reset',()=>queueMicrotask(sync));
  sync();
}

import {profileReviewAssignments} from '../config/profile-reviews.mjs';
const normalize = value => String(value || '').normalize('NFKC').trim().toLocaleLowerCase('de-DE');
function resolve(field, brokers) {
  const value = field && typeof field === 'object' && 'value' in field ? field.value : field;
  const id = value && typeof value === 'object' ? value.id : value;
  return brokers.get(String(id || '')) || (value && typeof value === 'object' ? value : null);
}
export function referenceParticipants(unit, brokers, registry = profileReviewAssignments) {
  const fields = unit.custom_fields || {};
  const sale = resolve(fields.verkaufsmakler, brokers);
  const purchase = resolve(fields.einkaufsmakler, brokers);
  const primary = brokers.get(String(unit.broker_id || unit.broker?.id || '')) || unit.broker;
  const participants = [];
  for (const [role, broker] of [['sale',sale || primary],['acquisition',purchase]]) {
    if (!broker) continue;
    const matches = Object.entries(registry).filter(([,p]) => normalize(p.name) === normalize(broker.name));
    if (matches.length !== 1) continue;
    participants.push({profile:matches[0][0],role});
  }
  return participants;
}
export function hasReferenceRoles(unit) {
  return unit.custom_fields && Object.hasOwn(unit.custom_fields,'einkaufsmakler') && Object.hasOwn(unit.custom_fields,'verkaufsmakler');
}

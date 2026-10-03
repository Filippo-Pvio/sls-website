// Shared by the city page and its filtered listing destination.
const normalise = value => String(value || '').trim().toLocaleLowerCase('de-DE')
  .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
  .replace(/[–—]/g,'-').replace(/\s+/g,' ');
export function matchesMarketCity(item, city) {
  const place = normalise(item?.city), target = normalise(city);
  if (!place || !target) return false;
  // Distinguish the NRW market area from the namesake in Hessen when a ZIP exists.
  if (target === 'borken' && /^345/.test(String(item.zip || item.zip_code || ''))) return false;
  const names = target === 'haltern am see' ? [target,'haltern'] : [target];
  if (target === 'dorsten' && place === 'lembeck') return true;
  return names.some(name => place === name || ['-', ' -', ' / ', ' (', ', '].some(separator => place.startsWith(name + separator)));
}

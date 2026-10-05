// Shared by the city page and its filtered listing destination.
const normalise = value => String(value || '').trim().toLocaleLowerCase('de-DE')
  .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
  .replace(/[–—]/g,'-').replace(/\s+/g,' ');

const MARKET_CITIES = {
  'bochum': { zip:/^44[78]\d{2}$/, districts:['wattenscheid','stiepel','linden','langendreer'] },
  'borken': { zip:/^46325$/, districts:['gemen','weseke','burlo','marbeck'] },
  'bottrop': { zip:/^462\d{2}$/, districts:['kirchhellen'] },
  'castrop-rauxel': { zip:/^445(?:7[5-9]|81)$/, districts:['ickern','habinghorst','castrop','rauxel'] },
  'coesfeld': { zip:/^48653$/, districts:['lette'] },
  'datteln': { zip:/^45711$/, districts:['ahsen','horneburg'] },
  'dorsten': { zip:/^4628[246]$/, districts:['altstadt','hardt','feldmark','hervest','holsterhausen','lembeck','rhade','deuten','wulfen','oestrich','altendorf-ulfkotte'] },
  'dortmund': { zip:/^44[123]\d{2}$/, districts:['hoerde','hombruch'] },
  'duesseldorf': { zip:/^40[245]\d{2}$/, districts:['bilk','unterbilk','hamm','volmerswerth'] },
  'essen': { zip:/^45[123]\d{2}$/, districts:['werden','heisingen'] },
  'gladbeck': { zip:/^4596[468]$/, districts:['rentfort','zweckel','brauck'] },
  'haltern am see': { zip:/^45721$/, districts:['haltern','haltern-mitte','sythen','lippramsdorf','hullern','flaesheim'] },
  'herten': { zip:/^(?:45699|45701)$/, districts:['westerholt','scherlebeck'] },
  'krefeld': { zip:/^47[78]\d{2}$/, districts:['uerdingen','huels','fischeln'] },
  'marl': { zip:/^457(?:68|70|72)$/, districts:['alt-marl','drewer','huels','polsum'] },
  'meerbusch': { zip:/^406(?:67|68|70)$/, districts:['buederich','osterath','lank-latum'] },
  'mettmann': { zip:/^40822$/, districts:['metzkausen','obschwarzbach'] },
  'moers': { zip:/^4744[1357]$/, districts:['meerbeck','kapellen','repelen'] },
  'ratingen': { zip:/^408(?:78|80|82|83|85)$/, districts:['lintorf','hoesel','breitscheid'] },
  'recklinghausen': { zip:/^456(?:57|59|61|63|65)$/, districts:['suderwich','hochlarmark'] },
  'schermbeck': { zip:/^46514$/, districts:['altschermbeck','gahlen'] },
  'unna': { zip:/^5942[357]$/, districts:['koenigsborn','luenern','hemmerde'] },
  'viersen': { zip:/^417(?:47|48|49|51)$/, districts:['alt-viersen','duelken','suechteln','boisheim'] },
  'witten': { zip:/^5845[23456]$/, districts:['herbede','annen','heven'] }
};

const beginsWithName = (place,name) =>
  place === name || ['-', ' -', ' / ', ' (', ', '].some(separator => place.startsWith(name + separator));

export function matchesMarketCity(item, city) {
  const place = normalise(item?.city), target = normalise(city);
  if (!place || !target) return false;

  const rule = MARKET_CITIES[target];
  const zip = String(item?.zip || item?.zip_code || '').trim();

  // The named city itself is valid, but a contradictory postal code rejects
  // namesakes such as Borken (NRW) versus Borken in Hessen.
  if (beginsWithName(place,target)) {
    if (rule && zip && !rule.zip.test(zip)) return false;
    return true;
  }

  if (!rule) return false;

  // District-only values are accepted only when the postal code confirms the
  // same municipality. This keeps local references trustworthy.
  if (!zip || !rule.zip.test(zip)) return false;
  return rule.districts.some(name => beginsWithName(place,name));
}

export const normalizePlace = value => String(value || '').trim().toLocaleLowerCase('de-DE')
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

// Nearby towns are editorial contact routing, never municipality membership.
export function searchMarketAreas(areas, query) {
  const q = normalizePlace(query);
  if (!q) return areas.map(area => ({ area, kind: 'all', place: '', score: 0 }));
  const terms = q.split(' ');
  const matches = areas.flatMap(area => {
    const candidates = [{ name: area.city, kind: 'city', aliases: area.aliases || [] },
      ...(area.districts || []).map(name => ({ name, kind: 'district', aliases: [] })),
      ...(area.nearby || []).map(name => ({ name, kind: 'nearby', aliases: [name.split(/\s+an der\s+|\s+am Rhein|\s*\(|\//)[0]] }))];
    let best = null;
    for (const candidate of candidates) {
      const names = [candidate.name, ...candidate.aliases].map(normalizePlace);
      const exact = names.includes(q);
      const compound = candidate.kind !== 'city' && names.some(name =>
        [normalizePlace(area.city) + ' ' + name, name + ' ' + normalizePlace(area.city)].includes(q));
      const prefix = q.length >= 2 && names.some(name => name.startsWith(q));
      if (!exact && !compound && !prefix) continue;
      const score = exact ? ({ city: 100, district: 90, nearby: 95 })[candidate.kind] : compound ? 75 : 60;
      if (!best || score > best.score) best = { area, kind: candidate.kind, place: candidate.name, exact: exact || compound, score };
    }
    if (!best && terms.every(term => normalizePlace(area.city + ' ' + area.text).includes(term))) {
      best = { area, kind: 'text', place: '', score: 20 };
    }
    return best ? [best] : [];
  });
  // An exact city/place wins over unrelated substring or description matches.
  const highest = Math.max(0, ...matches.map(match => match.score));
  return matches.filter(match => highest >= 75 ? match.score === highest : true)
    .sort((a, b) => b.score - a.score);
}

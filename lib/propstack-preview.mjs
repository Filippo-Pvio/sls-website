const v = x => x && typeof x === 'object' && 'value' in x ? x.value : x;
const num = x => x == null || x === '' || !Number.isFinite(Number(x)) ? null : Number(x);
const image = x => { try { const u = new URL(x); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
export function allowedIds(raw = '') { return new Set(raw.split(',').map(x => x.trim()).filter(x => /^\d+$/.test(x))); }
export function mayDisplay(unit, ids, statuses) {
  return ids.has(String(unit.id)) && !unit.archived && unit.marketing_type === 'BUY' &&
    statuses.has(String(unit.status?.id)) && unit.status?.nonpublic !== true;
}
export function publicUnit(p) {
  const images = (p.images || []).filter(x => !x.is_private && !x.is_floorplan).map(x => image(x.big_url || x.big || x.medium_url || x.medium || x.url || x.original)).filter(Boolean);
  return {
    id:String(p.id),title:String(v(p.title) || 'Immobilie'),city:String(p.city || ''),zip:String(p.zip_code || ''),
    price:num(p.price ?? p.object_price),area:num(p.living_space ?? p.property_space_value),rooms:num(p.number_of_rooms),
    bedrooms:num(p.number_of_bed_rooms),baths:num(p.number_of_bath_rooms),plot:num(p.plot_area),year:num(p.construction_year),
    type:({APARTMENT:'Wohnung',HOUSE:'Haus',INVESTMENT:'Anlageobjekt',OFFICE:'Büro',TRADE_SITE:'Grundstück'})[p.rs_type] || 'Immobilie',
    status:String(p.status?.name || ''),images,description:String(v(p.description_note) || ''),
    location:String(v(p.location_note) || ''),features:String(v(p.furnishing_note) || ''),
    courtage:String(v(p.courtage) || ''),broker:p.broker ? {name:String(p.broker.name || ''),phone:String(p.broker.phone || ''),email:String(p.broker.email || ''),photo:image(p.broker.avatar_url || p.broker.avatar)} : null
  };
}

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
  const visible = x => { const value=v(x); return value == null || value === '' ? null : String(value); };
  return {
    id:String(p.id),title:String(v(p.title) || 'Immobilie'),city:String(p.city || ''),zip:String(p.zip_code || ''),
    price:num(p.price ?? p.object_price),area:num(p.living_space ?? p.property_space_value),rooms:num(p.number_of_rooms),
    bedrooms:num(p.number_of_bed_rooms),baths:num(p.number_of_bath_rooms),plot:num(p.plot_area),year:num(p.construction_year),
    type:({APARTMENT:'Wohnung',HOUSE:'Haus',INVESTMENT:'Anlageobjekt',OFFICE:'Büro',TRADE_SITE:'Grundstück'})[p.rs_type] || 'Immobilie',
    status:String(p.status?.name || ''),images,description:String(v(p.description_note) || ''),
    location:String(v(p.location_note) || ''),features:String(v(p.furnishing_note) || ''),
    courtage:String(v(p.courtage) || ''),broker:p.broker ? {name:String(p.broker.name || ''),phone:String(p.broker.phone || ''),email:String(p.broker.email || ''),photo:image(p.broker.avatar_url || p.broker.avatar)} : null,
    propertyFacts:{freeFrom:visible(p.free_from),floor:visible(p.floor_label),condition:visible(p.condition),balconies:num(v(p.number_of_balconies)),parking:visible(p.parking_space_type),fee:num(v(p.condominium_fee)),lastRenovation:visible(p.last_refurbishment)},
    energy:{availability:visible(p.energy_certificate_availability),kind:visible(p.building_energy_rating_type),rating:visible(p.energy_efficiency_class),value:num(v(p.thermal_characteristic)),fuel:visible(p.firing_types),heating:visible(p.heating_type),validUntil:visible(p.energy_certificate_end_date),buildingYear:num(v(p.energy_certificate_construction_year))},
    amenities:[['Balkon',p.balcony === true || num(v(p.number_of_balconies)) > 0],['Garage',p.garage === true],['Garten',p.garden === true],['Keller',p.cellar === true],['Aufzug',p.lift === true]].filter(([,present])=>present).map(([label])=>label),
    flooring:visible(p.flooring_type),tour:image(p.virtual_tour_url || p.virtual_tour || p.tour_url)
  };
}

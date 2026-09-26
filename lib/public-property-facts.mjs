// Explicit publication rules: a field present in Propstack is not automatically public.
const unwrap = value => value && typeof value === 'object' && 'value' in value ? value.value : value;
const present = value => value !== null && value !== undefined && value !== '' && value !== false;
const field = (source,label,kind='text',types=null) => ({source,label,kind,types});

const standardFields = [
  {label:'Standort',read:(_p,unit)=>[unit.zip,unit.city].filter(Boolean).join(' ')},
  {label:'Objekttyp',read:(_p,unit)=>unit.type},
  {label:'Wohnfläche',kind:'area',read:(_p,unit)=>unit.area},
  field('usable_floor_space','Nutzfläche','area'),
  field('total_floor_space','Gesamtfläche','area',['Anlageobjekt','Büro']),
  {label:'Zimmer',kind:'number',read:(_p,unit)=>unit.rooms},
  {label:'Schlafzimmer',kind:'number',read:(_p,unit)=>unit.bedrooms},
  {label:'Badezimmer',kind:'number',read:(_p,unit)=>unit.baths},
  {label:'Grundstücksfläche',kind:'area',read:(_p,unit)=>unit.plot},
  field('floor_label','Etage'),
  field('number_of_balconies','Balkone','number'),
  field('number_of_terraces','Terrassen','number'),
  field('number_of_floors','Geschosse','number'),
  {label:'Stellplätze',read:(p)=>{
    const count=unwrap(p.number_of_parking_spaces),type=unwrap(p.parking_space_type);
    return present(count) ? `${count}${present(type)?` ${type}`:''}` : type;
  }},
  field('condominium_fee','Hausgeld','currency',['Wohnung']),
  field('number_of_units','Einheiten','number',['Anlageobjekt']),
  field('number_of_apartments','Wohneinheiten','number',['Anlageobjekt']),
  field('number_of_commercials','Gewerbeeinheiten','number',['Anlageobjekt']),
  field('grz','Grundflächenzahl (GRZ)','number',['Grundstück']),
  field('gfz','Geschossflächenzahl (GFZ)','number',['Grundstück']),
  field('free_from','Bezugsfrei ab'),
  {label:'Baujahr',kind:'number',read:(_p,unit)=>unit.year},
  field('last_refurbishment','Letzte Modernisierung'),
  field('interior_quality','Ausstattungsqualität'),
  field('condition','Zustand')
];

// Add a custom field only after its meaning, public use and unit are approved.
const approvedCustomFields = [];

export const publicPropertySourceFields = standardFields.map(rule=>rule.source).filter(Boolean);

export function publicPropertyFacts(property,unit) {
  return [...standardFields,...approvedCustomFields].flatMap(rule=>{
    if (rule.types && !rule.types.includes(unit.type)) return [];
    const raw=rule.read ? rule.read(property,unit) :
      rule.custom ? property.custom_fields?.[rule.source]?.pretty_value ?? property.custom_fields?.[rule.source]?.value : unwrap(property[rule.source]);
    if (!present(raw)) return [];
    const value=rule.kind==='number'||rule.kind==='area'||rule.kind==='currency' ? Number(raw) : String(raw).trim();
    if (value==='' || (typeof value==='number'&&!Number.isFinite(value))) return [];
    return [{label:rule.label,value,kind:rule.kind||'text'}];
  });
}

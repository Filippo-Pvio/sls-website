// Propstack enums: https://docs.propstack.de/reference/objekte
export const propertyTypes = {
  APARTMENT:'Wohnung', HOUSE:'Haus', TRADE_SITE:'Grundstück', INVESTMENT:'Anlageobjekt',
  OFFICE:'Büro', GARAGE:'Garage / Stellplatz', SHORT_TERM_ACCOMODATION:'Wohnen auf Zeit',
  GASTRONOMY:'Gastronomie / Hotel', INDUSTRY:'Halle / Industrie', STORE:'Einzelhandel', SPECIAL_PURPOSE:'Spezialimmobilie'
};
const categories = {
  ROOF_STOREY:'Dachgeschosswohnung', LOFT:'Loft', MAISONETTE:'Maisonette', PENTHOUSE:'Penthouse',
  TERRACED_FLAT:'Terrassenwohnung', GROUND_FLOOR:'Erdgeschosswohnung', APARTMENT:'Etagenwohnung',
  RAISED_GROUND_FLOOR:'Hochparterre', HALF_BASEMENT:'Souterrain', ATTIKA:'Attikawohnung', OTHER:'Sonstige',
  SINGLE_FAMILY_HOUSE:'Einfamilienhaus', TWO_FAMILY_HOUSE:'Zweifamilienhaus', TERRACE_HOUSE:'Reihenhaus',
  MID_TERRACE_HOUSE:'Reihenmittelhaus', TERRACE_END_HOUSE:'Reihenendhaus', END_TERRACE_HOUSE:'Reiheneckhaus',
  MULTI_FAMILY_HOUSE:'Mehrfamilienhaus', TOWNHOUSE:'Stadthaus', FINCA:'Finca', BUNGALOW:'Bungalow',
  FARMHOUSE:'Bauernhaus', SEMIDETACHED_HOUSE:'Doppelhaushälfte', VILLA:'Villa', CASTLE_MANOR_HOUSE:'Burg / Schloss',
  SPECIAL_REAL_ESTATE:'Besondere Immobilie', TWIN_SINGLE_FAMILY_HOUSE:'Doppeleinfamilienhaus', SUMMER_RESIDENCE:'Ferienhaus',
  GARAGE:'Garage', STREET_PARKING:'Außenstellplatz', CARPORT:'Carport', DUPLEX:'Duplex', CAR_PARK:'Parkhaus',
  UNDERGROUND_GARAGE:'Tiefgarage', DOUBLE_GARAGE:'Doppelgarage', TRADE_SITE:'Grundstück',
  OFFICE_LOFT:'Loft', STUDIO:'Atelier', OFFICE_CENTRE:'Bürozentrum', OFFICE_STORAGE_BUILDING:'Büro- / Lagergebäude',
  SURGERY_FLOOR:'Praxisetage', SURGERY_BUILDING:'Praxishaus', COMMERCIAL_CENTRE:'Gewerbepark',
  LIVING_AND_COMMERCIAL_BUILDING:'Wohn- und Geschäftsgebäude', OFFICE_AND_COMMERCIAL_BUILDING:'Büro- und Geschäftshaus',
  BAR_LOUNGE:'Bar / Lounge', CAFE:'Café', CLUB_DISCO:'Club / Diskothek', GUESTS_HOUSE:'Gästehaus',
  TAVERN:'Gaststätte', HOTEL:'Hotel', HOTEL_RESIDENCE:'Hotelanwesen', HOTEL_GARNI:'Hotel garni', PENSION:'Pension', RESTAURANT:'Restaurant',
  SHOWROOM_SPACE:'Ausstellungsfläche', HALL:'Halle', HIGH_LACK_STORAGE:'Hochregallager', INDUSTRY_HALL:'Industriehalle',
  INDUSTRY_HALL_WITH_OPEN_AREA:'Industriehalle mit Freifläche', COLD_STORAGE:'Kühlhaus', MULTIDECK_CABINET_STORAGE:'Kühlregallager',
  STORAGE_WITH_OPEN_AREA:'Lager mit Freifläche', STORAGE_AREA:'Lagerfläche', STORAGE_HALL:'Lagerhalle', SERVICE_AREA:'Servicefläche',
  SHIPPING_STORAGE:'Speditionslager', REPAIR_SHOP:'Werkstatt', SHOPPING_CENTRE:'Einkaufszentrum', FACTORY_OUTLET:'Factory Outlet',
  DEPARTMENT_STORE:'Kaufhaus', KIOSK:'Kiosk', STORE:'Laden', SELF_SERVICE_MARKET:'SB-Markt', SALES_AREA:'Verkaufsfläche', SALES_HALL:'Verkaufshalle',
  RESIDENCE:'Anwesen', FARM:'Bauernhof', LEISURE_FACILITY:'Freizeitanlage', COMMERCIAL_UNIT:'Gewerbeeinheit', INDUSTRIAL_AREA:'Gewerbefläche',
  NURSING_HOME:'Pflegeheim', ASSISTED_LIVING:'Betreutes Wohnen', HORSE_FARM:'Reiterhof', SPECIAL_ESTATE:'Spezialobjekt', VINEYARD:'Weingut',
  OFFICE:'Büro', OFFICE_FLOOR:'Büroetage', OFFICE_BUILDING:'Bürohaus', SURGERY:'Praxis',
  INVEST_FREEHOLD_FLAT:'Eigentumswohnung', INVEST_SINGLE_FAMILY_HOUSE:'Einfamilienhaus',
  INVEST_MULTI_FAMILY_HOUSE:'Mehrfamilienhaus', INVEST_LIVING_BUSINESS_HOUSE:'Wohn- / Geschäftshaus',
  INVEST_MICRO_APARTMENTS:'Micro-Apartments', INVEST_OFFICE_BUILDING:'Bürohaus', INVEST_COMMERCIAL_BUILDING:'Geschäftshaus',
  INVEST_OFFICE_AND_COMMERCIAL_BUILDING:'Büro- und Geschäftshaus', INVEST_SHOP_SALES_FLOOR:'Laden / Verkaufsfläche', INVEST_SUPERMARKET:'Supermarkt',
  INVEST_SHOPPING_CENTRE:'Einkaufszentrum', INVEST_RETAIL_PARK:'Fachmarktzentrum', INVEST_HOTEL:'Hotel', INVEST_BOARDING_HOUSE:'Boarding House',
  INVEST_SURGERY_BUILDING:'Ärztehaus', INVEST_CLINIC:'Klinik', INVEST_REHAB_CLINIC:'Rehaklinik', INVEST_MEDICAL_SERVICE_CENTER:'Medizinisches Versorgungszentrum',
  INVEST_INTEGRATION_ASSISTANCE:'Eingliederungshilfe', INVEST_DAY_NURSERY:'Kita', INVEST_DAY_CARE:'Tagespflege', INVEST_NURSING_HOME:'Pflegeheim',
  INVEST_ASSISTED_LIVING:'Betreutes Wohnen', INVEST_COMMERCIAL_CENTRE:'Gewerbepark', INVEST_HALL_STORAGE:'Halle / Logistik',
  INVEST_INDUSTRIAL_PROPERTY:'Produktion / Fertigung', INVEST_CAR_PARK:'Parkhaus', INVEST_COMMERCIAL_UNIT:'Gewerbeeinheit',
  INVEST_HOUSING_ESTATE:'Wohnanlage', INVEST_PLOT:'Grundstück', INVEST_OTHER:'Sonstige',
  SHORT_TERM_APARTMENT:'Apartment', SHORT_TERM_ROOM:'Zimmer', SHORT_TERM_HOUSE:'Haus', SHORT_TERM_FLAT:'Wohnung'
};
const unwrap = value => value && typeof value === 'object' && 'value' in value ? value.value : value;
export function propertyTaxonomy(unit) {
  const rs_type = String(unwrap(unit.rs_type) || '').trim();
  const rs_category = String(unwrap(unit.rs_category) || '').trim();
  return {rs_type, rs_category,
    type:propertyTypes[rs_type] || (rs_category === 'MAISONETTE' ? 'Wohnung' : 'Immobilie'),
    subtype:rs_category && rs_category !== 'NO_INFORMATION'
      ? categories[rs_category] || String(unit.rs_category?.pretty_value || 'Weitere Unterart') : ''};
}

// Explicit company questions may use SLS knowledge even from a property page.
// Ambiguous listing questions retain the strict property-only boundary.
export function explicitCompanyQuestion(question) {
 const q=String(question).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');
 if(!/\bsls\b|immobilienpartner/.test(q) || /\bsls\s+\d{3,}\b/.test(q))return false;
 if(/\b(?:diese[rsnm]?|diesem|dieses)\s+(?:immobilie|haus|wohnung|grundstuck|angebot)|\bobjekt|kaufpreis|zimmer|wohnflache|baujahr|energieausweis/.test(q))return false;
 return /serios|vertrauenswurd|google|rezension|gegrundet|grundungsjahr|grundung|seit wann|wie lange.*(?:gibt|besteh)|wie viele.*(?:verkauft|vermittelt|verkaufe)|anzahl.*verkauf|verkaufe.*(?:bisher|gesamt)|standort|\bburo|\bbueros|vertreten|tatig|marktgebiet|\bteam\b|mitarbeiter|geschaftsfuhr/.test(q);
}

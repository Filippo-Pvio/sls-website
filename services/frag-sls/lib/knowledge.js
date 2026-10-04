const KNOWLEDGE = require('../data/knowledge.json');
function normalize(s) { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function buyerCheck(q) { return /bonitat|kauferpruf|finanzierungspruf|finanzier.*(?:pruf|check)|(?:pruf|check).*finanzier/.test(q); }
function retrieve(question) {
  const q=normalize(question), selected=new Map();
  const byId=id=>KNOWLEDGE.find(k=>k.id===id);
  const matches=id=>byId(id).patterns.some(p=>new RegExp(normalize(p),'i').test(q));
  const add=id=>selected.set(id,{...byId(id),required:true});
  // Collect topics independently: a presentation question must not hide a buyer check.
  const contact=matches('central-contact'), presentation=matches('presentation-services');
  const services=matches('sales-services') || buyerCheck(q), reporting=matches('owner-reporting');
  const valuation=matches('valuation-costs');
  if(presentation)add('presentation-services');
  if(services)add('sales-services');
  if(reporting)add('owner-reporting');
  if(contact)add('central-contact');
  if(valuation && !/gutacht/.test(q))add('valuation-costs');
  const commission=/provision|courtage|was kostet.*verkauf|verkauf.*kost/.test(q);
  const investment=/investment|anlageobjekt|renditeobjekt/.test(q);
  if(commission){
    if(!investment)add('commission');
    add('service-costs');add('investment-commission');
  }else if(/kundig|erfolgsfall|zusatzkost|weitere kosten|versteckte kosten|leistungs?kosten/.test(q) ||
    (/(kost|gebuhr|gratis)/.test(q) && !presentation && !valuation && !/gutacht|notar|grundbuch/.test(q)))add('service-costs');
  const superseded=new Set();
  if(contact)for(const id of ['contact','personal-advice'])superseded.add(id);
  if(presentation)superseded.add('marketing');
  if(services)for(const id of ['negotiation','viewings','expose-approval','buyer-matching'])superseded.add(id);
  if(valuation)for(const id of ['valuation','online-accuracy','visit','no-obligation','first-meeting'])superseded.add(id);
  const ranked=KNOWLEDGE.map(k=>({...k,score:k.patterns.reduce((n,p)=>n+(new RegExp(normalize(p),'i').test(q)?1:0),0)}))
    .filter(k=>k.score>0&&!selected.has(k.id)&&!superseded.has(k.id))
    .sort((a,b)=>b.score-a.score);
  if(!selected.size)return ranked.slice(0,6);
  // Preserve additional explicit subjects such as duration and notary in mixed questions.
  for(const k of ranked.slice(0,6))selected.set(k.id,{...k,required:true});
  return [...selected.values()];
}
function limitations(question) {
  const q=normalize(question), messages=[];
  if (/gutacht|notarkost|grundbuchkost|grunderwerbsteuer/.test(q)) messages.push('Zu gesonderten Gutachten und externen Kosten liegt hier keine verbindliche Kostenangabe vor. Bitte lassen Sie Umfang und Konditionen von Ihrem SLS Immobilienpartner bestätigen.');
  if(/finanzier|bankzusage|bankbestatigung/.test(q) && buyerCheck(q))messages.push('Bestätigt ist die Bonitätsprüfung potenzieller Käufer. Eine Finanzierungszusage durch eine Bank ist damit nicht bestätigt.');
  if (/\berb|geerbt|scheidung|steuer|recht|restschuld|darlehen|kredit|vorfalligkeit/.test(q) || (/finanzier/.test(q)&&!buyerCheck(q))) messages.push('Für Ihre konkrete Rechts-, Steuer- oder Finanzierungssituation fehlen hier freigegebene Fachinformationen. Fragen Sie Ihren SLS Immobilienpartner nach dem passenden nächsten Schritt; eine individuelle Fachberatung kann diese Anwendung nicht ersetzen.');
  if (/aktuell.*(angebot|immobil|haus|hauser|wohnung|markt)|angebot.*aktuell|referenz|bereits.*verkauft|schon.*verkauft|suchkunden|wie viele.*(kaufer|interessent)|passende.*(kaufer|interessent)|kaufer.*(vorhanden|haben)|marktpreis|quadratmeterpreis/.test(q)) messages.push('Aktuelle Angebote, verkaufte Referenzen, Käuferzahlen und Live-Marktdaten sind hier noch nicht angebunden. Dazu kann ich keine konkreten Angaben bestätigen.');
  if (/wer.*(zustandig|ansprechpartner)|ansprechpartner|makler.*(dorsten|schermbeck)|(?<!mail)adresse|offnungszeit/.test(q)) messages.push('Eine örtliche oder persönliche Zuständigkeit, Anschrift oder Öffnungszeit kann ich hier noch nicht verbindlich bestätigen. Für die Zuordnung erreichen Sie SLS Immobilienpartner zentral unter 02369 742 80 20 oder service@sls.de.');
  if (/wie viel.*\bwert\b|was.*\bwert\b|\bwert\b.*\d|\d.*(wert|preis)|garant|versprich/.test(q)) messages.push('Einen konkreten Verkaufspreis, eine feste Verkaufsdauer oder eine Erfolgsgarantie kann ich aus den vorhandenen Angaben nicht ableiten.');
  if (/\b(?:schermbeck|essen|dusseldorf|recklinghausen|gladbeck|bottrop|marl)\b/.test(q)) messages.push('Für diesen Ort wurden in diese Version noch keine eigenen lokalen Quellen übernommen. Die Hinweise zum Verkaufsablauf gelten allgemein.');
  return [...new Set(messages)];
}
module.exports={retrieve,limitations,KNOWLEDGE};

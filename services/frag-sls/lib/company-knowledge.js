const WEBSITE = require('../data/website-company.json');
const normalize = value => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g,'ss');
function companySources(question) {
 const q=normalize(question);
 const matched=WEBSITE.filter(source=>source.patterns.some(pattern=>new RegExp(normalize(pattern),'i').test(q)));
 const fullNames=matched.filter(source=>source.id.startsWith('company-person-') && new RegExp(normalize(source.patterns[0]),'i').test(q));
 return fullNames.length ? matched.filter(source=>!source.id.startsWith('company-person-') || fullNames.includes(source)) : matched;
}
// Only short, factual company questions bypass generation. Mixed service/legal questions
// still use the verified answer path with the same new sources.
function companyAnswer(question) {
 const q=normalize(question);
 if(q.length>300 || /ignorier|system|prompt|geheim|api.?key|garant|kost|provision|finanzier|steuer|rechtlich|vertrag|grundbuch|wert.*(?:mein|meine)|(?:mein|meine).*wert/.test(q))return null;
 const sources=companySources(question), byId=id=>WEBSITE.find(source=>source.id===id);
 const sections=[];
 const add=(id,text)=>sections.push({source:byId(id),text});
 if(/serios|vertrauenswurd|zuverlass|rezension|google.*bewert|bewert.*google/.test(q))add('company-reputation','Ein guter Ausgangspunkt sind die Google-Kundenbewertungen, die erfolgreich vermittelten Referenzimmobilien und die Qualifikationen im Team. Die Kundenstimmen können Sie auf der Startseite und im verlinkten Google-Profil nachlesen. Dennis Sahlmen ist Immobilienmakler (IHK); Mischa Stratmann ist ausgebildeter Immobilienkaufmann und Sachverständiger. Bewertungen zeigen persönliche Erfahrungen und sind keine Garantie für Ihren eigenen Verkauf. Eine aktuelle Sternezahl oder Bewertungsanzahl nenne ich ohne aktuellen Abruf nicht.');
 if(/grundung|gegrundet|grundungsjahr|seit wann|wie lange.*(?:sls|unternehmen|euch|sie|gibt)|besteh/.test(q))add('company-history','Ein verlässlich belegtes Gründungsjahr kann ich derzeit nicht nennen: Die Über-uns-Seite nennt dafür kein Datum. Die Berufserfahrung einzelner Teammitglieder oder eine Partnerauszeichnung seit 2024 ist damit nicht gleichzusetzen. SLS ist ein inhabergeführtes Unternehmen mit Dennis Sahlmen, Filippo Livera und Mischa Stratmann als Geschäftsführern.');
 if(/wie viele.*(?:verkauft|vermittelt|verkaufe)|anzahl.*(?:verkauf|vermittelt)|verkaufe.*(?:bisher|gesamt)|bereits.*verkauft|schon.*verkauft/.test(q))add('company-sales-total','SLS zeigt auf der Referenzseite erfolgreich vermittelte Immobilien. Das ist eine Auswahl, keine verifizierte Gesamtzahl aller Verkäufe. Eine belastbare Gesamtzahl kann ich deshalb derzeit nicht nennen. Die Referenzen geben Ihnen dennoch einen konkreten Einblick in bisherige Vermittlungen.');
 if(/(?:wo|welche|in welchen).*(?:vertreten|tatig|standort|buro|region|marktgebiet)|standorte|buros|buro.*(?:dorsten|dusseldorf)|adresse|anschrift/.test(q)){
  add('company-offices','SLS hat Büros in Dorsten (Ubierweg 2, 46286 Dorsten) und Düsseldorf (Königsallee 19, 40213 Düsseldorf). Für persönliche Gespräche wird ein Termin abgestimmt. Zentral erreichen Sie das Team unter 02369 742 80 20 oder service@sls.de.');
  add('company-regions','Das Tätigkeitsgebiet liegt in Nordrhein-Westfalen: Ruhrgebiet, Münsterland, Rheinland und Niederrhein. Die Ortsseiten beschreiben betreute Marktgebiete; sie bedeuten nicht, dass in jeder Stadt ein eigenes Büro besteht.');
 }
 // A single named colleague: use their actual published biography, not inferred sales
 // responsibility from article bylines or testimonials.
 const people=sources.filter(source=>source.id.startsWith('company-person-'));
 if(sections.length && people.length)return null;
 if(!sections.length && people.length===1 && /wer|kennen|uber|profil|macht|schwerpunkt|qualifikation/.test(q))sections.push({source:people[0],text:people[0].text});
 if(!sections.length)return null;
 // Never silently omit a second subject that requires the normal verified handler.
 if(/leist|bewertung|verkaufsablauf|verkaufsdauer|wie.*(?:verkauf|kauf).*ab|bonitat/.test(q) && !/google.*bewert|bewert.*google/.test(q))return null;
 const numbered=[], seen=new Map();
 const answer=sections.map(({source,text})=>{
  if(!seen.has(source.id)){const number=numbered.length+1;seen.set(source.id,number);numbered.push({...source,number});}
  return `${text} [${seen.get(source.id)}]`;
 }).join('\n\n');
 return {mode:'knowledge',kind:'answer',provider:'Wissensbasis von SLS Immobilienpartner',reason:null,answer,sources:numbered,version:'frag-company-1',verification:{status:'passed',method:'versioned_website_facts'}};
}
module.exports={WEBSITE,normalize,companySources,companyAnswer};

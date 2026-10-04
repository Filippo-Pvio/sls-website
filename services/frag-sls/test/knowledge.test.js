const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {retrieve,limitations,KNOWLEDGE}=require('../lib/knowledge');
const cases=[
 ['Wie starte ich den Hausverkauf?','sales-process'],
 ['Welche Unterlagen brauche ich?','documents'],
 ['Muss ich nach der Bewertung verkaufen?','no-obligation'],
 ['Wie entsteht der Angebotspreis?','pricing'],
 ['Wann kann die Vermarktung starten?','marketing-start'],
 ['Welche Vermarktungsleistungen gibt es?','marketing'],
 ['Sprechen Sie Interessenten direkt an?','sales-services'],
 ['Wie lange dauert ein Verkauf?','duration'],
 ['Darf ich ein Angebot ablehnen?','offer-decision'],
 ['Wer begleitet mich zum Notar?','notary'],
 ['Wie kann ich Kontakt aufnehmen?','central-contact'],
 ['Wie genau ist die Online Bewertung?','online-accuracy'],
 ['Welche Immobilien können bewertet werden?','property-types'],
 ['Bewerten Sie Gewerbeimmobilien?','property-types'],
 ['Wie läuft die Bewertung vor Ort ab?','valuation'],
 ['Was ist das Vergleichswertverfahren?','comparison'],
 ['Was bedeutet Sachwertverfahren?','asset-value'],
 ['Was bedeutet Ertragswertverfahren?','income-value'],
 ['Berücksichtigen Sie Modernisierungen?','visit'],
 ['Wie wählen Sie das Bewertungsverfahren?','methods'],
 ['Was passiert im Erstgespräch?','first-meeting'],
 ['Bekomme ich das Exposé zur Freigabe?','sales-services'],
 ['Wer führt die Besichtigungen durch?','viewings'],
 ['Prüfen Sie die Bonität des Käufers?','sales-services'],
 ['Wer begleitet die Übergabe?','handover'],
 ['Ich möchte mein Haus in Dorsten verkaufen. Was muss ich beachten?','dorsten'],
 ['Kann ich eine persönliche Beratung erhalten?','personal-advice']
];
for(const [q,id] of cases)test(q,()=>assert.ok(retrieve(q).some(s=>s.id===id),id));
for(const q of ['Wer ist mein Ansprechpartner in Dorsten?','Welche aktuellen Angebote gibt es?','Habt ihr schon Häuser verkauft?','Wie viele Käufer habt ihr?','Wie hoch sind Steuern auf mein Erbe?','Was mache ich mit meiner Restschuld?','Was ist mein Haus wert?','Wie verkaufe ich in Schermbeck?']){
 test(`Grenze: ${q}`,()=>assert.ok(limitations(q).length));
}
test('no matching facts for unrelated question',()=>assert.deepEqual(retrieve('Was ist die Hauptstadt Japans?'),[]));
test('26 originals with source snapshots and hashes',()=>{
 assert.equal(KNOWLEDGE.length,34);
 for(const s of KNOWLEDGE){
   const snapshot=path.join(__dirname,'../public',s.url);
   assert.ok(fs.existsSync(snapshot));
   assert.ok(!/sobald.*angebunden|sollen bevorzugt|weiter angereichert/.test(s.text));
   const original=path.resolve(__dirname,'../..',s.sourcePath);
   // The deployable ZIP can be tested without the read-only website mirror.
   if(fs.existsSync(original))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(original)).digest('hex'),s.sourceHash);
 }
});

test('approved valuation costs are selected without an unresolved cost warning',()=>{
 for(const q of ['Ist die Bewertung kostenlos?','Was kostet eine Online-Bewertung?','Ist das Erstgespräch unverbindlich?','Kostet der Vor-Ort-Termin etwas?']){
  assert.equal(retrieve(q)[0].id,'valuation-costs');assert.deepEqual(limitations(q),[]);
  assert.match(retrieve(q)[0].text,/keine Verpflichtung/);
 }
 assert.ok(limitations('Was kostet ein Gutachten?').length);
 assert.ok(retrieve('Ist die Provision auch kostenlos?').some(s=>s.id==='commission'));
 assert.deepEqual(limitations('Wie hoch ist die Provision?'),[]);
});

test('commission conditions and minimum stay together',()=>{const s=retrieve('Wie hoch ist die Provision?');assert.ok(s.every(x=>x.required));assert.match(s[0].text,/83.000/);assert.match(s[0].text,/2.975/);assert.match(s[1].text,/keine Kündigungsgebühr/);});

test('service cost question includes no additional cost promise',()=>assert.ok(retrieve('Kosten die Fotos extra?').some(s=>s.id==='presentation-services')));

test('reporting availability is confirmed without an unresolved warning',()=>{
 for(const q of ['Ist das Reporting live?','Wie bleibe ich informiert?','Kann ich die Vermarktungsaktivitäten einsehen?']){
  assert.equal(retrieve(q)[0].id,'owner-reporting');assert.deepEqual(limitations(q),[]);
  assert.match(retrieve(q)[0].text,/alle Verkaufsaufträge/);assert.match(retrieve(q)[0].text,/jederzeit/);
 }
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {limitations}=require('../lib/knowledge');
for(const question of [
 'wird jeder interessent auf seine bonität geprüft und werden massenbesichtigung sttfinden?',
 'Werden Massenbesichtigungen angeboten?',
 'Wie werden Interessenten geprüft?',
 'Muss ich vor der Besichtigung etwas ausmessen?'
])test(`no irrelevant warning: ${question}`,()=>assert.deepEqual(limitations(question),[]));
for(const city of ['Essen','Schermbeck','Düsseldorf','Recklinghausen','Gladbeck','Bottrop','Marl'])test(`real city retained: ${city}`,()=>assert.ok(limitations(`Wie verkaufe ich mein Haus in ${city}?`).some(s=>s.includes('Für diesen Ort'))));
test('financing-check warning remains relevant',()=>assert.ok(limitations('Wird die Finanzierung geprüft?').some(s=>s.includes('Finanzierungszusage'))));

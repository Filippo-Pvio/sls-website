# SIA: zentraler Fragedienst

Die Website ruft ausschließlich `https://frag-sls.vercel.app/api/ask` auf. Der OpenAI-Key bleibt im bestehenden Projekt `frag-sls`; im Website-Projekt wird kein zusätzlicher Key benötigt.

## Aktives Backend

Das zentrale CommonJS-Backend liegt in `services/frag-sls` und wird im bestehenden Vercel-Projekt `frag-sls` aus demselben Repository veröffentlicht. `integrations/frag-sls` bleibt eine ältere Installationsvorlage; Änderungen am laufenden Dienst gehören nach `services/frag-sls`.

Die Website erkennt die Gesprächsfähigkeit über GET `/api/ask`: `version: frag-dialogue-1`, `dialogueEnabled: true`. Unternehmensfragen erhalten versionierte Website-Quellen und die bisherigen bestätigten Leistungsangaben. Allgemeine Immobilienfragen verwenden weiterhin den gesonderten Rechercheweg.

## Wissen über SLS

`scripts/build-sia-company.py` erstellt `services/frag-sls/data/website-company.json` aus der aktuellen Website: Über uns, Kontakt, Marktgebiete, alle 21 Teamprofile, Bewertungen und Referenzen. Jede Quelle trägt den Ursprungspfad, dessen SHA256, den Stand und eine klare Kennzeichnung als Website-Inhalt. Nach Änderungen an diesen Seiten neu erzeugen und prüfen; Quellenprüfungen erkennen einen veralteten Stand.

Kurze Fragen zu Seriosität, Gründungsjahr, Verkaufszahl, Büros und einzelnen Mitarbeitern werden aus diesen Grundlagen beantwortet. Auch auf Inseratsseiten gelangen ausdrücklich auf SLS bezogene Unternehmensfragen dorthin. Objektspezifische und gemischte Fragen mit einem konkreten Objekt behalten die strenge Begrenzung auf veröffentlichte Inseratsdaten. Gemischte Fragen durchlaufen weiterhin die automatische Quellenprüfung. Google-Sterne und Bewertungszahlen werden nicht eingefroren; Links führen zum aktuellen Google-Profil. Marktgebiete werden von Büroadressen getrennt. Ohne belegtes Gründungsdatum oder Gesamtverkaufszahl wird keine Zahl erfunden. Website-Quellen lassen sich im Widget lesen und über geprüfte relative Links aufrufen; Google öffnet separat.

## Verhalten

- Allgemeine Immobilienfragen recherchiert der zentrale Dienst mit OpenAI und einer festgelegten Auswahl fachlicher Quellen.
- Unternehmensfragen gehen nach Kontextauflösung an den SLS-Handler mit Website-Wissensbasis.
- Genau eine gezielte Klärungsfrage bei wesentlicher Unklarheit; keine routinemäßige Frage am Ende jeder Antwort.
- Die Website überträgt höchstens drei vollständige Gesprächspaare. Kontext bleibt im Arbeitsspeicher des Widgets; Neues Gespräch und Neuladen löschen ihn.
- Persönliche oder vertrauliche Informationen werden nicht gezielt abgefragt.
- Quellen bleiben innerhalb von SIA sichtbar.
- Der Website-Tageszähler zählt belegte Antworten, aber keine reinen Rückfragen, themenfremden Antworten oder technischen Fehler. Neues Gespräch setzt das Kontingent nicht zurück.
- `store: false` deaktiviert die Speicherung der Responses zur späteren Abrufbarkeit; es ist keine Aussage über sämtliche Aufbewahrungsregeln des Anbieters.

## Prüfung und aktueller Status

```sh
node --test qa/sia-central-backend.test.mjs qa/sia-dialogue.test.mjs qa/sia-api.test.mjs qa/sia-widget.test.mjs qa/sia-quota.test.mjs qa/sia-general-knowledge.test.mjs
```

Zusätzlich wird der zentrale Dienst mit `node --test services/frag-sls/test/*.test.js` geprüft. Modellaufrufe sind in den automatisierten Tests simuliert. Nach Veröffentlichung die vier Unternehmensfragen und eine Teamfrage auf der bestehenden Arbeitswebsite live prüfen. Der endgültige Onlinegang ist nicht Teil dieser Änderung.

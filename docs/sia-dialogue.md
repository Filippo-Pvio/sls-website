# SIA: zentraler Fragedienst

Die Website ruft ausschließlich `https://frag-sls.vercel.app/api/ask` auf. Der OpenAI-Key bleibt im bestehenden Projekt `frag-sls`; im Website-Projekt wird kein zusätzlicher Key benötigt.

## Aktives Backend

Das zentrale CommonJS-Backend liegt in `services/frag-sls` und wird im bestehenden Vercel-Projekt `frag-sls` aus demselben Repository veröffentlicht. `integrations/frag-sls` bleibt eine ältere Installationsvorlage; Änderungen am laufenden Dienst gehören nach `services/frag-sls`.

Die Website erkennt die Gesprächsfähigkeit über GET `/api/ask`: `version: frag-dialogue-1`, `dialogueEnabled: true`. Unternehmensfragen erhalten versionierte Website-Quellen und die bisherigen bestätigten Leistungsangaben. Allgemeine Immobilienfragen verwenden weiterhin den gesonderten Rechercheweg.

## Wissen über SLS

Bei **jeder Veröffentlichung** erstellen beide Vercel-Projekte automatisch mit `scripts/build-sia-company.mjs` die Datei `services/frag-sls/data/website-company.json` neu. Die Website führt den Schritt nach der Magazin-Erstellung und vor dem öffentlichen Export aus; `frag-sls` führt ihn vor dem Bündeln seiner Funktionen aus. Das Backend-Projekt muss Quellzugriff außerhalb seines Root Directory erlauben (`sourceFilesOutsideRootDirectory: true`), damit es die Website aus demselben Git-Stand lesen kann. Das ist gemäß [Vercel-Monorepo-Dokumentation](https://vercel.com/docs/monorepos/monorepo-faq) konfiguriert.

Die Teamseite bestimmt, welche Mitglieder dazugehören; Anzahl, Namen, Rollen und Profiltexte sind nicht fest verdrahtet. Neue Mitglieder werden übernommen, Änderungen eingelesen und entfernte Teamkarten aus dem Wissensbestand ausgeschlossen, selbst wenn ein altes Profil noch auf der Festplatte liegt. Kontakt, Büroadressen, Marktgebiete und Firmeninformationen stammen ebenfalls aus den aktuellen Seiten. Kurze Antworten verwenden diesen erzeugten Bestand statt eigener fester Textkopien. Der zentrale Kontakt ersetzt außerdem die ältere Kopie im Modellkontext.

Jede Quelle enthält Ursprungspfad, SHA256 der benutzten Seiten, Datum und bei Vercel-Builds die Git-Version (`releaseSha`). Fehlende verlinkte Profile, unvollständige Kontaktdaten, leere Teamlisten und doppelte Profile stoppen den Build; die vorherige erfolgreiche Veröffentlichung bleibt verfügbar. Erst nach vollständiger Erzeugung wird die Wissensdatei atomar ersetzt. Es gibt keine Netzwerk- oder KI-Aufrufe im Build und keine zusätzlichen Zugangsdaten.

Lokal: `npm run build:sia-company`; der frühere Python-Aufruf ist nur noch eine Kompatibilitätshülle. Bewusst separat bestätigte Vertrags- und Leistungszusagen bleiben in `approved-facts.json`; sie werden nicht aus freien Website-Formulierungen neu abgeleitet. Google-Zahlen werden nicht als feste aktuelle Zahlen übernommen. Gründungsdatum und Gesamtverkaufszahl werden nur bei einer ausdrücklich auf SLS bezogenen veröffentlichten Angabe übernommen; Mitarbeitererfahrung, Auszeichnungen und sichtbare Referenzzahlen zählen nicht dafür. Bei strukturellen Änderungen am Seitenaufbau muss der Extraktor gegebenenfalls angepasst werden.

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

# SIA: zentraler Fragedienst

Die Website ruft ausschließlich `https://frag-sls.vercel.app/api/ask` auf. Der OpenAI-Key bleibt im bestehenden Projekt `frag-sls`; im Website-Projekt wird kein zusätzlicher Key benötigt.

## Vorbereiteter Backend-Umbau

`integrations/frag-sls` enthält die ergänzenden Dateien für das bestehende CommonJS-Backend. Der Installer wird ausschließlich auf einen vollständigen Export der aktuellen Produktionsversion 1.4.3 angewendet:

```sh
python integrations/frag-sls/install.py /absoluter/pfad/zum/backendexport
```

Der Installer prüft die SHA1 des aktuellen `api/ask.js` aus Deployment `dpl_3uj6goBfTXvbv7qYoov6UD1TpshA`. Er sichert den bisherigen Handler unverändert als `lib/legacy-handler.cjs`. Unternehmenswissen, Quellen, Verifikationslogik und bestehende SLS-Antworten bleiben im vorhandenen Handler. Der neue Handler ergänzt die Einordnung und allgemeine Antworten. Keine vorhandene Bibliothek oder Wissensdatei wird ersetzt.

Anschließend das vollständige Backend als Preview im bestehenden Vercel-Projekt deployen. Dessen vorhandenen Key nutzen; keine Umgebungsvariablen auslesen oder in Dateien speichern. Bei Preview-Schutz über authentifizierte Vercel-Verifikation testen. Nach erfolgreicher Prüfung zu Production veröffentlichen.

Die Website erkennt die neue Fähigkeit über GET `/api/ask`: `version: frag-dialogue-1`, `dialogueEnabled: true`. Solange der alte Backend-Stand läuft, bleiben die neuen Gesprächsfunktionen deaktiviert und der bisherige Fragedienst nutzbar. API-Erkennung schlägt bei Fehlern geschlossen auf den bisherigen Modus zurück.

## Verhalten

- Allgemeine Immobilienfragen recherchiert der zentrale Dienst mit OpenAI und einer festgelegten Auswahl fachlicher Quellen.
- Unternehmensfragen gehen nach Kontextauflösung an den unveränderten SLS-Handler.
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

38 Tests bestanden. KI-Aufrufe sind in diesen Tests simuliert. Der zentralisierte Backend-Umbau ist noch nicht veröffentlicht: Der Vercel-Connector liefert Source-Dateien gekürzt und stellt keine Deployment-Erstellung bereit; in der lokalen Umgebung besteht keine Vercel-CLI-Anmeldung. Für vollständigen Source-Export und Veröffentlichung ist deshalb ein ausdrücklich erlaubter Browser-Fallback oder ein vollständiger aktueller Backend-Checkout mit autorisiertem Deployment-Zugang erforderlich.

Nach Backend-Aktivierung live prüfen: Bergbauminderverzicht samt Quellen, kurze Antwort auf eine Klärungsfrage, bestätigte SLS-Angaben, internes Quellenfenster, technische Fehler und Tageslimit. Ohne echte Live-Prüfung keinen erfolgreichen KI-Betrieb behaupten.

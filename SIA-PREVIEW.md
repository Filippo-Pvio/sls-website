# SIA auf der Homepage – separate Vorschau

Basis: `ec18e798515f2c3bf49359a3f069ccb10edb6bdd`, Zweig `feat/propstack-property-preview-current` (Ratgeber-Anrede und Propstack-Kontakte).
SIA-Zweig: `feat/sia-homepage-preview`.

## Umfang

Nur die Homepage lädt das gekapselte SIA-Fenster. Eigene Gestaltung in Shadow DOM: SLS-Blau #345B6E, Koralle #FF596F, Raleway und Playfair Display. Mobil öffnet es bildschirmfüllend. Escape/Schließen stellt den Tastaturfokus wieder her.

`/api/sia-config` aktiviert die Oberfläche ausschließlich bei `VERCEL_ENV=preview`; lokal nur mit `SIA_LOCAL_PREVIEW=1`. Produktion bleibt auch mit dieser lokalen Variable gesperrt. Keine Freischaltung für die öffentliche Website in dieser Änderung.

`/api/sia-ask` leitet gültige Fragen serverseitig an den bestehenden Dienst `https://frag-sls.vercel.app/api/ask` weiter. Kein weiterer API-Schlüssel oder Environment-Eintrag erforderlich. Der bestehende Dienst liefert Quellen, OpenAI-/Wissensbasis-Status und die kontextbezogene persönliche Empfehlung. Stand bei Umsetzung: 1.4.3. Die Antwortregeln bleiben dort zentral; spätere Änderungen am Dienst wirken auch in dieser Vorschau.

Die Oberfläche stellt Modellantworten ausschließlich als Text dar und verlinkt nur erlaubte `/quellen/*.html`-Pfade des bestehenden Dienstes. Keine Anfrage beim bloßen Öffnen, kein Chat-Verlauf in Browser-Speichern, keine automatischen Gegenfragen der Oberfläche. Jede eingegebene Nachricht ist eine eigenständige Frage. Fehler bleiben erkennbar; fehlende Serverantworten werden nicht als Wissensbasisantwort ausgegeben.

KI-Hinweis, persönliche Kontaktmöglichkeiten und Hinweis zur Eingabe ohne personenbezogene/vertrauliche Daten sind sichtbar. Vor einer öffentlichen Freischaltung sind Antwortqualität und die zum tatsächlichen Datenfluss passende Datenschutzinformation abschließend zu prüfen. Der Hinweis ist keine rechtliche Freigabe.

## Ratgeber und andere Arbeiten

`downloads/`, Ratgeber-Formular, Einwilligungen, Propstack-Logik und alle bestehenden Assets wurden nicht geändert. Einbindung: genau eine zusätzliche Script-Zeile in `index.html`; neue, eindeutig benannte Dateien und ein zusätzlicher Function-Eintrag in `vercel.json`. Bei späterer Übernahme die dann aktuelle Homepage-Basis verwenden; nicht diese komplette Vorschau über einen neueren Stand kopieren.

## Prüfung

- `node --test qa/sia-api.test.mjs`: 9 Prüfungen erfolgreich (inklusive übergeordneter Testsuite).
- Desktop 1440×1000 und Mobil 390×844: Öffnen/Schließen, Fokus, OpenAI-Antwort, Quellen, sichere Textausgabe, Wissensbasis-Fallback, Verbindungsfehler und Ratgeber-Seite geprüft.
- Kein JavaScript-Laufzeitfehler in diesen Browserabläufen. Keine Ratgeberformulare abgeschickt.
- Bestehender statischer Homepage-Test meldet in Basis und Vorschau denselben fehlenden Link `/team/manuela-landripet/`; kein neuer Fehler durch SIA.

Lokal: `node qa/sia-server.mjs` → http://127.0.0.1:4186. Dieser Hilfsserver bedient nur die SIA-API und statische Seiten, keine weiteren Homepage-APIs.

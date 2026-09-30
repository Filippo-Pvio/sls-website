# Getrennte Vercel-Vorschau für SLS-Immobilien

Diese Vorschau liegt nur auf dem Branch `feat/propstack-property-preview` unter `/immobilien-test/`. Die produktiven Routen `/kaufen/`, `/immobilien/` und die Homepage bleiben unverändert. `?demo=1` zeigt die Gestaltung anhand eines öffentlich sichtbaren Beispielobjekts. Die normale URL nutzt ausschließlich die Propstack-API.

Für die **Preview-Umgebung** des Vercel-Projekts `sls-website` werden serverseitig benötigt:

- `PROPSTACK_API_KEY`: Propstack-V1-API-Schlüssel mit **Leserecht für Objekte**, nicht ins Frontend oder Git übernehmen.
- `PROPSTACK_TEST_PROPERTY_IDS`: kommagetrennte Propstack-IDs der für diesen Test einzeln freigegebenen Kaufobjekte.
- `PROPSTACK_PUBLIC_STATUS_NAME`: exakter Name eines für den Test freigegebenen Status (`Vermarktung`). Die ID wird serverseitig gegen Propstack abgeglichen. `nonpublic: true` sperrt die Ausgabe; Propstack liefert für diesen SLS-Status `nonpublic: null`, weshalb der Status für das einzelne freigegebene Objekt zugelassen wird. Fehlende oder mehrdeutige Status bleiben gesperrt. Die allgemeine Freigabelogik für eine spätere Veröffentlichung muss gesondert validiert werden.

Nur wenn alle drei Werte vorliegen, fragt `/api/propstack-test-properties` Daten ab. Andere Objekte, archivierte Objekte, Mietobjekte, nicht freigegebene Status und als privat markierte Bilder werden nicht ausgeliefert. Der Fehlerzustand fällt nicht auf Beispielobjekte zurück.

Für diese Vorschau wurde ein separater API-Schlüssel mit Objekte-Leserecht angelegt. Seine tatsächliche Funktion und die Zuordnung des Status werden erst durch den Live-Abruf bestätigt.

Anfragen, Propstack-Exposéversand, Rechtsformular und Suchprofilübermittlung sind noch nicht freigeschaltet. Ihre konkrete Zuordnung und Protokollierung wird vor der Integration mit einem Testkontakt geprüft. Ebenso bleiben URL- und SEO-Migration ein separater Prüfschritt.

Lokale Überprüfung: `node --test qa/propstack-preview.test.mjs`; Design: `/immobilien-test/?demo=1`.


Deployment-Hinweis: Die Suchprofil-CTA-Position wird im Preview nach der ersten Ergebnisrunde getestet.

## Interne Datenprüfung vor dem Livegang (30.09.2026)

Auf dem aktuellen Preview-Branch `feat/propstack-property-preview-current` werden redaktionelle Prüfaufforderungen nicht mehr in der Besucheransicht ausgegeben. Diese Änderung ist keine Freigabe der Datenqualität oder der Veröffentlichung.

- Energieangaben: Bei nicht ausdrücklich als „wird nicht benötigt“ markierten Objekten Ausweistyp, Kennwert, Energieträger, Baujahr und Effizienzklasse auf Vollständigkeit prüfen. Besucher erhalten bei Lücken den neutralen Hinweis „Weitere Angaben zum Energieausweis erhalten Sie auf Anfrage“; Angebotskarten zeigen „Energieangaben auf Anfrage“.
- Baujahr: Ein aus den Objektdaten übernommenes Baujahr weiterhin mit dem Energieausweis abgleichen. Die sachliche Kennzeichnung „Baujahr laut Objektdaten“ bleibt erhalten. Beispiel aus der Preview-Prüfung: SLS 4826, Objekt-ID 4954810.
- Provision: Wenn ein Provisionssatz vorliegt, aber kein ausführlicher Provisionshinweis, den Text in Propstack ergänzen und fachlich prüfen. Vorhandene Provisionssätze und Texte werden unverändert angezeigt; fehlende Texte werden nicht erfunden.
- Grundstück SLS 10257, Objekt-ID 6158199: In der vorherigen Browserprüfung waren 900 m² Grundstücksfläche und „wird nicht benötigt“ vorhanden; keine fehlenden Energiewerte daraus ableiten.

Die Liste beschreibt die offenen Prüfkriterien und bekannte Beispiele, keinen vollständigen Audit aller Angebote. Anfrage-Statusmeldungen und die ausdrücklich aufgerufene Demo-Kennzeichnung bleiben erhalten. SEO-Prüfung und Homepage-Verknüpfung sind separate nächste Schritte.

## SEO-Preview-Prüfung (30.09.2026)

Objektbezogene Titel ohne erneut angehängten Ort, Beschreibungen mit Grundstücksfläche bzw. Wohnfläche und vorhandenem Preis, parameterfreie Canonicals auf die geplante sls.de-Objektadresse. Bestehende Slugs bleiben stabil. Bei Objektpfaden hat die ID im Pfad Vorrang vor einem widersprüchlichen Query-Parameter.

JSON-LD: RealEstateListing mit mainEntity (Apartment, House oder Place), öffentlich sichtbarem Standort ohne Straße, vorhandenen Flächen und numerischem EUR-Angebot. Fehlende Preise, Bilder und Standortwerte werden nicht erfunden. Kein aktives Angebots-Markup für Demo-, Fehler- oder nicht verfügbare Seiten. Nicht verfügbare Seiten verweisen nicht mehr per Canonical auf die inhaltlich andere Übersicht. Preview-noindex bleibt in HTML und Vercel-Headern erhalten.

Tests: `node --test qa/property-seo.test.mjs qa/property-loading.test.mjs qa/property-similarity.test.mjs`.

Die HTML-Detailrouten liefern Objekt-Metadaten, Canonical, JSON-LD und eine lesbare Objektzusammenfassung serverseitig aus. Aktive Angebote liefern HTTP 200, nicht mehr verfügbare Angebote 410 und unbekannte IDs 404. Temporäre Datenfehler bleiben 502/503 mit Wiederholungsmöglichkeit. Der Browser übernimmt ausschließlich dieselben öffentlich freigegebenen Objektdaten für die vollständige Detailansicht. Die Vorschau bleibt noindex und ist ausdrücklich keine Freigabe zur Indexierung. Zusätzliche Prüfungen: `node --test qa/property-page.test.mjs` (Statuscodes, HEAD, Pfadpriorität, sichere HTML-/JSON-Einbettung). Bestehende sls.de/Frymo-Adressen müssen vor einer URL-Migration separat abgeglichen werden.

Quellen: https://schema.org/RealEstateListing und https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics

## Vorbereitung Hauptversion (30.09.2026)

Production und Preview können Objektanfragen bei vorhandenem Propstack-Zugang aktivieren. Beide verwenden die bereits geprüfte SLS-Notizkategorie 739127; PROPSTACK_WEBSITE_INQUIRY_NOTE_TYPE_ID hat Vorrang. Das gilt für das bestehende SLS-Konto (gemeinsame PROPSTACK_API_KEY-Konfiguration), nicht für andere Propstack-Konten. Der Anfrage-Endpunkt bleibt auf Vercel-/lokale Hosts begrenzt; eine spätere sls.de-Migration ist damit ausdrücklich nicht freigegeben.

Vercel UI geprüft: PROPSTACK_API_KEY, GOOGLE_MAPS_BROWSER_KEY und GOOGLE_PLACES_API_KEY sind für Production vorhanden. Nur sls-website-eight.vercel.app ist als Domain verbunden. Google-Kartenschlüssel SLS Marktkarte um genau https://sls-website-eight.vercel.app/* ergänzt; seine Maps-JavaScript-API-Beschränkung bleibt bestehen. Die tatsächliche Kartenfunktion mit dem Production-Schlüssel muss nach Übernahme geprüft werden: die bisherige Hauptversion enthält noch keine neue Kartenansicht.

Validierung: qa/production-inquiry.test.mjs prüft simulierte Production-Anfragen, Notizkategorie, Überschreibung, Objekt- und Quellenzuordnung; qa/property-page.test.mjs prüft zusätzlich die Formularfreigabe bei Production. Keine echten Kontakte, Anfragen oder E-Mails erzeugt. Main nicht geändert, keine Production-Veröffentlichung.

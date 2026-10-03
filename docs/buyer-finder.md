# Käuferfinder — persönlicher Nachfragecheck

Route: /kaeuferfinder/. Entry in Verkaufen menu/footer and one entry on selling page. Shared hero crossfade, existing fonts/colors, native accessible form controls, three steps; no fake buyer counts or automatic matching.

## Propstack activation

Create exactly one **note** activity type:

`Website | Käuferfinder | Eigentümeranfrage`

Callback additionally uses the existing note activity type:

`Website Kontakt – Rückruf gewünscht`

Automations and assignment are configured by SLS in Propstack. The website creates these notes on the verified contact, including property type, place, area, rooms, optional price, message, contact channel, optional callback window and privacy confirmation. It does not create a property, deal or actual callback task; SLS's note-based automation does that. No existing contact identity or consent is overwritten.

The online submit becomes available only when the contact API confirms the exact note type (and callback type if requested). If missing, form steps remain usable but online submission is disabled with direct business contact information. No live sample contact or note was created for verification.

## Matching

No live search-profile match has been implemented or promised. Personal review is the first release. Future matching requires verified active search profile coverage, freshness, region/budget/type normalization and appropriate API access. All Propstack credentials remain server-side via existing contact endpoint.

## Validation

Existing contact integration regression checks plus buyer finder structured note/callback and missing-category/invalid-property checks. No live CRM writes or messages for tests.

## Automatischer Nachfragecheck (2026-10-03)
Vor Kontakteingabe erfolgt GET /api/buyer-demand mit ausschließlich Objektdaten. Server liest alle gespeicherten Suchprofile paginiert, nur aktive Profile mit Kauf (BUY) oder ohne Kauf-/Mietangabe und mit einer eindeutigen Kontakt-ID werden berücksichtigt. Keine Kontakt- oder Suchprofildaten werden veröffentlicht; Ergebnis enthält nur Anzahl, Standort und Datenstand. Personen werden über client_id dedupliziert. Daten werden fünf Minuten im Prozess zwischengespeichert; bei Fehlern, Zeitüberschreitung oder unvollständiger Pagination keine Teilzahlen. Keine CRM-Schreibvorgänge durch den Nachfragecheck.

Geografie: Suchradien überschneiden sich mit 20-km-Kreis um den PLZ-/Ortsmittelpunkt oder mindestens ein Suchort-Mittelpunkt liegt innerhalb dieses Kreises. Keine Nutzung der Wohnadresse. Breite Regionen ohne konkret verortbaren Suchort werden nicht gezählt. Keine Aussage, dass alle Profile die exakte Objektadresse einschließen. Eine ausgewählte Unterkategorie wird mit den Einschränkungen des Suchprofils verglichen (Mehrfamilienhaus fest MULTI_FAMILY_HOUSE). Bei offener Kategorie erfolgt keine Einschränkung nach Unterkategorie; die gewählte Immobilienart bleibt gefiltert. Preis nur abgeglichen, wenn angegeben; kein Nachweis von Finanzierungsfähigkeit. Gewerbefläche net_floor_space, Grundstück plot_area, Wohnobjekte living_space. Fehlende weitere Merkmale (z. B. Balkon/Baujahr) müssen persönlich geprüft werden.

Ortsdaten: GeoNames Deutschland Postal Codes, https://download.geonames.org/export/zip/DE.zip, Download 2026-10-03, CC BY 4.0. Auf Nordrhein-Westfalen begrenzte Daten in lib/buyer-geodata.json; der öffentliche Check ist entsprechend als NRW gekennzeichnet. Mehrere Einträge pro PLZ/Ort gemittelt; Mehrdeutigkeiten >30km werden abgewiesen. Quellen-/Lizenzhinweis auf Ergebnisseite. API-Key nur im Backend (PROPSTACK_SEARCH_PROFILE_API_KEY oder PROPSTACK_API_KEY). Vorhandene Propstack-Notiztypen für die Kontaktanfrage bleiben Voraussetzung.

### Analyseanimation und Bestand
GET /api/buyer-demand?summary=1 liefert ausschließlich die Anzahl eindeutiger aktiver Kontakte mit Kaufgesuch oder ohne Kauf-/Mietangabe im vollständigen Suchprofilbestand und den Datenstand. Die Animation nennt diesen Bestand ausdrücklich „aktive Kaufinteressenten in unserer Kartei“, nicht bereits passende Interessenten. Anschließend wird der konkrete Abgleich durchgeführt. Keine simulierte Zahl verarbeiteter Datensätze oder Prozentanzeige. Bei Bestandfehlern keine erfundene Zahl.

Aktivierung geprüft am 2026-10-03: Eigentümernotiz wird erkannt; E-Mail-Anfrage verfügbar. Rückruf-Notiztyp noch nicht erkannt, daher Rückrufauswahl noch nicht sendbar. Alle Eigentümereingaben werden nach bewusstem Absenden als Notiz am eindeutig zugeordneten/neuen Kontakt erfasst (Identität, Immobilienart/Kategorie, Ort, Fläche, Zimmer, Preis, Freitext, Kontaktwunsch/Zeitfenster, Einwilligungsnachweis). Der reine Analyseaufruf erzeugt keine Notiz.

Filteranpassung 2026-10-03: SLS vermittelt ausschließlich Kaufimmobilien. Daher werden aktive Suchprofile ohne marketing_type ebenfalls berücksichtigt, sowohl beim Bestand als auch beim Objektabgleich. RENT und andere ausdrücklich gesetzte Arten bleiben ausgeschlossen. Inaktive Profile bleiben ausgeschlossen; Kategorien, Geografie, Größen und Budget werden unverändert geprüft. Diagnosebestand: 12.778 eindeutige aktive Personen mit BUY/offener Art (überschneidungsbereinigt), statt 1.628 mit ausschließlich BUY.

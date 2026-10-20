# Eigentümer-Landingpages für bezahlte Kampagnen

Öffentliche Zielseiten:
- https://sls.de/lp/immobilie-verkaufen/
- https://sls.de/lp/immobilienbewertung/

Beide Seiten verwenden ein gemeinsames SLS-Layout mit lokal geladenen Schriften, responsiven Bildern, bestehender eigener Consent-/Statistikbrücke, belegten Google-Rezensionsauszügen samt Quellenlinks, drei Geschäftsführern und einem nativen, dreistufigen Anfrageformular. Es werden keine externen Rechner, Videos, Karten oder Bewertungswidgets geladen. Die Bewertungsseite bietet ein persönliches Gespräch, keine sofortige automatische Wertberechnung und kein förmliches Gutachten. Es wird kein kostenloser Leistungsumfang oder Rückruftermin versprochen. Kosten/Umfang werden vor einer gesonderten Beauftragung geklärt. Die Anfrage löst keinen Maklervertrag und keine Newsletter-Anmeldung aus.

Die erste Fassung nennt ausschließlich die bestehenden SLS-Marktgebiete Ruhrgebiet/Rheinland. Dorsten ist das Büro; Düsseldorf wird als Gesprächsmöglichkeit nach Terminvereinbarung bezeichnet. Es werden keine neuen Niederlassungen oder zusätzlichen Regionen behauptet.

## Formular und CRM

Das Formular nutzt unverändert den geschützten Endpunkt `/api/propstack-contact-request/` und dessen bestehende Notizkategorien:
- Verkauf: `Website Kontakt – Verkaufswunsch`
- Bewertung: `Website Kontakt – Bewertungsanfrage`
- Rückruf zusätzlich: `Website Kontakt – Rückruf gewünscht`

Es werden keine neuen Kategorien oder Automatiken benötigt. Der bestehende Identitätsabgleich, die signierten Tokens und Erneuerung, zentraler Spam-/Doppelschutz und Abgleich unbestätigter Schreibvorgänge bleiben erhalten. Keine Änderungen an allgemeinen Werbe- oder Newsletterfreigaben.

Zusätzlich akzeptiert der Server nur den streng validierten `landing`-Block (Seite sale/valuation, Immobilienart, Eigentümerstatus, Zeitplan) und erfordert den Objektstandort. Ein fester Quellpfad wird serverseitig zugeordnet, keine frei eingereichten Quell-URLs. Diese Qualifikation steht in den bestehenden CRM-Notizen. Namen und E-Mail sind für den bestehenden sicheren Identitätsabgleich erforderlich. Bei Rückruf werden Telefon und ein gewählter/flexibler Zeitwunsch mitgeführt; Zeitwunsch ist kein Termin. Ohne Rückruf verwirft der Server zusätzliche Telefonnummern für diese Landingpages. Eine Mailadresse bleibt auch bei Rückruf erforderlich; das Formular erklärt dies.

Hinweisversion `2026-10-20-landing`: Kenntnisnahme der Datenschutzhinweise, keine neue pauschale Verarbeitungseinwilligung. Verarbeitungszweck ist die ausdrücklich angefragte Beratung. Der allgemeine Datenschutzabschnitt `#anfragen` beschreibt die zusätzlichen Angaben und den festen Quellpfad. Das bestehende Kontaktformular behält seine eigene Hinweisversion und Funktion.

## Messung und SEO

Nur `contact_request_success` wird nach einem bestätigten `ok:true` ausgelöst, ohne Kontakt-, Objekt-, Qualifikations- oder Quellparameter im Ereignis. Vor Absenden oder bei Fehlern gibt es keinen Abschluss. Vorhandene Statistik-Einwilligung und Hostfilter bleiben maßgeblich. Alle Werbesignale bleiben abgelehnt. Es werden keine UTM-, GCLID-, WBRAID- oder GBRAID-Werte gelesen, gespeichert oder an Propstack/Google übermittelt. Die interne Quellseite ersetzt keine Anzeigenattribution.

Die Seiten sind gezielt `noindex,follow`, haben jeweils eine eigene kanonische URL und erscheinen nicht in der organischen Sitemap. Anzeigen-Crawler werden nicht durch neue robots.txt-Sperren ausgeschlossen. Kein selbstbezogenes Bewertungs-Sterne-Markup. Die allgemeine Website und organischen Regional-/Leistungsseiten bleiben unverändert.

## Kampagnenentwürfe und offene Startentscheidungen

`config/owner-campaign-drafts.json` enthält zwei **nicht aktivierte** Suchkampagnenentwürfe mit URL, Anzeigenüberschriften/-texten, Suchintentionen und zu prüfenden Ausschlüssen. Region und Budget sind bewusst nicht gesetzt. Sie wurden in kein Anzeigenkonto hochgeladen. Zielseitenerweiterung ist für den kontrollierten Start nicht vorgesehen.

Vor bezahlter Schaltung festlegen/prüfen:
1. Marktgebiet nach Betreuungskapazität und regionalem Keyword-Planer auswählen; Klickpreis-/Volumenprognose und Pilotbudget erstellen.
2. Angebot, Erreichbarkeit, Rückrufbearbeitung und wirtschaftliches Ziel je qualifiziertem Lead/Auftrag festlegen.
3. Anzeigen-/Konto-/Abrechnungszugang und tatsächlich veröffentlichte GTM-/Ads-Konfiguration prüfen.
4. Rechtsgrundlage, Dienstleister-/Datenschutzhinweise und Werbeaussagen fachlich freigeben; BFSG-Anwendbarkeit anhand der konkreten Unternehmens-/Leistungsdaten prüfen. Keine neue juristische Abnahme wird behauptet.
5. Einwilligungskompatible Anzeigenattribution und CRM-Rückmeldung für qualifiziert/Termin/Auftrag spezifizieren und separat abnehmen. Die bestehende Statistikbrücke wird hier nicht stillschweigend zu Werbetracking erweitert.
6. Erst danach Suchkampagnen gezielt veröffentlichen. Kosten, erreichbare Eigentümer, Qualifikation, Termine und Aufträge getrennt messen. Verkäufer- und Bewertungsintentionen getrennt auswerten.

Keine Anzeigen oder zusätzlichen Tracking-/Werbedienste wurden aktiviert.

## Abnahme

Automatisierte Tests prüfen zusätzliche Anfragevalidierung, korrekte Quellen und Qualifikation, unveränderte bestehende Kategorien, Duplikate, unbestätigte Schreibvorgänge, Tokens und Formularschutz sowie Seitenstruktur, lokale Assets, Consent-Einbindung, Indexierungsentscheidung und Zeichenlimits der Anzeigenentwürfe.

Browserprüfung erfolgt auf einem isolierten lokalen Server mit synthetischen Angaben und simulierten Schnittstellenantworten: Verkauf per E-Mail, Serverfehler mit erhaltenen Eingaben, erneute bestätigte Übermittlung sowie Bewertung mit Rückruf. Keine realen CRM-Testkontakte, E-Mails oder Anzeigenkosten. Diese Prüfungen ersetzen keinen tatsächlichen CRM-Eingangsbeleg einer realen Landingpage-Anfrage. Auf Produktion ausschließlich lesende Formularbereitschaft prüfen.

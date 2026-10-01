# Ratgeberanforderung: Vorschau

## Freigegebener Ratgeber

- ID: VERKAUF
- Titel: Immobilie verkaufen. Mit einem guten Gefühl.
- PDF: SLS-Immobilie-verkaufen.pdf, 12 Seiten, Ausgabe Oktober 2026, vom Nutzer zum Versand freigegeben.
- Propstack-Notizkategorie (ID 741093, im Live-System category=for_notes) und Notiztitel: SLS_RATGEBER_VERKAUF_ANGEFORDERT
- Die fünf weiteren Ratgeber bleiben deaktiviert. Die PDF wird später in der Versandvorlage in Propstack hinterlegt; sie ist kein öffentlicher Direktdownload auf der Website.

## Websiteablauf

GET /api/propstack-guide-request prüft den Zugang und die eindeutige Notizkategorie in Propstack und liefert ein signiertes, 30 Minuten gültiges Formulartoken. Erst dann wird das Formular aktiviert. POST akzeptiert ausschließlich VERKAUF und eine E-Mail-Adresse. Es werden weder Namen noch Telefonnummern verlangt.

Vorhandene Kontakte werden anhand ihrer primären E-Mail-Adresse eindeutig zugeordnet. Bei mehreren Treffern oder einer abweichenden primären E-Mail wird abgebrochen. Neue Kontakte werden ausschließlich mit ihrer E-Mail-Adresse angelegt. Bestehende Daten, Newsletter- und Einwilligungsfelder werden nicht geändert.

Die Notiz wird über POST /tasks erstellt, mit der aus /activity_types gelesenen Notizkategorie und client_ids. Keine Immobilien-/Portalanfrage und keine allgemeine Werbeeinwilligung. Die Notiz enthält Ratgeber, Dateiname, Zeitpunkt, Quelle, Verwendungszweck, Datenschutzhinweis-Version und Anforderungs-ID. Erfolg wird nur nach bestätigter Notizanlage zurückgegeben. Die Antwort verrät keine Kontakt- oder Notiz-IDs.

## Aktueller Versandstatus

Der Propstack-Versandprozess existiert noch nicht. Die Oberfläche sagt ausdrücklich: Anforderung aufgenommen; E-Mail-Versand wird vorbereitet. Die Website sendet selbst keine E-Mail. Bereits vor der Einrichtung erstellte Notizen müssen später gesondert in Propstack bearbeitet werden; ein neu eingerichteter Prozess wird durch alte Notizen nicht automatisch erneut ausgelöst.

Nach Einrichtung und Test des Propstack-Prozesses sind die Vorbereitungshinweise und deliveryReady in API/Frontend gemeinsam umzustellen. Die Produktionsfreigabe ist ein eigener Schritt: aktuell sind nur VERCEL_ENV=preview mit *.vercel.app und lokale Entwicklung erlaubt.

## Konfiguration und Rechte

Schlüssel-Reihenfolge: PROPSTACK_GUIDES_API_KEY, PROPSTACK_INQUIRY_API_KEY, PROPSTACK_API_KEY. Erforderlich: Aktivitätstypen lesen, Kontakte lesen/anlegen, Aktivitäten lesen, Notizen anlegen. ID 741093, Bezeichnung und Notiztyp werden gemeinsam gegen die gelesene Kategorie geprüft. Fehlende Rechte/Kategorie: Formular bleibt gesperrt; es wird kein Erfolg simuliert.

## Schutz und Grenzen

- Same-origin-POST, serverseitige Zulassung nur des freigegebenen Ratgebers, begrenzte Eingabelänge, signiertes Formulartoken und unsichtbares Bot-Feld.
- Doppelklickschutz im Browser und Sperre gleicher E-Mail innerhalb einer Serverinstanz.
- Prüfung vorhandener Propstack-Notizen: gleiche Anforderungs-ID bzw. Anfrage derselben Kategorie innerhalb von zehn Minuten wird wiederverwendet.
- Pro Instanz maximal acht gültige POST-Versuche pro IP in 15 Minuten; IP wird nur als HMAC-Schlüssel gespeichert. Keine Formulardaten im Browser-Speicher oder in URL/Serverlogs.
- Unklar beantwortete Schreibvorgänge werden innerhalb der Instanz nicht blind wiederholt.
- Propstack bietet hier keine dokumentierte atomare Idempotenz. Gleichzeitige Erstzugriffe auf verschiedene Serverinstanzen bzw. Neustarts nach unklarem Schreibausgang sind daher nicht vollständig abgesichert. Vor öffentlicher Produktionsfreigabe zentralen Rate-Limiter/Idempotenzspeicher ergänzen und Versand in Propstack ebenfalls gegen Duplikate absichern. Dies ist aktuell eine geschützte Vorschau.

## Prüfung

node --test qa/guide-request.test.mjs qa/guide-form.test.mjs

Testet Kontaktzuordnung/Neuanlage, unveränderte Kontaktpräferenzen, korrekte Notiz, Duplikate, ungültige Angaben, fremde Herkunft, Token, Fehler/Timeouts, Drosselung, Produktionssperre sowie Formularzustände. Live-Testadresse auf ausdrücklichen Nutzerwunsch: service@sls.de. Versandtest erfolgt erst nach Einrichtung des Propstack-Prozesses.

API-Referenzen: https://docs.propstack.de/reference/kontakte und https://docs.propstack.de/reference/aktivitaeten-1

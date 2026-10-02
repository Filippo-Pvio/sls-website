# Ratgeberanforderung: Vorschau

## Freigegebener Ratgeber

- ID: VERKAUF
- Titel: Immobilie verkaufen. Mit einem guten Gefühl.
- PDF: SLS-Immobilie-verkaufen.pdf, 12 Seiten, Ausgabe Oktober 2026, vom Nutzer zum Versand freigegeben.
- Propstack-Notizkategorie (ID 741093, im Live-System category=for_notes) und Notiztitel: SLS_RATGEBER_VERKAUF_ANGEFORDERT
- Die fünf weiteren Ratgeber bleiben deaktiviert. Der Nutzer hat den Ratgeberversand über Propstack am 02.10.2026 bestätigt; sie ist kein öffentlicher Direktdownload auf der Website.

## Websiteablauf

GET /api/propstack-guide-request prüft den Zugang und die eindeutige Notizkategorie in Propstack und liefert ein signiertes, 30 Minuten gültiges Formulartoken. Erst dann wird das Formular aktiviert. POST akzeptiert ausschließlich VERKAUF und Vorname, Nachname und E-Mail-Adresse. Namen werden nach dem Trimmen mit jeweils maximal 100 Zeichen validiert; Telefonnummern werden nicht verlangt.

Vorhandene Kontakte werden anhand ihrer primären E-Mail-Adresse eindeutig zugeordnet. Bei mehreren Treffern oder einer abweichenden primären E-Mail wird abgebrochen. Neue Kontakte werden mit Vorname, Nachname und E-Mail-Adresse angelegt. Vor jeder Versandnotiz werden Vor- und Nachname des erneut gelesenen Kontakts verglichen. Unicode-Normalisierung, Groß-/Kleinschreibung und zusätzliche Leerzeichen werden berücksichtigt; andere Abweichungen und fehlende Bestandsnamen führen zur Prüfung. Die angegebenen Namen werden zudem in der Ratgebernotiz dokumentiert. Die Website ändert bestehende Daten, Newsletter- und Einwilligungsfelder nicht. Eine zusätzliche Newsletter-Anmeldung benötigt eine eigene Bestätigung über Propstack.

Die Notiz wird über POST /tasks erstellt, mit der aus /activity_types gelesenen Notizkategorie und client_ids. Keine Immobilien-/Portalanfrage und keine allgemeine Werbeeinwilligung. Die Notiz enthält angegebenen Namen, Ratgeber, Dateiname, Zeitpunkt, Quelle, Verwendungszweck, Datenschutzhinweis-Version und Anforderungs-ID. Erfolg wird nur nach bestätigter Notizanlage zurückgegeben. Die Antwort verrät keine Kontakt- oder Notiz-IDs.

## Aktueller Versandstatus

Der Nutzer hat den Ratgeberversand über Propstack am 02.10.2026 als funktionierend bestätigt. Die Oberfläche zeigt jetzt: „Vielen Dank! Sie erhalten Ihren Ratgeber in Kürze per E-Mail.“ Die Website erstellt weiterhin die Versandnotiz; den Ratgeber versendet der bestehende Propstack-Prozess.

Die Produktionsfreigabe bleibt ein eigener Schritt: aktuell sind nur VERCEL_ENV=preview mit *.vercel.app und lokale Entwicklung erlaubt.

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

Testet Kontaktzuordnung/Neuanlage, unveränderte Kontaktpräferenzen, korrekte Notiz, Duplikate, ungültige Angaben, fremde Herkunft, Token, Fehler/Timeouts, Drosselung, Produktionssperre sowie Formularzustände. Live-Testadresse auf ausdrücklichen Nutzerwunsch: service@sls.de. Den Ratgeberversand hat der Nutzer bestätigt. Der separate Newsletter-Bestätigungsprozess ist noch nicht eingerichtet.

API-Referenzen: https://docs.propstack.de/reference/kontakte und https://docs.propstack.de/reference/aktivitaeten-1

## Namensabweichungen / Prüfablauf

Bei abweichenden Namen wird am eindeutig zugeordneten Kontakt eine separate Notiz mit Titel `SLS_RATGEBER_VERKAUF_PRUEFUNG` ohne Versandkategorie angelegt. Sie enthält die eingegebenen Angaben und den Hinweis „PRÜFUNG ERFORDERLICH – KEIN VERSAND FREIGEGEBEN“. Es wird weder ein zweiter Kontakt erstellt noch der bestehende Kontakt überschrieben. Die Erfolgsmeldung zur Prüfung wird erst nach bestätigter Notizanlage ausgegeben. Mehrere Treffer oder eine abweichende primäre E-Mail bleiben ein Zuordnungsfehler ohne Schreibvorgang.

Der Besucher erhält den neutralen Hinweis zur nicht eindeutigen Zuordnung, keine Auskunft über den gespeicherten Namen oder CRM-IDs. „Angaben korrigieren“ erhält die Eingaben und lädt ein neues Formulartoken; „SLS kontaktieren“ führt zu /kontakt/. Korrigierte, übereinstimmende Namen durchlaufen anschließend die normale Anforderung. Bei korrekten abweichenden Angaben klärt SLS die Zuordnung persönlich; keine automatische Namensänderung.

Prüfnotizen werden separat von Versandnotizen dedupliziert. Gleichzeitige Anfragen mit verschiedenen Namen werden innerhalb einer Instanz nacheinander geprüft und bekommen ihr eigenes Ergebnis. Die bestehenden Grenzen zur Idempotenz über mehrere Serverinstanzen gelten weiterhin.

**Propstack-Prozess einrichten:** Nur die Kategorie 741093 / SLS_RATGEBER_VERKAUF_ANGEFORDERT als Versand-Auslöser verwenden, niemals jede neue Notiz. Prüfnotizen bleiben ausgeschlossen. Nach persönlicher Klärung Bestandsdaten und neuere Anforderungen prüfen, eventuell Namen manuell berichtigen und einmalig die Versandnotiz anlegen, sofern noch keine korrigierte Anforderung diese erzeugt hat. Prüfnotiz anschließend als geklärt kennzeichnen. Die Website löst keine früheren Prüfnotizen automatisch auf und stoppt keine bereits laufenden Versandprozesse.

## Freiwillige Newsletter-Anmeldung (Double-Opt-in)

Stand 02.10.2026: Website-Code und Tests vorbereitet. Noch kein Bestätigungs-Textbaustein in Propstack vorhanden (Nutzerangabe). Die Marketing-Checkbox bleibt bis zur geprüften Konfiguration deaktiviert; Ratgeberanforderungen funktionieren unabhängig davon.

Die Checkbox ist freiwillig, nicht vorangekreuzt und nicht erforderlich. Serverseitig werden ausschließlich echte Booleans und bei Zustimmung die aktuelle Textversion akzeptiert. Der genaue Wortlaut steht in lib/guide-consent.mjs und wird durch einen Test mit dem HTML abgeglichen. Ohne Zustimmung bleiben bestehende Einstellungen unverändert. Namensabweichungen blockieren auch die Newsletter-Anmeldung.

Nach Freischaltung wird bei passender Kontaktzuordnung eine **unkategorisierte** Nachweisnotiz SLS_NEWSLETTER_DOI_ANGEFORDERT mit Name, Adresse, Zeitpunkt, Quelle und genauem Einwilligungstext angelegt. Sie ist keine bestätigte Einwilligung und darf keinen Marketingprozess auslösen. Danach sendet POST /messages den konfigurierten, werbefreien Bestätigungstext über das ausgewählte Propstack-Konto. SLS_NEWSLETTER_DOI_VERSAND_BESTAETIGT dokumentiert nur die API-Versandannahme, keine Zustellung und keine Zustimmung. Unklarer Versand wird nicht blind wiederholt; der Ratgeber-Erfolg bleibt davon getrennt.

Die Website setzt **weder newsletter noch accept_contact** beim Absenden. Diese beiden Felder dürfen erst durch die tatsächliche Bestätigung in Propstack gesetzt werden. Der normale Ratgeberprozess darf sie ebenfalls nicht setzen. Bestehende Newsletter-Abmeldungen werden durch einen Ratgeberdownload nicht aufgehoben. Eine neue aktive Anmeldung erfordert wieder eine Bestätigung.

### Noch erforderliche Einrichtung in Propstack

1. Textbaustein „SLS – Newsletter-Anmeldung bestätigen“ erstellen. Entwurf: docs/newsletter-bestaetigung.txt. Der Entwurf nutzt {{ kontakt_profil_button }} für das Bestätigungsformular. Absenderkonto ausdrücklich auswählen; nicht automatisch einen beliebigen Betreuer verwenden.
2. Das Bestätigungsformular auf die konkrete Einwilligung aus lib/guide-consent.mjs abstimmen: ausschließlich E-Mail-Tipps und Angebote zu Immobilienverkauf, Immobilienbewertung und entsprechenden SLS-Dienstleistungen. Newsletter-Zustimmung separat erfassen. Keine zusätzliche Telefonwerbung und keine automatische Aktivierung von Immobilienmailings/Suchprofilen.
3. Achtung: Der dokumentierte Standardlink {{ kontakt_link }} aktiviert laut Propstack zusätzlich „Immobilienmailings gewünscht“. Diesen Link nicht ungeprüft einsetzen. Falls das Profilformular die beiden gewünschten Felder nicht getrennt von Immobilienmailings setzen kann, ist vor Freischaltung eine passende Konfiguration mit Propstack zu klären.
4. Marketingserie ausschließlich für bestätigte Newsletter-Anmeldungen mit newsletter=true UND accept_contact=true starten. Die Formularklick-Notiz und der Ratgeberdownload sind keine Freigabe. Abmeldung muss weitere Marketingmails stoppen; Abmeldelink in jeder Marketingmail. Umfang der gespeicherten E-Mail-Einwilligung bleibt maßgeblich, auch wenn „Kontakterlaubnis“ im CRM allgemeiner heißt.
5. Aktuelle Datenschutzerklärung um den tatsächlichen Ratgeber-/Newsletterablauf, Propstack-Verarbeitung, Rechtsgrundlagen, Nachweisführung, Speicherfristen und Widerruf ergänzen. Die produktive Seite sls.de/datenschutz wurde in dieser Änderung nicht bearbeitet.
6. Mit der freigegebenen Testadresse vor und nach Bestätigung prüfen: vorher unveränderte Felder; danach newsletter=true und accept_contact=true, Immobilienmailings unverändert. Bestätigungsnachweis und Abmeldung testen. Erst nach diesem Test die Vorschau-Konfiguration freigeben.

### Vorschau-Konfiguration

- PROPSTACK_GUIDES_DOI_BROKER_ID: ID des ausdrücklich gewählten Absenderkontos.
- PROPSTACK_GUIDES_DOI_SNIPPET_ID: ID des geprüften Bestätigungs-Textbausteins.
- PROPSTACK_GUIDES_DOI_VERIFIED=true: erst nach Prüfung des tatsächlichen Bestätigungsformulars, Feldänderungen und Widerrufs. Ohne diese Freigabe und beide gültigen IDs wird die Checkbox nicht aktiviert und die API nimmt keine Newsletter-Anmeldung an.

Das allgemeine Kontakt-API-Recht allein beweist keine Versandberechtigung. Der verwendete API-Schlüssel braucht zusätzlich Nachrichtenversand über das gewählte Konto. Es wurden keine neuen Umgebungsvariablen gesetzt und kein Newsletterversand live ausgeführt.

Referenzen: https://docs.propstack.de/webseite/newsletter-anmeldung und https://support.propstack.de/hc/de/articles/18364147809565-Kontakterlaubnis-DSGVO-Speicherberechtigung-einholen

## Textbaustein und Absender hinterlegt

Nutzerangabe: Textbaustein 1115618, Absender service@sls.de. Als serverseitige Konfiguration hinterlegt; der Absender wird über /brokers eindeutig anhand dieser E-Mail aufgelöst. Der Bestätigungsablauf ist damit noch nicht automatisch verifiziert. PROPSTACK_GUIDES_DOI_VERIFIED bleibt erforderlich.

Live-Prüfung 02.10.2026: service@sls.de wurde eindeutig als Propstack-Nutzer 228065 aufgelöst. Textbaustein 1115618 ist konfiguriert. Der feste Testempfänger war service@sls.de. Vor dem Test: newsletter=null (Keine Angabe), accept_contact=true, newsletter_unsubscribed=false. Bestehende Kontakterlaubnis wurde nicht zurückgesetzt.

Der Testversand über POST /messages wurde mit HTTP 401 abgelehnt. Deshalb kein bestätigter Versand, kein Test des Bestätigungslinks und keine Freischaltung. Der verwendete Website-API-Zugang konnte Nutzer/Kontakte lesen und eine Testnotiz anlegen, ist für diesen Versand aber nicht autorisiert. Die Versandberechtigung des verwendeten API-Schlüssels/Absenderkontos muss in Propstack geklärt werden. Die technische Testnotiz SLS-DOI-TEST-1115618-20261002 ist ausdrücklich keine Website-Einwilligung. Es wurde keine Kontaktzustimmung geändert.

Der vorübergehende token-geschützte Testzugang wurde nach dem fehlgeschlagenen Versand wieder aus dem aktuellen Stand entfernt. Die alte Vorschau-Version sperrt ihn zusätzlich automatisch nach zwei Stunden. Bei einem erneuten Versandtest nach Korrektur der Berechtigung vorher in Propstack prüfen, dass keine Bestätigungsmail zu diesem Versuch angelegt wurde.

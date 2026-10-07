# Ratgeberanforderung: bestehende Arbeitswebsite

## Freigegebener Ratgeber

- ID: VERKAUF
- Titel: Immobilie verkaufen. Mit einem guten Gefühl.
- PDF: SLS-Immobilie-verkaufen.pdf, 12 Seiten, Ausgabe Oktober 2026, vom Nutzer zum Versand freigegeben.
- Propstack-Notizkategorie (ID 741093, im Live-System category=for_notes) und Notiztitel: SLS_RATGEBER_VERKAUF_ANGEFORDERT
- Die fünf weiteren Ratgeber bleiben deaktiviert. Der Nutzer hat den Ratgeberversand über Propstack am 02.10.2026 bestätigt; sie ist kein öffentlicher Direktdownload auf der Website.

## Websiteablauf

GET /api/propstack-guide-request prüft den Zugang und die eindeutige Notizkategorie in Propstack und liefert ein signiertes, 30 Minuten gültiges Formulartoken. Erst dann wird das Formular aktiviert. POST akzeptiert ausschließlich VERKAUF und Vorname, Nachname und E-Mail-Adresse. Namen werden nach dem Trimmen mit jeweils maximal 100 Zeichen validiert; Telefonnummern werden nicht verlangt.

Vorhandene Kontakte werden anhand ihrer primären E-Mail-Adresse eindeutig zugeordnet. Bei mehreren Treffern oder einer abweichenden primären E-Mail wird abgebrochen. Neue Kontakte werden mit Vorname, Nachname und E-Mail-Adresse angelegt. Vor jeder Versandnotiz werden Vor- und Nachname des erneut gelesenen Kontakts verglichen. Unicode-Normalisierung, Groß-/Kleinschreibung und zusätzliche Leerzeichen werden berücksichtigt; andere Abweichungen und fehlende Bestandsnamen führen zur Prüfung. Die angegebenen Namen werden zudem in der Ratgebernotiz dokumentiert. Bei eindeutiger Identitätszuordnung kann ausschließlich eine fehlende Anrede ergänzt und anschließend erneut geprüft werden. Vorhandene Namen, Newsletter- und Einwilligungsfelder werden nicht geändert. Eine zusätzliche Newsletter-Anmeldung benötigt eine eigene Bestätigung über Propstack.

Die Notiz wird über POST /tasks erstellt, mit der aus /activity_types gelesenen Notizkategorie und client_ids. Keine Immobilien-/Portalanfrage und keine allgemeine Werbeeinwilligung. Die Notiz enthält angegebenen Namen, Ratgeber, Dateiname, Zeitpunkt, Quelle, Verwendungszweck, Datenschutzhinweis-Version und Anforderungs-ID. Erfolg wird nur nach bestätigter Notizanlage zurückgegeben. Die Antwort verrät keine Kontakt- oder Notiz-IDs.

## Aktueller Versandstatus

Der Nutzer hat den Ratgeberversand über Propstack am 02.10.2026 als funktionierend bestätigt. Die Oberfläche zeigt jetzt: „Vielen Dank! Sie erhalten Ihren Ratgeber in Kürze per E-Mail.“ Die Website erstellt weiterhin die Versandnotiz; den Ratgeber versendet der bestehende Propstack-Prozess.

Aktuell freigegeben ist die bestehende Arbeitsadresse `sls-website-eight.vercel.app` in Produktion. Der endgültige Onlinegang auf sls.de ist weiterhin ausgeschlossen. Vorschauen benötigen eigene scoped Zugänge; API-Schreibmethoden sind dort zusätzlich durch die Vercel-Firewall gesperrt. Lokale Entwicklung bleibt für synthetische Tests möglich.

## Konfiguration und Rechte

In veröffentlichten Umgebungen ausschließlich `PROPSTACK_GUIDES_API_KEY`; fehlt er, wird vor dem Provider-Aufruf abgebrochen. `PROPSTACK_API_KEY` ist nur für lokale Entwicklung ein Fallback. Erforderlich: Aktivitätstypen lesen, Kontakte lesen/anlegen, Aktivitäten lesen, Notizen anlegen. ID 741093, Bezeichnung und Notiztyp werden gemeinsam gegen die gelesene Kategorie geprüft. Fehlende Rechte/Kategorie: Formular bleibt gesperrt; es wird kein Erfolg simuliert.

## Schutz und Grenzen

- Same-origin-POST, serverseitige Zulassung nur des freigegebenen Ratgebers, begrenzte Eingabelänge, signiertes Formulartoken und unsichtbares Bot-Feld.
- Doppelklickschutz im Browser und Sperre gleicher E-Mail innerhalb einer Serverinstanz.
- Prüfung vorhandener Propstack-Notizen: gleiche Anforderungs-ID bzw. Anfrage derselben Kategorie innerhalb von zehn Minuten wird wiederverwendet.
- Zentral maximal acht POST-Versuche pro Netzwerkkennung und E-Mail in 15 Minuten; zusätzlich gilt eine GET-/Gesamtgrenze. Kennungen werden per HMAC pseudonymisiert. Kein Name, keine E-Mail und kein Notiztext werden im zentralen Schutzspeicher gespeichert. Fehlerprotokolle enthalten feste technische Ereignisse statt Providertexte.
- Unklar beantwortete Schreibvorgänge bleiben im zentralen Schutzspeicher für dieselben Eingaben gesperrt und erzeugen eine Prüfmarkierung; nicht blind erneut absenden. Instanzlokale und CRM-Notizprüfungen ergänzen diesen Schutz.
- Zentrale atomare Bearbeitungssperren und Ergebnisspeicherung sind eingerichtet; bei fehlendem Redis bleibt der Versand gesperrt. Schutzwerte verfallen spätestens nach 24 Stunden. Dies ersetzt keine anbieterübergreifende Transaktion oder dauerhafte Deduplizierung: nach Ablauf und bei manuellen Wiederholungen zuerst CRM und Postfach abgleichen; die Propstack-Automatisierung muss ebenfalls Doppelversand verhindern.

## Prüfung

node --test qa/guide-request.test.mjs qa/guide-form.test.mjs

Testet Kontaktzuordnung/Neuanlage, unveränderte Kontaktpräferenzen, korrekte Notiz, Duplikate, ungültige Angaben, fremde Herkunft, Token, Fehler/Timeouts, Drosselung, Produktionssperre sowie Formularzustände. Live-Testadresse auf ausdrücklichen Nutzerwunsch: service@sls.de. Den Ratgeberversand hat der Nutzer bestätigt. Der separate Newsletter-Bestätigungsprozess ist noch nicht eingerichtet.

API-Referenzen: https://docs.propstack.de/reference/kontakte und https://docs.propstack.de/reference/aktivitaeten-1

## Namensabweichungen / Prüfablauf

Bei abweichenden Namen wird am eindeutig zugeordneten Kontakt eine separate Notiz mit Titel `SLS_RATGEBER_VERKAUF_PRUEFUNG` ohne Versandkategorie angelegt. Sie enthält die eingegebenen Angaben und den Hinweis „PRÜFUNG ERFORDERLICH – KEIN VERSAND FREIGEGEBEN“. Es wird weder ein zweiter Kontakt erstellt noch der bestehende Kontakt überschrieben. Die Erfolgsmeldung zur Prüfung wird erst nach bestätigter Notizanlage ausgegeben. Mehrere Treffer oder eine abweichende primäre E-Mail bleiben ein Zuordnungsfehler ohne Schreibvorgang.

Der Besucher erhält den neutralen Hinweis zur nicht eindeutigen Zuordnung, keine Auskunft über den gespeicherten Namen oder CRM-IDs. „Angaben korrigieren“ erhält die Eingaben und lädt ein neues Formulartoken; „SLS kontaktieren“ führt zu /kontakt/. Korrigierte, übereinstimmende Namen durchlaufen anschließend die normale Anforderung. Bei korrekten abweichenden Angaben klärt SLS die Zuordnung persönlich; keine automatische Namensänderung.

Prüfnotizen werden separat von Versandnotizen dedupliziert. Gleichzeitige Anfragen mit verschiedenen Namen werden innerhalb einer Instanz nacheinander geprüft und bekommen ihr eigenes Ergebnis. Der zentrale Schutz aus dem Abschnitt Schutz und Grenzen gilt zusätzlich; nach Ablauf der Schutzfrist ist ein CRM-Abgleich weiterhin nötig.

**Propstack-Prozess einrichten:** Nur die Kategorie 741093 / SLS_RATGEBER_VERKAUF_ANGEFORDERT als Versand-Auslöser verwenden, niemals jede neue Notiz. Prüfnotizen bleiben ausgeschlossen. Nach persönlicher Klärung Bestandsdaten und neuere Anforderungen prüfen, eventuell Namen manuell berichtigen und einmalig die Versandnotiz anlegen, sofern noch keine korrigierte Anforderung diese erzeugt hat. Prüfnotiz anschließend als geklärt kennzeichnen. Die Website löst keine früheren Prüfnotizen automatisch auf und stoppt keine bereits laufenden Versandprozesse.

## Zwei getrennte Checkboxen

Die Pflicht-Checkbox lautet „Ich habe die Datenschutzerklärung zur Kenntnis genommen.“ und verlinkt https://sls.de/datenschutz/. Sie ist initial nicht angekreuzt. Ohne `privacyAcknowledged=true` und die aktuelle `privacyVersion` (`2026-10-02-v1`) lehnt die API die Anforderung ab, bevor Kontakte oder Notizen geschrieben werden. Browservalidierung allein reicht nicht aus.

Die vorhandene Ratgeber- bzw. Prüfnotiz dokumentiert die aktive Kenntnisnahme mit Wortlaut, Version, Datenschutzlink und Eingangszeitpunkt. Die Kenntnisnahme ist keine Werbeeinwilligung. Sie ändert weder Newsletter, Kontakterlaubnis noch DSGVO-Speicherstatus. Für sie ist keine zusätzliche Propstack-Automatisierung nötig. Die bestehende Ratgeberkategorie 741093 bleibt unverändert.

Die zweite Checkbox bleibt freiwillig und initial leer. Nur ihre aktive Auswahl erzeugt bei passender Kontaktzuordnung zusätzlich die kategorisierte DOI-Notiz. In Propstack müssen Newsletter/Kontakterlaubnis weiterhin erst nach tatsächlicher Bestätigung aktiviert werden. Versand und Linkwirkung wurden nicht durch diese Checkbox-Änderung getestet.

## Freiwillige Newsletter-Anmeldung über Propstack-Automatisierung

Stand 02.10.2026: Der Nutzer hat die Notiz und die Versandautomatisierung in Propstack eingerichtet. Die Website verwendet nun die **Notizkategorie** `SLS_NEWSLETTER_DOI_ANGEFORDERT` als Trigger. Der Name wird vollständig und eindeutig unter den Aktivitätstypen `note`/`for_notes` aufgelöst. Fehlt die Kategorie, ist sie mehrdeutig oder nicht lesbar, bleibt die Newsletter-Checkbox gesperrt; die Ratgeberanforderung bleibt verfügbar.

Die Checkbox ist freiwillig, nicht vorangekreuzt und nicht erforderlich. Serverseitig werden ausschließlich echte Booleans und bei Zustimmung die aktuelle Textversion akzeptiert. Der genaue Wortlaut steht in lib/guide-consent.mjs und wird durch einen Test mit dem HTML abgeglichen. Ohne Zustimmung bleiben bestehende Einstellungen unverändert. Namensabweichungen blockieren auch die Newsletter-Anmeldung.

Bei Zustimmung und passender Kontaktzuordnung erstellt die Website eine kategorisierte Notiz mit Name, E-Mail, Zeitpunkt, Quelle, genauem Einwilligungstext samt Version und Anforderungskennung. Die Propstack-Automatisierung soll daraufhin ausschließlich Textbaustein **1115618** über **service@sls.de** senden. Die Website sendet keine Nachricht über /messages und erstellt keinen vermeintlichen Versandbeleg. `confirmation_requested` bestätigt nur die gespeicherte Triggernotiz, weder Zustellung noch Double-Opt-in.

Die Website setzt **weder newsletter noch accept_contact** beim Absenden. Diese Felder dürfen erst durch die tatsächliche Bestätigung in Propstack gesetzt werden. Auch der Ratgeberprozess darf sie nicht setzen. Immobilienmailings werden nicht durch die Website aktiviert. Bestehende Einstellungen werden nicht zurückgesetzt. Eine neue Anmeldung nach Abmeldung benötigt erneut eine Bestätigung.

Wiederholungen derselben Anforderung sowie gleichartige Anforderungen innerhalb von zehn Minuten werden anhand gespeicherter Notizen unterdrückt. Frühere unkategorisierte DOI-Absichten lösen keinen automatischen Neuversand aus; sie werden als klärungsbedürftig behandelt. Bei ungewisser Notizanlage verhindert zusätzlich eine instanzlokale Sperre blinde Wiederholung für dieselbe Anforderungskennung. Zusätzlich gelten die zentralen Bearbeitungssperren und Prüfmarkierungen aus Schutz und Grenzen.

### Einrichtung und Abschlussprüfung in Propstack

- Auslöser: ausschließlich Kategorie `SLS_NEWSLETTER_DOI_ANGEFORDERT`. Folgeaktivität: Bestätigungsmail aus Textbaustein 1115618, Absender service@sls.de. Keine Werbeserie und keine Kontaktfreigabe allein durch die Notizanlage oder den Mailversand.
- Der dokumentierte Standardlink `{{ kontakt_link }}` aktiviert auch Immobilienmailings. Das tatsächliche Bestätigungsformular muss auf die ausgewählte Einwilligung abgestimmt sein; Vorlage docs/newsletter-bestaetigung.txt nutzt `{{ kontakt_profil_button }}`. Der Nutzer hat die Einrichtung bestätigt, die konkrete Linkwirkung wurde von uns noch nicht geprüft.
- Marketing nur bei passender bestätigter Einwilligung, newsletter=true, accept_contact=true und ohne wirksame Abmeldung. Bestätigungsnachweis speichern und Abmeldung berücksichtigen.
- Abschlussprüfung mit der freigegebenen Adresse service@sls.de: Ratgeber plus Bestätigungsmail, vor Bestätigung unveränderte Felder, danach die vereinbarten Einstellungen und unveränderte Immobilienmailings. Auch Abmeldung prüfen. Die Website kann weder Posteingang noch eine durch den Empfänger bestätigte Einwilligung simulieren.
- Produktive Datenschutzerklärung um den tatsächlichen Ratgeber-/Newsletterablauf ergänzen. Die produktive Seite sls.de/datenschutz wurde hier nicht bearbeitet.

Die vorherigen Website-Konfigurationen PROPSTACK_GUIDES_DOI_BROKER_ID, PROPSTACK_GUIDES_DOI_SNIPPET_ID und PROPSTACK_GUIDES_DOI_VERIFIED werden nicht mehr ausgewertet: Versand und Bestätigung liegen jetzt im vom Nutzer eingerichteten Propstack-Prozess. Der aktuelle Zugriff auf die bestehende Arbeitswebsite und die zusätzliche Vorschau-Firewall stehen im Abschnitt Aktueller Versandstatus.

### Vorheriger direkter Versandversuch

service@sls.de wurde als Propstack-Nutzer 228065 aufgelöst. Vor dem damaligen Test: newsletter=null, accept_contact=true, newsletter_unsubscribed=false. POST /messages wurde mit HTTP 401 abgelehnt; es gab keinen bestätigten Versand. Die technische Notiz SLS-DOI-TEST-1115618-20261002 ist keine Einwilligung. Der vorübergehende Testzugang wurde entfernt. Die Umstellung auf Notizautomatisierung ersetzt diesen direkten API-Mailversand.

Referenzen: https://docs.propstack.de/webseite/newsletter-anmeldung und https://support.propstack.de/hc/de/articles/18311864009885-Aufgaben-Termine-Notizen-E-Mails-automatisieren

## Kompakter Einwilligungstext und Formularlayout

02.10.2026: Der Nutzer bestätigt, dass beide Mails versandt wurden. Die Wirkung des Bestätigungslinks auf die Kontaktfelder ist damit noch nicht bestätigt.

Der Newslettertext wurde auf Version `2026-10-02-v2` gekürzt. Unternehmen, E-Mail-Kanal, Themen und Dienstleistungen, Verwendung von Name/E-Mail, Freiwilligkeit unabhängig vom Ratgeber und Widerruf über den Abmeldelink bleiben ausdrücklich enthalten. Das HTML und der in Propstack dokumentierte Wortlaut verwenden dieselbe Version; veraltete Formularversionen werden bei Newsletter-Auswahl abgelehnt. Keine Änderung der Propstack-Triggerkategorien oder vorhandener Kontaktfelder.

Layout: feste 20px-Checkbox-Spalte, vollständige Rücksetzung der globalen 52px-Mindesthöhe und Eingabefeld-Abstände, Textausrichtung an der ersten Zeile und kompaktere Abstände. Datenschutzlink bleibt sichtbar. Kein Ausblenden notwendiger Einwilligungsangaben hinter einem Aufklappbereich.

Referenz: Datenschutzkonferenz, Orientierungshilfe Direktwerbung (Februar 2022), Abschnitte 3.1, 3.3 und 3.4: https://www.datenschutzkonferenz-online.de/media/oh/OH-Werbung_Februar%202022_final.pdf . Das ist keine rechtliche Gesamtfreigabe: Datenschutzerklärung, tatsächliches Bestätigungsformular, Nachweis und Widerrufsprozess müssen zum Ablauf passen.

## Anrede für personalisierte Propstack-Mails

Das Ratgeberformular enthält die Pflichtauswahl Anrede vor den Namen, zunächst „Bitte wählen“. Herr wird als `salutation=mr`, Frau als `salutation=ms` übergeben. Die API akzeptiert nur diese Werte und prüft sie vor Kontaktänderungen.

Neue Kontakte werden mit Anrede, Vorname, Nachname und E-Mail angelegt. Bei vorhandenen Kontakten mit eindeutig passender primärer E-Mail und Namen wird ausschließlich eine fehlende Anrede per PUT /contacts/:id ergänzt. Anschließend werden ID, E-Mail, Namen und Anrede erneut gelesen und geprüft, bevor Versandnotizen entstehen. Stimmen vorhandene Anrede oder Namen nicht überein, bleibt der Kontakt unverändert und eine Prüfnotiz ohne Versandkategorie wird angelegt. Newsletter-, Kontakt- und DSGVO-Felder werden nicht geschrieben.

Die ausgewählte Anrede steht zusätzlich in der Ratgeber-/Prüfnotiz und DOI-Notiz. Propstack-Mailvorlagen müssen die dynamische Anrede (z. B. {{ anrede }}) verwenden, damit sie die gespeicherte Angabe berücksichtigen. Ein fest geschriebener Gruß wird durch dieses Website-Update nicht ersetzt. Tatsächliche Personalisierung und API-Schreibrechte für das Ergänzen bestehender Kontakte bleiben im realen Ablauf zu prüfen.

API-Referenz: https://docs.propstack.de/reference/kontakte (salutation mr/ms, PUT /contacts/:id).

## Zusammenführung und Veröffentlichung auf bestehender Website

Am 02.10.2026 hat der Nutzer die Übernahme aller Vorschau-Änderungen auf https://sls-website-eight.vercel.app/ mit Erhalt des dortigen Fortschritts freigegeben. Basis auf main: 4cc67f646a897bf81262993c6d3afc2d7e734c84 (SIA). Die bestehende SIA-Einbindung, ihre API und Konfiguration werden durch einen Merge erhalten. In vercel.json bleiben sowohl SIA als auch Ratgeber mit eigener Funktionskonfiguration bestehen.

Die vorherige reine Vorschau-Sperre des Ratgeberendpunkts ist für genau sls-website-eight.vercel.app aufgehoben. Andere Produktionsadressen, insbesondere sls.de/www.sls.de, bleiben gesperrt. Lokale synthetische Tests bleiben verfügbar; schreibende API-Aufrufe aus Vorschauen sind inzwischen durch die zusätzliche Firewall gesperrt. Die ursprünglichen Veröffentlichungen und Git-Eltern bleiben als Rückkehrpunkte erhalten. Die Freigabe ersetzt keine rechtliche Gesamtprüfung des Newsletterprozesses.

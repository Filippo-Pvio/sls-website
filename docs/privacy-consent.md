# Einwilligungsverwaltung – 11. Oktober 2026

Ziel: Besucher entscheiden vor Anbieterzugriff; gespeicherte Freigaben erlauben anschließend automatisches Laden. Ablehnung oder Schließen erteilt keine Freigabe. Die endgültige Domain und der Hosterwechsel sind nicht Teil dieser Änderung.

## SLS-interne Freigabe – 18. Oktober 2026

Filippo Livera hat im Chat nach ausdrücklicher Klärung mit „ja“ die **SLS-interne Freigabe des aktuellen Datenschutzentwurfs** bestätigt. Bezug: Inhaltsstand von PR #244, Commit `664addd42c24f3328c90fa13cf9c8833951b24ec`, insbesondere `/datenschutz/`, `/karriere/datenschutz/` und das vorbereitete Aufbewahrungs-/Bewerberpool-Konzept. Die Freigabe gilt für diesen Entwurf, nicht pauschal für spätere inhaltliche Änderungen.

Die zunächst erteilte interne Freigabe wurde anschließend durch die ausdrückliche Nutzermitteilung „unabhängige Rechtsprüfung bestätigt“ ergänzt. Damit ist die Durchführung einer unabhängigen Rechtsprüfung des zuvor bezeichneten Entwurfs durch den Nutzer bestätigt. Codex hat diese unabhängige Prüfung nicht selbst durchgeführt. Prüfperson, Datum der Prüfung, Prüfbericht und etwaige Einzelauflagen wurden nicht mitgeteilt; sie werden nicht erfunden. Eine gesonderte Erklärung des bestellten Datenschutzbeauftragten wird daraus nicht abgeleitet. Der notwendige betriebliche Vollzug der Löschung und die tatsächliche Vertrags-/Kontokonfiguration werden durch diese Bestätigung nicht technisch verändert. Es wurden keine tatsächlichen Bewerberdaten gelöscht oder in einen Pool aufgenommen.

**Merge, Produktiv-Rollout, Domainwechsel und Änderungen an der alten Website bleiben ausdrücklich nicht freigegeben.** Die Website wurde durch diesen Dokumentationseintrag nicht geändert; die sichtbare Kennzeichnung als Arbeitsfassung bleibt vorerst bestehen. Eine spätere Veröffentlichung erfordert eine gesonderte ausdrückliche Entscheidung des Nutzers.

## Bestand und technische Steuerung

| Kategorie | Dienste/Speicherung | Vor Freigabe |
| --- | --- | --- |
| Medien | Instagram, YouTube einschließlich externem Vorschaubild, ImmoScout24-/Immowelt-Badges, virtuelle Rundgänge | iframe/image src wird bereits vor HTML-Auslieferung entfernt; dynamische Frames erhalten zuerst nur eine inerte Datenadresse |
| Karten | Google Maps, OpenStreetMap, Google Maps SDK | statische/dynamische Frames gesperrt; interaktive Kartenbibliothek/SDK/Tiles starten erst nach Freigabe |
| Rechner | PriceHubble, Justhome | iframe und PriceHubble-Skript gesperrt |
| Optionale Darstellung | Magazin-/Referenzauswahl, SIA-Hinweiszustand | kein Zugriff auf sessionStorage ohne Freigabe; eigene Einträge bei Ablehnung entfernt |
| Angeforderte Funktionen/Sicherheit | Datenschutzauswahl, SIA-Quota-Cookie, ausdrücklich benutzte Favoriten, freiwillig gespeicherter Verkaufscheck | unabhängig von optionalen Kategorien; separate Zwecke und Fristen erläutert |

Lokale Fonts und Leaflet-Dateien benötigen keine Drittanbieterfreigabe. SLS-Bilder und Propstack-Objektbilder gehören zur Auslieferung der angeforderten Websiteinhalte. Für die Google-Erweiterung vom 17. Oktober 2026 gilt ergänzend die Tracking-Dokumentation unter docs/tracking/README.md; dort ist die separate Statistik-Kategorie beschrieben. Diese Implementierung ist kein Nachweis der Cookies aller künftigen Drittanbieter; vor neuen Einbindungen erneut inventarisieren.

Auswahl: `sls-privacy-choice-v1`, Version `2026-10-11.1`, maximal 180 Tage, boolesche Kategorien plus Zeitpunkt/Version ohne individuelle Kennung. Entscheidung bleibt im Browser, kein neuer Server-Export und keine zentrale Einwilligungsakte. Bei geänderter Textversion/abgelaufener Auswahl wird erneut gefragt. Blockierte Speicherung wirkt nur für die aktuelle Seite. Cross-Tab-Änderungen und Wiederherstellung aus dem Browser-Seitencache prüfen den Stand erneut.

Widerruf entfernt die Einbindungen und lädt die Seite neu, damit auch SDK-interne Verbindungen enden. Von fremden Domains gesetzte Cookies kann SLS nicht löschen. Alte Drittanbieter-Cookies und vor der Umstellung bestehende Verbindungen werden nicht als rückwirkend entfernt behauptet.

## Veröffentlichung und Zielhost

`lib/consent-html.mjs` läuft im öffentlichen Build und im SSR-Immobilienrenderer. Auch die lokale Vorschau verwendet dieselbe Transformation. Ein reiner MutationObserver wäre für statische iframe-src zu spät. Beim eigenen Hoster müssen der öffentliche Build und der dynamische Renderer weiterhin diese Transformation anwenden. Keine Roh-HTML-Dateien ungeprüft übertragen.

Vor Onlinegang: tatsächliche Providerbedingungen/Speichertechniken, Einwilligungstexte, Vertragsnachweise und Zielhost-Prüfung abschließen. Die technische Umsetzung ersetzt diese dienstbezogene Bewertung nicht. Bereits besprochene Propstack-Vertragsnachweise und die vollständige Datenschutzerklärung für sls.de bleiben separate Arbeiten.


## Überarbeitung der Datenschutzhinweise – 18. Oktober 2026

Arbeitsfassung in `/datenschutz/`, ergänzend `/karriere/datenschutz/`. Ausschließlich im Entwicklungsbranch von PR #244; keine Produktivfreigabe und keine Veränderung der alten Website. Maßstab ist zutreffende und verständliche Information zu den tatsächlichen Verarbeitungen; Textumfang ersetzt weder Rechtsgrundlage noch Vertrag oder technische Einwilligung.

### Bereits bestätigte Festlegungen aus anderen Chats

- Chat „SLS-Website-SEO-Audit aktualisieren“, 11.10.2026, 16:24 UTC: Nutzer bestätigt ausdrücklich einen bestellten Datenschutzbeauftragten. Danach bestätigt er die Weiterleitung über service@sls.de. Der Kontakt bleibt erhalten; kein neuer Personenname wird erfunden oder verlangt. Intern muss die vertrauliche Erreichbarkeit sichergestellt sein.
- Chat „Website-Datensicherheit analysieren“, 07.10.2026, und `docs/retention-and-deletion.md`: Filippo ist zuständig; 30 Tage für freiwillig gespeicherten Verkaufscheck, monatliche Bestandsprüfung, Prüftermine 6 Monate/90 Tage/30 Tage je Bestand. Dies sind organisatorische Prüftermine, keine automatische CRM-/Postfachlöschung. Die Erklärung bildet diese Unterscheidung ausdrücklich ab.
- Öffentliche Propstack-Unterlagen werden gemäß früherem Nutzerwunsch verwendet. Sie ersetzen weiterhin keinen Nachweis der für das SLS-Konto geltenden Vereinbarung.
- Nutzerbestätigung hier am 18.10.2026: CRM-Ankunft bereits getestet und bestätigt, keine Wiederholung dieser Tests. PriceHubble/Justhome werden nicht erneut funktional abgenommen. Fehlende eigene Erfolgs-Callbacks werden dadurch nicht zu nachgewiesenen GA4-Conversions; es bleiben ausschließlich die sechs belegten SLS-Formularereignisse.

### Inhaltliche Korrekturen

- 16 klar verlinkte Abschnitte, Tabellen für eigene Speichertechniken und organisatorische Prüftermine; mobil lesbar.
- Zweck, Datenkategorien und Rechtsgrundlagen pro Vorgang; Pflichtangaben, Folgen fehlender Angaben, Widerruf/Widerspruch, Aufsicht und fehlende ausschließlich automatisierte Entscheidungen erläutert.
- Provider getrennt: Vercel, Upstash, Propstack, Microsoft 365, OpenAI, Google Analytics/GTM, PriceHubble, Justhome, Google Maps, OpenStreetMap, YouTube, Instagram, ImmoScout24/Immowelt, virtuelle Touren sowie externe Objektbilder.
- SIA nicht als anonym bezeichnet: Gespräch/Frage, mögliche Websuche und `store:false` samt verbleibender Anbieterprotokolle erläutert. Keine Nullspeicherung und keine ausschließliche EU-Verarbeitung behauptet. API-Standardbedingungen sind keine geprüfte SLS-Kontokonfiguration.
- Google-Fristen präzisiert: Zwei Monate Ereignisdaten bedeuten nicht die Löschung aller aggregierten Berichte. Kein Meta-Pixel bedeutet nicht, dass optional aktivierte Instagram-Frames keine Meta-Verbindungen herstellen.
- Bewerbungsseite erhält denselben Datenschutzkontakt und Prüfvorbehalt. Ungeprüfte Aussage über bereits vereinbarte Drittlandgarantien wird korrigiert.
- Datenschutz, Impressum und Bewerbungsdatenschutz bleiben bei Erstbesuch ohne automatisch geöffnetes Modal lesbar. Manuelle Einstellungen und sämtliche optionalen Sperren bleiben erhalten. Einwilligungszwecke, Kategorien und Google-Konfiguration wurden dabei nicht erweitert.

### Konkrete rechtliche Restprüfung vor Veröffentlichung

| Gegenstand | Belegt | Noch erforderlich |
| --- | --- | --- |
| Datenschutzkontakt | Bestellter Beauftragter und Weiterleitung service@sls.de bestätigt | Vertrauliche direkte Kommunikation organisatorisch sicherstellen; kein öffentlich erforderlicher Personenname erfinden |
| Propstack | Nutzer benennt öffentliche Datenschutzhinweise als einzigen vorhandenen Nachweis; keine weitere Vereinbarung bekannt. Anbieterhinweise geprüft und eingebunden. | Vertragslage als offen an rechtliche Endprüfung geben; keine abgeschlossene SLS-AVV behaupten und keine erneute Unterlagensuche vom Nutzer verlangen. |
| Vercel/Upstash | Vercel Pro im Projektteam; Upstash-Datenbank in Frankfurt; öffentliche Vertragsbedingungen | Rechtliche Kundenzuordnung des Vercel-Teams, internationale Supportzugriffe und konkrete Log-/Backupfristen final belegen; Details siehe Kontoprüfung unten |
| Microsoft 365 | Nutzer bestätigt am 18.10.2026 Microsoft als E-Mail-Host; SLS-Mandant und Business-Premium-Lizenzen im Admincenter sichtbar | Aktive Microsoft-Kundenvereinbarung im SLS-Abrechnungskonto seit 04.02.2025 nachgewiesen; aktuelle Produkt-DPA zugeordnet. Purview und Exchange für Verkaufscheck/Bewerbungen geprüft: Default MRM Policy, Archive deaktiviert, keine pauschale automatische Löschung nachgewiesen; Einzelheiten im Prüfprotokoll unten. IONOS-Anmeldung entfällt. |
| OpenAI | Nutzerauftrag umgesetzt: Company name in Billing auf SLS Immobilienpartner GmbH geändert, nach Neuladen bestätigt. SLS-Adresse/USt-ID korrekt; Sharing deaktiviert, Global/Standard retention. | Rechnungsangabe allein ist kein rückwirkender Vertragswechsel. Geltung der DPA und tatsächliche API-Projektzuordnung für Endprüfung dokumentieren. |
| Google | DPA angenommen; auf ausdrücklichen Nutzerauftrag primären Kontakt Filippo Livera, service@sls.de und SLS-Postanschrift hinzugefügt und gespeichert geprüft. | Separater Firmenname/Organisationsverknüpfung in der Zusatzansicht weiterhin leer. Keine Umstellung bestehender Tracking-Konfiguration. Kein unbekannter DSB-Personenname eingetragen. |
| PriceHubble/Justhome | Einbettungen und offizielle Anbieterhinweise | Konkreten SLS-Vertragspartner, Auftragsverarbeitung/eigene Verantwortung, Datenempfänger und Fristen des eingebetteten Produkts rechtlich zuordnen. Keine erneuten echten Anfragen nötig. |
| Ogulo / 360°-Touren | Beide Nutzerlinks geprüft; .com als aktuelle Hauptquelle, abweichende .de-Hinweise verlinkt. Nutzer kennt keine zusätzliche Vereinbarung; frühere Anbieter-Mail verweist auf bestehende AVV. | Widersprüchliche Nachweislage an Endprüfung geben. Weder bestehenden Vertrag allein wegen Mail als vollständig bewiesen noch fehlenden Vertrag allein wegen fehlender PDF behaupten. |
| Externe Medien/Karten/Badges | Anbieter und Einwilligungssteuerung | Konkrete Speichertechniken/Fristen und Drittlandgarantien der tatsächlich geladenen Produkte final prüfen; Anbieter-Erklärung für dessen ganze Website nicht ungeprüft übernehmen |
| Löschung/Bewerbungen | Rechtlich begrenzte Aufbewahrung und separat freiwilliger Bewerberpool bis zwölf Monate im Entwurf ergänzt; Ablauf in docs/retention-and-deletion.md. | Betrieblich umsetzen; kein automatischer Löschjob, keine tatsächlichen Bewerberdaten verändert, Endprüfung bleibt. |

Die Hauptseite nennt verbleibende Unklarheiten sichtbar als Arbeitsfassung. Sie darf erst nach Ergänzung dieser Tatsachen und Freigabe durch den Datenschutzbeauftragten beziehungsweise qualifizierte Rechtsprüfung als endgültige Erklärung verwendet werden. Keine Aussage „abmahnungssicher“ oder „DSGVO-zertifiziert“.

### Verwendete Primärquellen (abgerufen 18.10.2026)

- DSGVO, insbesondere Art. 5, 6, 12–22, 28, 44 ff.: https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679
- DSK Orientierungshilfe Digitale Dienste: https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf
- § 25 TDDDG: https://www.gesetze-im-internet.de/ttdsg/__25.html
- § 26 BDSG: https://www.gesetze-im-internet.de/bdsg_2018/__26.html
- Handels-/Steueraufbewahrung: https://www.gesetze-im-internet.de/hgb/__257.html und https://www.gesetze-im-internet.de/ao_1977/__147.html
- Propstack: https://www.propstack.de/auftragsverarbeitung/ und https://www.propstack.de/datenschutzerklaerung-propstack-software/
- Vercel: https://vercel.com/legal/privacy-notice und https://vercel.com/legal/dpa
- Upstash: https://upstash.com/trust/dpa.pdf und https://upstash.com/static/trust/privacy.pdf
- OpenAI: https://developers.openai.com/api/docs/guides/your-data und https://openai.com/enterprise-privacy/
- Microsoft: https://www.microsoft.com/de-de/privacy/privacystatement und https://www.microsoft.com/licensing/docs/view/Microsoft-Products-and-Services-Data-Protection-Addendum-DPA?lang=1
- PriceHubble: https://www.pricehubble.com/de/privacy/privacy-policy
- Justhome: https://justhome.com/datenschutz
- Google: https://policies.google.com/privacy?hl=de
- OpenStreetMap: https://osmfoundation.org/wiki/Privacy_Policy
- ImmoScout24: https://www.immobilienscout24.de/agb/datenschutz.html
- Immowelt: https://www.immowelt.de/immoweltag/datenschutz
- Zuständige Aufsicht: https://www.ldi.nrw.de/kontakt


### Nachtrag Ogulo und öffentlich zugängliche Vertragsunterlagen – 18.10.2026

Der Nutzer bestätigt Ogulo als 360°-Anbieter. Die öffentliche Erklärung nennt jetzt Ogulo GmbH, Im Mediapark 5b, 50670 Köln, die Einwilligungskategorie und offizielle Links. Die bisherige Unklarheit über den Touranbieter ist erledigt.

Öffentliche Unterlagen sind die Ausgangsbasis. Eine separat handschriftlich unterschriebene AVV ist nicht pauschal erforderlich; auch wirksam einbezogene elektronische Vertragsbedingungen sind zu berücksichtigen. Nicht allein aus dem Vorhandensein einer Hersteller-Webseite auf einen nachgewiesenen SLS-Vertrag schließen. Konto-/Tarif-/Bestellzuordnung genügt gegebenenfalls zur Begründung der Vertragsgeltung; nur verbleibende Lücken gezielt bestätigen lassen.

Ogulo beschreibt einen ausdrücklichen Abschlussweg über „Jetzt AVV abschließen“ auf https://ogulo.com/sicherheit-datenschutz/ und erläutert diesen unter https://support.ogulo.com/auftragsverarbeitungsvertrag-avv-dsgvo . Das öffentliche Angebot eines Abschlusses belegt nicht, dass SLS ihn bereits vorgenommen hat. Kein Formular abgesendet und kein Vertrag angenommen. Die Sicherheitsseite enthält zudem ältere Verweise auf Privacy Shield; diese werden nicht als aktuelle Übermittlungsgrundlage in die SLS-Erklärung übernommen. Ein europäischer AWS-Hostingstandort allein belegt keine vollständige Abwesenheit internationaler Zugriffe. https://ogulo.com/impressum/ und https://ogulo.com/datenschutz/ sind weitere Primärquellen.


### Korrektur des E-Mail-Anbieters – 18.10.2026

Der Nutzer bestätigt: Die E-Mails liegen bei Microsoft. Das Microsoft-365-Admincenter zeigt den Mandanten SLS Immobilienpartner GmbH und Microsoft 365 Business Premium. Die historische Dokumentation zu IONOS-MX wird nicht mehr als Nachweis aktueller Postfachverarbeitung herangezogen. IONOS ist aus der Mailbeschreibung des Relaunch-Entwurfs entfernt; der angefragte IONOS-Login wird nicht mehr benötigt. Keine DNS-/Mailkontoänderung vorgenommen.

Nutzer bestätigt außerdem SIA-Betrieb über Workspace SLS Immobilienpartner. Im aktuell zugänglichen API-Portal ist nur eine Organisation „Personal“ mit einem Standardprojekt sichtbar. Diese Organisation wird ohne weiteren Beleg nicht als SIA-Vertragspartner ausgegeben. Keine API-Schlüssel ausgelesen oder verglichen. Weitere Konto-Zuordnung beziehungsweise passende Anmeldung nötig.


### Read-only-Kontoprüfung und Vertragszuordnung – 18.10.2026

Es wurden ausschließlich bestehende Einstellungen und Vertragsansichten gelesen. Keine Verträge neu angenommen, keine Mail-/DNS-/Anbieter-Einstellungen verändert und keine Testanfragen versendet. Keine Zugangsschlüssel oder signierten Download-URLs in dieser Dokumentation speichern.

| Dienst | Im angemeldeten Konto festgestellt | Vertragsbezug und verbleibende Grenze |
| --- | --- | --- |
| Microsoft 365 | Mandant und Käufer: SLS Immobilienpartner GmbH; Business Premium. Im Abrechnungskonto aktive Microsoft Customer Agreement mit Gültigkeitsdatum 04.02.2025. | Microsoft-Produkt-DPA über das offizielle Lizenzportal zugeordnet. Kein separat zu unterschreibendes leeres Formular allein aus einer allgemeinen Herstellerseite ableiten. Konkrete Exchange-Aufbewahrung und Backup-/Kopienregelung noch nicht nachgewiesen. |
| Vercel | Bestehendes Projektteam im Pro-Tarif. Firmenname in der Abrechnungsansicht entspricht dem technischen Teamnamen. Projekt-Funktionsvoreinstellung: Washington D.C., USA (iad1). | Die offizielle DPA erfasst Pro/Enterprise. Rechtlicher Kunde hinter dem Team ist durch den technischen Namen noch nicht eindeutig belegt. Die Projektvoreinstellung beweist nicht allein die Region jeder ausgelieferten Funktion; keine ausschließliche EU-Verarbeitung zusichern und keine Region ändern. Quelle: https://vercel.com/legal/dpa |
| Upstash | Bestehende Vercel-Integration, Datenbank sls-sia-tageslimit, Free, AWS Frankfurt (eu-central-1); zugleich als Global bezeichnet. Daily Backup nicht aktiviert, keine Backups in der Liste. | § D.5 der Bedingungen bezieht DPA/Datenschutz ein. Frankfurt ist kein Beleg für ausschließlich deutsche Verarbeitung sämtlicher Daten, Supportzugriffe oder Unterauftragnehmer. Leere Backup-Liste schließt anbieterseitige Redundanz nicht aus. Quellen: https://upstash.com/trust/terms und https://upstash.com/static/trust/dpa.pdf |
| Propstack | Bestehendes SLS-Konto; DSGVO-Einstellungen vorhanden. | Öffentliche AVV enthält eine kundenspezifische Anlage. Ein für SLS geltender Abschluss wurde noch nicht gefunden. Eine begrenzte Postfachsuche nach Ogulo AVV ergab keinen Treffer; daraus folgt kein allgemeiner Nachweis fehlender Verträge. Keine CRM-Konfiguration ändern. |
| Ogulo | Firmenprofil SLS Immobilienpartner GmbH. Feld Google-Analytics-Tracking-ID leer; kontoweite Analytics-Option eingeschaltet. | Dies belegt keine tatsächliche Analytics-Übertragung einzelner Touren. Öffentlicher Abschlussweg öffnet ein Adobe-Sign-Dokument mit 17 Seiten. Nichts ausgefüllt, signiert oder durch Weiter angenommen. Vor neuem Abschluss Vertragsinhalt prüfen und ausdrückliche Freigabe einholen. |
| PriceHubble | Eingebettetes Produkt und Anbieter bekannt; kein zugeordneter Kontovertrag belegt. | Die öffentlich gefundene DPA auf https://www.pricehubble.com/privacy/dpa nennt eine US-Gesellschaft. Sie wird deshalb nicht ungeprüft als SLS-Vertrag der deutschen/schweizerischen Leistung übernommen. |
| Justhome | Öffentliche Datenschutzhinweise liefern Anbieteridentität und allgemeine Verarbeitungshinweise; vorhandene Einbettung im Code belegt. | Für den Anbieterabschnitt kein pauschaler Partner-Login erforderlich. Nutzer bestätigt Rückmeldungen in Propstack und nach seiner Kenntnis keine gesonderte Vereinbarung. Umfang, Rechtsgrundlage und Rollen dieses Austauschs bleiben rechtlich zuzuordnen. Keine pauschale AVV-Pflicht aus einer Einbettung ableiten. |
| OpenAI / SIA | Nutzer benennt Workspace SLS Immobilienpartner; sichtbare API-Organisation heißt Personal. | Keine Gleichsetzung beider Konten. Passende API-Organisation und deren Vertrags-/Datenoptionen müssen noch zugeordnet werden. Keine Schlüssel ausgelesen. |

Microsoft ist damit als aktueller Mailanbieter und SLS-Vertragskonto belegt. Die historische IONOS-Zuordnung wird für den Relaunch nicht weiterverwendet. Betriebsinterne Löschprüftermine bleiben von technisch eingerichteten Aufbewahrungsrichtlinien getrennt.


### Vertiefte Prüfung: E-Mail-Aufbewahrung und Vertragsnachweise – 18.10.2026

Die nachfolgenden Ergebnisse stammen aus den angemeldeten Konten. Es wurden keine Richtlinien erstellt, bearbeitet oder gelöscht, keine Postfachinhalte in Exchange geöffnet und keine Anbieter angeschrieben. Die Vertragsmail-Suche in Propstack war auf einschlägige Begriffe begrenzt; kein gesamter Mailbestand wurde exportiert.

#### Microsoft Purview und Exchange

- Purview → Datenlebenszyklusverwaltung → Richtlinien → Aufbewahrungsrichtlinien: Liste vollständig geladen, **0 Elemente / keine Daten verfügbar** im zugänglichen Berechtigungsumfang. Dies allein beweist weder Abwesenheit jeder anderen Aufbewahrungsregel noch eine generelle Löschfrist.
- Exchange (Legacy) → MRM-Aufbewahrungsrichtlinien: **Default MRM Policy** vorhanden. Die Detailansicht nennt persönliche Lösch-/Archivierungsoptionen, Junk Email, Default 2 year move to archive, Never Delete und Recoverable Items 14 days move to archive.
- MRM-Aufbewahrungstags: Standard-Archivtag mit **730 Tagen** sichtbar. Persönliche Löschtags mit 7/30/180/365/1825 Tagen sind auswählbare Tags, keine pauschal für jedes Postfach und jede Nachricht aktivierte Löschregel. Junk-Email-Tag: **30 Tage / Löschen**.
- Ein Tag Deleted Items mit 30 Tagen ist im Tagkatalog sichtbar, wurde in der Detailansicht der Default MRM Policy aber nicht aufgeführt. Seine bloße Existenz wird deshalb **nicht** als angewandte 30-Tage-Regel für diese Postfächer dokumentiert. Ebenso ist ein im Richtliniendetail genannter Archivtag kein Nachweis der tatsächlich wirksamen Wiederherstellungsfrist.

| Geprüftes Relaunch-Postfach | Zugeordnete Aufbewahrungsrichtlinie | Archivstatus | Belastbare Aussage |
| --- | --- | --- | --- |
| verkaufscheck@sls.de | Default MRM Policy | Deaktiviert / None | Keine pauschale automatische Löschung normaler Ein-/Ausgangsmails nach 90 Tagen, sechs Monaten oder zwei Jahren nachgewiesen. Der Zweijahrestag ist eine Archivierungsaktion. |
| bewerbung@sls.de | Default MRM Policy | Deaktiviert / None | Eine automatische Sechsmonatslöschung von Bewerbungen ist mit dieser Konfiguration nicht nachgewiesen. Das betriebliche Löschverfahren muss die beschriebene Frist umsetzen. |

Grenzen: Persönliche Ordner-/Nachrichtentags, tatsächliche Wiederherstellungsdauer endgültig gelöschter Elemente, etwaige Holds, weitere Mailkopien und Drittanbieter-Backups wurden damit nicht abschließend belegt. Andere Mitarbeiterpostfächer wurden nicht auf Inhalte oder individuelle Aufbewahrung geprüft. Ein manuelles Löschverfahren kann bestehen; fehlende Automatisierung beweist nicht, dass SLS überhaupt nicht löscht.

Folge für die Erklärung: Keine technischen Löschgarantien ergänzen. Die bereits dokumentierten organisatorischen Prüftermine bleiben Prüftermine. Vor Endfreigabe festhalten, wer Bewerbungen und Verkaufscheck-Mailkopien wann prüft/löscht und wie notwendige Ausnahmen, Kopien und Wiederherstellungen behandelt werden. Microsoft-Konfiguration nicht im Zuge dieser Prüfung verändern.

Referenzen für die Einordnung, nicht als Ersatz der Kontoprüfung: https://learn.microsoft.com/de-de/purview/create-retention-policies und https://learn.microsoft.com/de-de/exchange/security-and-compliance/messaging-records-management/retention-tags-and-policies .

#### Google-Vertragsstatus

In Analytics-Konto 324255696, mit neuer Relaunch-Property 559391964 ausgewählt, zeigt Kontodetails: **Datenverarbeitungsbedingungen am 06.08.2024 akzeptiert**. Die Ansicht verlinkt ausdrücklich die Datenverarbeitungsbedingungen unter https://business.safety.google/adsprocessorterms/ für den Analytics-Dienst. Die Bezeichnung Werbeprodukte wird nicht mit einer Änderung an Google Ads verwechselt.

Die verlinkte Zusatzverwaltung zeigt keinen eingetragenen Firmennamen und eine leere DPA-Kontakttabelle; außerdem keine Verknüpfung mit einer Marketing-Platform-Organisation. Letzteres allein ist kein Nachweis eines fehlenden Vertrags. Die Annahme der Bedingungen ist belegt; die sichtbaren Unternehmens-/Kontaktangaben sind zu vervollständigen beziehungsweise zu klären. Diese Ansicht betrifft das gemeinsame bestehende Konto, nicht nur die Relaunch-Property. Aufgrund der Vorgabe, den Altbestand unangetastet zu lassen, wurden keine Angaben verändert und kein Speichern ausgelöst. Für eine Ergänzung ist eine ausdrücklich begrenzte Freigabe für die gemeinsamen Vertragskontaktdaten erforderlich. Die separat freigegebene GTM-Vertragsannahme für den Relaunch bleibt dokumentiert.

#### Ogulo und Propstack: Suche nach vorhandenen Nachweisen

Die Suche im zugänglichen Propstack-Postfach nach Auftragsverarbeitung ergab zwölf Treffer. Relevant: **Ihr Ogulo Support, 16.06.2025, Information zu unserer neuen Datenschutzbeauftragten**. Die Nachricht ordnet den Wechsel des Ogulo-Datenschutzkontakts zum 01.06.2025 einer fortbestehenden AVV mit dem Empfänger zu und bezeichnet die Mitteilung als Teil der Zusammenarbeit nach Art. 28 DSGVO. Das ist ein konkreter Anbieterhinweis auf eine bestehende Vertragsbeziehung, aber noch keine vollständige Kopie ihrer Fassung und Anlagen.

Daher kein vorsorglicher Neuabschluss über Adobe Sign. Die bisher offene Signaturseite wurde ohne Dateneingabe oder Zustimmung geschlossen. Im Mailbestand ist nun ein Ansatzpunkt für Vertragsarchiv/Bestellhistorie beziehungsweise eine spätere gezielte Bitte um Vertragskopie vorhanden; keine solche Nachricht wurde versendet. Die separate Suche Propstack AVV ergab **0 Treffer** im zugänglichen Mailbestand. Das beweist keinen fehlenden Vertrag; die Propstack-Vertragsfassung bleibt offen.

#### Verbleibende Zugänge

Für Justhome ist eine Partner-Anmeldung nur für nicht öffentlich belegte Kontofunktionen/Vertragsdetails relevant; sie ist keine pauschale Voraussetzung für den öffentlichen Anbieterabschnitt. Für OpenAI/SIA wurde zunächst eine andere Anmeldung angefragt. Der Nutzer korrigiert anschließend, dass offenbar doch das Personal-Konto genutzt wird. Dieses vorhandene Konto wurde daraufhin geprüft; siehe Nachtrag unten. Ein anderer OpenAI-Login ist derzeit nicht erforderlich. Keine Passwörter oder API-Schlüssel angefordert. Vercel/Upstash und PriceHubble behalten den oben dokumentierten Nachweisstand; keine zusätzlich belegte Vertragsfassung behaupten.


#### Nutzerkorrektur und OpenAI-Kontoprüfung im selben Vorgang

Der Nutzer teilt mit, dass scheinbar doch das Personal-Konto verwendet wird. Das ist die aktuelle Arbeitshypothese; die frühere Angabe zum Workspace SLS Immobilienpartner gilt damit nicht mehr als bestätigte API-Zuordnung.

Read-only im vorhandenen API-Konto festgestellt:

- Organisation heißt Personal; vorhandenes Default project mit **Global / None (Standard retention)**. Der Name Personal allein bezeichnet hier keine nachgewiesene Nutzung von ChatGPT-Verbraucherbedingungen und beweist auch keinen ungeeigneten API-Tarif.
- Data controls → Sharing: Modellfeedback-Freigabe, Freigabe von Evaluations-/Fine-Tuning-Daten und Freigabe von API-Ein-/Ausgaben jeweils **Disabled**.
- Data controls → Data retention: API call logging **Enabled per call**. Die Oberfläche weist für Responses ausdrücklich auf store=false zur Abschaltung dieser Protokollierung hin. Die vorhandenen SIA-Integrationen setzen store:false. Das ist keine Zero-Data-Retention-Zusage; Missbrauchs-/Sicherheitsprotokolle und dienstbezogene Ausnahmen gesondert berücksichtigen. Primärquelle: https://developers.openai.com/api/docs/guides/your-data .
- Billing → Preferences: Company name lautet **Filippo**. Geschäftsadresse und Business tax ID stimmen mit dem veröffentlichten SLS-Impressum überein. Das ist ein konkretes Indiz für die geschäftliche Zuordnung; eine vollständig und eindeutig auf SLS Immobilienpartner GmbH lautende Kundenzuordnung ist durch den angezeigten Firmennamen allein noch nicht belegt.
- Keine Zahlungsdaten oder Schlüssel geöffnet, keine Rechnungs-/Datenschutzeinstellung gespeichert, kein zusätzlicher API-Aufruf erzeugt. Der hinterlegte API-Schlüssel wurde nicht ausgelesen oder abgeglichen. Deshalb ist die technische Zuordnung des tatsächlich eingesetzten Deployment-Schlüssels zum sichtbaren Projekt noch nicht unabhängig bestätigt.

Folge: Kein Kontoumzug allein wegen des Organisationsnamens. Vor Endfreigabe die vollständige SLS-Vertrags-/Kundenzuordnung und die geltende OpenAI-DPA festhalten. Die bisherigen Aussagen im öffentlichen Entwurf zu verbleibenden Anbieterprotokollen und fehlender ausschließlicher EU-Verarbeitung bleiben zutreffende Grenzen; keine ausschließliche EU-Verarbeitung oder Nullspeicherung aus Global/Standard retention ableiten.


### Präzisierung Justhome nach Nutzerhinweis – 18.10.2026

https://justhome.com/datenschutz wurde erneut gelesen (angegebener Stand 07.06.2024). Anbieteridentität, Datenarten, Vermittlung und allgemeine Speicherhinweise sind öffentlich beschrieben. Die Informationen werden für den SLS-Anbieterabschnitt verwendet; keine vollständige Übernahme aller Dienste oder Fristen. https://justhome.com/partner beschreibt mögliche Finanzierungsstatus-Rückmeldungen über ein Partner-Dashboard. Ob SLS diese konkret nutzt, ist damit nicht belegt. Für diese begrenzte offene Frage können Partnerschaftsunterlagen nötig sein; ein Login ist kein pauschaler Freigabeblocker. Eine AVV wird nicht automatisch aus der Einbettung verlangt; die Rolle ist nach dem tatsächlichen Verarbeitungsvorgang zuzuordnen. Die frühere allgemeine Login-Forderung ist insoweit korrigiert.


### Bestätigter Justhome-Rückfluss nach Propstack – 18.10.2026

Der Nutzer bestätigt anschließend ausdrücklich: Rückmeldungen von Justhome kommen in Propstack an; dazu besteht nach seiner Kenntnis keine Vereinbarung. Die zuvor offene Tatsachenfrage zum Rückfluss ist damit beantwortet. Der frühere Hinweis, dass die konkrete Nutzung nicht belegt sei, ist insoweit überholt. Kein erneuter Funktions-/Anfragetest und kein Partner-Login hierfür erforderlich.

Der öffentliche Relaunch-Entwurf beschreibt jetzt den Rückfluss in Propstack. Er behauptet weder eine vorhandene SLS-AVV noch eine bereits abschließend bestimmte Rechtsgrundlage für diesen Austausch. Kein Rückschluss, dass sämtliche Finanzierungsunterlagen oder Beträge an SLS gelangen. Der genaue Umfang und die Rollen sind vor der rechtlichen Endfreigabe zu klären; fehlende separat bekannte Vereinbarung beweist allein weder eine bestimmte Rollenverteilung noch, dass überhaupt keine wirksam einbezogenen Bedingungen bestehen.

Zusätzliche einschlägige Primärquelle: https://justhome.com/partner-propstack beschreibt die Propstack-Partnerschaft und mögliche Statusinformationen. Die öffentliche Datenschutzerklärung beschreibt Justhomes allgemeine Verarbeitung; sie ersetzt keine konkrete Zuordnung des Datenrückflusses. Die öffentliche Information reicht als Quelle für den Anbieterabschnitt, macht die begrenzte Rollenprüfung aber nicht entbehrlich. Der veraltete Datenschutzlink in der Objektansicht wurde auf https://justhome.com/datenschutz vereinheitlicht. Keine Anfrage versendet und kein Vertragsabschluss ausgelöst.


### Präzisierter Übermittlungsweg Justhome – 18.10.2026

Der Nutzer präzisiert: Sämtliche Justhome-Rückmeldungen laufen über die direkte Justhome-Propstack-Anbindung. Bei Nutzung der jeweiligen Rechner erhält SLS eine Rückmeldung per E-Mail oder direkt im betreffenden Kontakt in Propstack. Der Übermittlungsweg ist damit als Nutzerbestätigung geklärt und im öffentlichen Entwurf ergänzt. Für diese Tatsachenfrage weder erneuten Login noch Testanfragen verlangen. Die Bestätigung beschreibt die Kanäle; sie belegt nicht automatisch einzelne Datenfelder, eine Übertragung bei jedem Tastendruck oder die rechtliche Rollenverteilung. Die bereits dokumentierte begrenzte rechtliche Restprüfung bleibt davon getrennt.


### Maßgeblicher aktueller Stand nach Nutzerauftrag – 18.10.2026

Die vorherigen Einträge sind eine chronologische Prüfungshistorie. Für den weiteren Ablauf gilt: Der Nutzer benennt die nachfolgenden öffentlichen Anbieterhinweise als die verfügbaren Unterlagen und kennt keine zusätzlichen Vereinbarungen. Diese Quellen werden in den Entwurf übernommen. Keine weitere pauschale Vertrags-/Login-Anforderung an den Nutzer und kein Anbieteranschreiben ausgelöst. Die tatsächliche Vertragslage wird dadurch nicht als rechtlich abschließend geklärt ausgegeben; soweit Auftragsverarbeitung vorliegt, ersetzt eine allgemeine Datenschutzerklärung nicht automatisch die Bindung nach Art. 28 Abs. 3 DSGVO. Das ist ein Punkt der Endprüfung, keine Behauptung, SLS habe bereits entsprechende Verträge geschlossen.

| Vom Nutzer vorgegebene Quelle | Ergebnis und Verwendung |
| --- | --- |
| https://ogulo.com/datenschutz/ | Aktuelle Hauptquelle für Ogulo-Adresse in Köln und Anbieter-Datenschutzkontakt. Hinweise zu Ogulos eigener Website nicht als aktivierte SLS-Trackingkonfiguration übernehmen. |
| https://ogulo.de/privacy/policy.html | Enthält abweichende ältere Adressen und einen anderen Datenschutzbeauftragten; zusätzlich verlinkt, widersprechende Angaben nicht in den SLS-Text kopiert. Keine Aussage über aktuelles Tracking allein aus diesem allgemeinen Text. |
| https://www.propstack.de/datenschutz/ | Allgemeine Website-/Kontohinweise plus App-Abschnitte; der Anbieter beschreibt für die mobile App Auftragsverarbeitung. Daraus nicht automatisch sämtliche mobilen Dienste auf den SLS-Websitebesuch übertragen. Link neben den schon vorhandenen Softwarehinweisen ergänzt. |
| https://www.pricehubble.com/de/privacy/privacy-policy | Erklärt im angegebenen Geltungsbereich insbesondere Anbieterwebsite und soziale Präsenzen; nennt PriceHubble AG. Als allgemeine Quelle verlinkt. Nicht jede Marketing-/Recruitingtechnik oder Aufbewahrungsfrist auf den Bewertungsrechner übertragen. |

Justhome: bestätigte Einbettung und Datenrückfluss via Propstack per E-Mail/Kontakt sind umgesetzt. Nutzer hat keine weitergehenden Rechtsnachweise oder Kenntnis der internen Anbieterprüfung; daraus keine pauschale Rechtskonformitätsgarantie ableiten. Öffentliche Hinweise und der bestätigte Ablauf sind die verfügbare Tatsachengrundlage. Kein neuer Anfragetest und kein Justhome-Login nötig.

#### Ausdrücklich autorisierte Kontodatenänderungen

- OpenAI, vorhandene Personal-Organisation → Billing → Preferences: Company name von Filippo auf **SLS Immobilienpartner GmbH** gespeichert. Oberfläche bestätigt Aktualisierung; Wert auch nach Neuladen vorhanden. Anschrift/USt-ID stimmen mit SLS überein und wurden nicht verändert. Änderungen gelten laut Oberfläche für künftige Rechnungen; kein rückwirkend neu ausgestellter Vertrag behauptet. Organisationsname und Schlüssel unverändert.
- Google, bestehende Analytics-DPA-Zusatzansicht: **Filippo Livera / service@sls.de / SLS Immobilienpartner GmbH, Ubierweg 2, 46286 Dorsten, Deutschland / Primärer Kontakt** hinzugefügt. Gespeicherte Tabellenzeile bestätigt. Nutzer hat diese Ergänzung ausdrücklich angeordnet. Es wird damit kein Kontozugriff eingeräumt und Filippo nicht als bestellter Datenschutzbeauftragter bezeichnet. Eine separate DSB-Rolle wurde mangels bekanntem Personennamen nicht erfunden. Keine Ads-/Altwebsite-/Trackingeinstellungen verändert und keine neuen Vertragsbedingungen angenommen.
- Screenshotnachweise lokal unter output/sls-google-tracking-2026-10-18/openai-sls-firmendaten.png und google-sls-datenschutzkontakt.png; nicht in Git aufgenommen.

#### Bewerbungen

Öffentlicher Entwurf und internes Konzept sind überarbeitet: notwendige Aufbewahrung für konkretes Verfahren/Rechtsansprüche; regelmäßige betriebliche Höchstfrist sechs Monate ab Zugang einer Absage/Rücknahme, mit begründeten Ausnahmen statt Behauptung einer pauschalen gesetzlichen Sechsmonatsfrist. Für künftige Stellen ist nach Verfahrensabschluss eine separate, freiwillige, dokumentierte Einwilligung mit zwölfmonatiger Frist vorgesehen. Zwölf Monate sind eine gewählte betriebliche Begrenzung. Kein Pool durch bloße Bewerbung, kein unbegrenztes Behalten und kein bereits automatisierter Löschlauf. Fertiger Ablauf und Textvorlage im vorhandenen Löschkonzept; tatsächliche Einwilligungen/Löschungen werden nicht im Website-Repo verwaltet.

Primärquellen: Art. 5, 6, 7, 17 und 28 DSGVO, § 26 BDSG; https://www.lfd.niedersachsen.de/faq/faq-aufbewahrungs-und-loschfristen-von-bewerbungsunterlagen-204360.html (Stand Juli 2026); BfDI-Kontrollbericht https://www.bfdi.bund.de/SharedDocs/Downloads/DE/DokumenteBfDI/Kontrollberichte/Allgemeine-Verwaltung/Kontrolle-BPolD-St.Augustin.pdf?__blob=publicationFile&v=2 . Behördenempfehlung und betriebliche Frist nicht als universell gesetzlich vorgeschrieben ausgeben. Die rechtliche Endfreigabe und der tatsächliche betriebliche Vollzug bleiben erforderlich.

# Einwilligungsverwaltung – 11. Oktober 2026

Ziel: Besucher entscheiden vor Anbieterzugriff; gespeicherte Freigaben erlauben anschließend automatisches Laden. Ablehnung oder Schließen erteilt keine Freigabe. Die endgültige Domain und der Hosterwechsel sind nicht Teil dieser Änderung.

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
- Provider getrennt: Vercel, Upstash, Propstack, Microsoft/IONOS, OpenAI, Google Analytics/GTM, PriceHubble, Justhome, Google Maps, OpenStreetMap, YouTube, Instagram, ImmoScout24/Immowelt, virtuelle Touren sowie externe Objektbilder.
- SIA nicht als anonym bezeichnet: Gespräch/Frage, mögliche Websuche und `store:false` samt verbleibender Anbieterprotokolle erläutert. Keine Nullspeicherung und keine ausschließliche EU-Verarbeitung behauptet. API-Standardbedingungen sind keine geprüfte SLS-Kontokonfiguration.
- Google-Fristen präzisiert: Zwei Monate Ereignisdaten bedeuten nicht die Löschung aller aggregierten Berichte. Kein Meta-Pixel bedeutet nicht, dass optional aktivierte Instagram-Frames keine Meta-Verbindungen herstellen.
- Bewerbungsseite erhält denselben Datenschutzkontakt und Prüfvorbehalt. Ungeprüfte Aussage über bereits vereinbarte Drittlandgarantien wird korrigiert.
- Datenschutz, Impressum und Bewerbungsdatenschutz bleiben bei Erstbesuch ohne automatisch geöffnetes Modal lesbar. Manuelle Einstellungen und sämtliche optionalen Sperren bleiben erhalten. Einwilligungszwecke, Kategorien und Google-Konfiguration wurden dabei nicht erweitert.

### Konkrete rechtliche Restprüfung vor Veröffentlichung

| Gegenstand | Belegt | Noch erforderlich |
| --- | --- | --- |
| Datenschutzkontakt | Bestellter Beauftragter und Weiterleitung service@sls.de bestätigt | Vertrauliche direkte Kommunikation organisatorisch sicherstellen; kein öffentlich erforderlicher Personenname erfinden |
| Propstack | Öffentliche AVV und Software-Datenschutzhinweise, CRM-Datenwege | Für SLS geltende Fassung/Beitritt, Unterauftragnehmer und vertragliche Lösch-/Backupbedingungen belegen |
| Vercel/Upstash | Dienste und technische Fristen aus Code; öffentliche DPA | Tarif-/Kontogeltung, Serverregion, internationale Supportzugriffe, konkrete Log-/Backupfristen, Art.-28-Nachweise |
| Microsoft/IONOS | Versand-/Postfachwege aus vorhandener Dokumentation | Geltende Vertragsfassungen, tatsächliche Mailaufbewahrung und Sicherungsläufe; keine Kundennachrichten exportieren |
| OpenAI | API-Aufrufe, Websuche und store:false belegt | Vertragspartner, DPA, Anbieterfristen/Ausnahmen und tatsächliche Konto-Datenschutzoptionen nachweisen; DSGVO-Rechtsgrundlage und Risikobewertung der freiwilligen Auskunft freigeben |
| Google | Neue GA4/GTM-Ressourcen und Datenminimierung geprüft | Geltende Analytics/GTM-Verträge, konkrete Transferkette/aktuelle DPF-Zertifizierung oder SCC samt Ergänzungen dokumentieren |
| PriceHubble/Justhome | Einbettungen und offizielle Anbieterhinweise | Konkreten SLS-Vertragspartner, Auftragsverarbeitung/eigene Verantwortung, Datenempfänger und Fristen des eingebetteten Produkts rechtlich zuordnen. Keine erneuten echten Anfragen nötig. |
| Touranbieter | Touradresse tour.sls.de und Exposé-Einbindung | Tatsächlichen Betreiber und Subdienstleister identifizieren, Datenschutzlink und Fristen einsetzen. Eine eigene Subdomain benennt noch keinen Hostinganbieter. |
| Externe Medien/Karten/Badges | Anbieter und Einwilligungssteuerung | Konkrete Speichertechniken/Fristen und Drittlandgarantien der tatsächlich geladenen Produkte final prüfen; Anbieter-Erklärung für dessen ganze Website nicht ungeprüft übernehmen |
| Löschung/Bewerbungen | Vorhandenes freigegebenes Prüfkonzept; Bewerbungsseite nennt sechs Monate | Betrieblichen Vollzug/Kopien/Backups und Bewerbungsfrist fachlich bestätigen; keine neue automatisierte Löschung eingerichtet |

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
- Microsoft: https://www.microsoft.com/de-de/privacy/privacystatement
- IONOS: https://www.ionos.de/terms-gtc/datenschutzerklaerung/
- PriceHubble: https://www.pricehubble.com/de/privacy/privacy-policy
- Justhome: https://justhome.com/datenschutz
- Google: https://policies.google.com/privacy?hl=de
- OpenStreetMap: https://osmfoundation.org/wiki/Privacy_Policy
- ImmoScout24: https://www.immobilienscout24.de/agb/datenschutz.html
- Immowelt: https://www.immowelt.de/immoweltag/datenschutz
- Zuständige Aufsicht: https://www.ldi.nrw.de/kontakt

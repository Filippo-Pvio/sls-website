# SLS Relaunch: Google-Tracking – Stand 17.10.2026

Status: im Entwicklungsbranch und in der Vercel-Vorschau umgesetzt; **keine Freigabe für Merge oder Produktivbetrieb**. Die vollständige Aufgabe ist wegen der unten beschriebenen externen Rechner und noch ausstehender rechtlicher Prüfung nicht abgeschlossen.

## Neue Ressourcen und Abgrenzung

| Ressource | Einrichtung |
|---|---|
| Google-Anmeldung | f.livera@sls.de |
| GTM-Konto | SLS Immobilienpartner GmbH, Deutschland, 6383125220 |
| Web-Container | SLS Website Relaunch, GTM-PSH7R4R8, Container 267423433 |
| GTM-Version | 2, „SLS Relaunch – Preview only – Google Basic Consent v2“ |
| Analytics-Konto | Vorhandenes Konto 324255696 (Anzeigename „Google Ads-Konto“) |
| Separate GA4-Property | SLS Immobilienpartner – Website Relaunch, 559391964 |
| Webstream | SLS Relaunch – Preview, 16149454463 |
| Mess-ID | G-CPX5L89D4H |
| Preview-Host | sls-website-git-feat-consent-tracking-phas-a6ca65-info-91172609.vercel.app |
| PR | https://github.com/Filippo-Pvio/sls-website/pull/244 |
| Branch | feat/consent-tracking-phase1-20261016 |

Die alte Property 453121213 / G-CT9QN2WGXG wurde lediglich beim Öffnen von Analytics angezeigt und nicht verändert. Die alte Website, ihre Tags, Google Ads und Meta wurden nicht bearbeitet. Es wurde keine Ads-Verknüpfung angelegt; die neue Property zeigt null abgeschlossene Ads-Verknüpfungen.

Der neue GTM-Container ist bereitgestellt, seine beiden Trigger sind jedoch auf den exakten Preview-Host beschränkt. Zusätzlich startet der Website-Code den Container ausschließlich auf diesem Host. Weder sls.de noch www.sls.de, localhost, andere Vercel-Previews oder die unveränderliche Deployment-URL können damit die neuen Tags starten. Diese Sperre muss bei einer später freigegebenen Veröffentlichung ausdrücklich angepasst und erneut geprüft werden.

## Consent und Datensparsamkeit

Basic Consent Mode v2: analytics_storage, ad_storage, ad_user_data und ad_personalization starten lokal mit denied, bevor ein Google-Skript existiert. Ausschließlich Statistik-Einwilligung gibt analytics_storage frei. Die drei Werbesignale bleiben denied. Ohne Statistik-Einwilligung wird GTM nicht geladen; es gibt keine Google-Statistik-Pings und keine Warteschlange für vor Einwilligung entstandene Anfragen.

Die Statistik-Kategorie enthält die Anbieter und Zwecke. Die Marketing-Tracking-Kategorie und der Meta-Pixel-Loader aus dem ursprünglichen PR sind entfernt. Newsletter-Einwilligungen, Social-Media-Links und bereits vorhandene externe Medien sind davon unabhängig.

Bei Widerruf sperrt die Brücke weitere Abschlussereignisse, aktualisiert den Consent-Zustand und entfernt erreichbare Analytics-Cookies des Preview-Hosts. Der Consent-Manager lädt die Seite neu, wodurch SDKs beendet werden. Ein Zustandswechsel kann noch die Widerrufsinformation an ein bereits geladenes Google-Tag übermitteln; nach dem Neuladen lädt kein Messtag mehr.

Nur erlaubte Ereignisnamen werden weitergereicht. Keine Formularfelder, Texte, Kontakt-/Objektkennungen oder Suchkriterien werden in den Ereignis-Payload übernommen. page_location enthält Origin und Pfad; Query und Fragment werden entfernt. page_referrer ist leer, page_title fest vorgegeben. Automatische Zusatzmessungen des GA4-Webstreams sind deaktiviert. Google verarbeitet für die Verbindung dennoch technische Informationen und eine pseudonyme Browserkennung: Die Messung ist nicht anonym.

GTM-Konfiguration: [gtm-relaunch-preview.json](gtm-relaunch-preview.json). Ausschließlich native Google-Tags, keine Custom-HTML-Tags und keine Custom-JavaScript-Variablen. Statistik-Cookies sind auf 180 Tage ohne Aktualisierung pro Besuch konfiguriert. GA4-Nutzer- und Ereignisdaten: jeweils zwei Monate; Zurücksetzen bei neuer Aktivität aus. Google Signals und Erhebung bereitgestellter Nutzerdaten bleiben aus; detaillierte Standort-/Gerätedaten sind abgeschaltet. Werbepersonalisierung wurde für alle Regionen der neuen Property deaktiviert. Debug-Modus ist für die Preview-Prüfung eingeschaltet und muss vor einem späteren Produktivbetrieb entfernt werden.

## Abschlussereignisse

Alle sechs Ereignisse sind in der neuen Property als Schlüsselereignisse angelegt, mit Zählung pro Ereignis und ohne pauschalen Geldwert. Google hat daneben automatisch Standard-Schlüsselereignisse angelegt; dafür gibt es hier keine zusätzlichen Sender.

| Ereignis | Voraussetzung |
|---|---|
| contact_request_success | Kontakt-/Rückrufformular: HTTP-Erfolg und result.ok |
| buyerfinder_request_success | Käuferfinder-Anfrage: HTTP-Erfolg und result.ok; das reine Nachfrageergebnis zählt nicht |
| guide_request_success | Ratgeberanforderung bestätigt; review_required zählt nicht; kein Nachweis tatsächlicher Zustellung |
| search_profile_success | Suchauftrag bestätigt; data.ok und kein bereits vorhandenes Duplikat |
| property_inquiry_success | Exposé-Anfrage bestätigt; result.ok und portalInquiryTriggered; Testmodus ausgeschlossen |
| sales_report_success | Versand der Verkaufsanalyse nach bestätigter E-Mail erfolgreich angenommen; bloßer Codeversand zählt nicht |

Diese Ereignisse bilden bestätigte Website-/Backend-Vorgänge ab. Sie belegen weder eine erfolgreiche E-Mail-Zustellung noch die spätere Qualität eines Leads. Die Übermittlung an GA4 setzt im Moment des Abschlusses eine gültige Statistik-Zustimmung voraus.

## Prüfungen und Ergebnisse

- Öffentliche Website erfolgreich gebaut. Statische und serverseitig erzeugte HTML-Seiten nutzen dieselbe frühe Consent-/Tracking-Einbindung.
- 62 gezielte automatisierte Tests bestanden: Consent-Brücke, Payload-Minimierung, Host-Sperre, Widerruf, Wiederholungen, Formular-Erfolg/Fehler, Backend-Sicherheit und HTML-Consent. Separater Syntaxcheck aller ausgelieferten Browserskripte ebenfalls bestanden.
- In der realen Vercel-Preview wurde vor Zustimmung kein Google-Messtag im DOM geladen.
- Nur Statistik ausgewählt: GTM-PSH7R4R8 und gtag.js für G-CPX5L89D4H laden. Netzwerk: Google-Skripte HTTP 200, region1.google-analytics.com/g/collect HTTP 204. Keine Meta-/DoubleClick-Anfrage in der gefilterten Prüfung.
- Payload des Seitenaufrufs: tid=G-CPX5L89D4H, gcs=G101, npa=1, leeres dr, fester dt. Beim Aufruf von /kontakt/?tracking_probe=sls-qa#tracking-test enthielt dl nur den Pfad /kontakt/, keinen Testparameter und kein Fragment.
- GA4-DebugView der neuen Property bestätigt page_view, session_start, first_visit und user_engagement. Damit ist der reale Weg Preview → GTM → neue GA4-Property belegt.
- Widerruf über „Nur notwendige“: Neuladen ohne Google-Skripte. Netzwerkfilter für google-analytics, googletagmanager, facebook und doubleclick: 0 von 63 Requests. Folgeseite bei gespeicherter Ablehnung: 0 von 40 Requests. Anschließende erneute Statistik-Zustimmung startet wieder ausschließlich die neuen Google-Tags.
- Formularabschlüsse wurden in automatisierten Tests mit simulierten Backendantworten geprüft. Es wurden keine zusätzlichen realen CRM-Anfragen, E-Mails oder Bewertungsaufträge ausgelöst. Ein realer GA4-Eingang aller sechs Abschlüsse nach echten Backend-Transaktionen ist deshalb **noch nicht nachgewiesen**.
- Vercel-Deployment dpl_FU1szbHKYDPDpgEKrx4Uw2swBhBZ, Quellcommit 1c2b3abebeaed69c2c6464c1186e5c181d51e13c, Status READY, target null (Preview). Beide Vercel-GitHub-Checks erfolgreich. Der Branch-Alias ist die freigegebene Tracking-Testadresse.
- Vorhandene Vercel-Feedback-Einbindung wird durch die bestehende CSP blockiert. Dies ist unabhängig von der Google-Messung; dafür wurden keine Sicherheitsfreigaben ergänzt.

## Offene externe Rechner

**PriceHubble:** Die offizielle Dokumentation beschreibt eine native Analytics-Anbindung über gaTrackingId und consentGranted. Im aktuell öffentlich ausgelieferten V1-Code wird der bestätigte Abschluss intern als GA-Ereignis „sent“ mit event_category VALUATION_REQUEST erzeugt. Die dokumentierte Analytics-Freigabe aktiviert außerdem eine vom Anbieter fest eingebaute weitere Analytics-Konfiguration. Die geprüfte übergeordnete Widget-Schnittstelle liefert an die SLS-Seite nur Start-/Scroll-Nachrichten, keinen bestätigten Abschluss. Deshalb bleiben consentGranted:false und die fehlende gaTrackingId in beiden SLS-Einbindungen erhalten. Ein iframe-Aufruf, Höhenänderung, Feldklick oder Start zählt nicht als erfolgreicher Bewertungsabschluss.

Benötigt wird eine vom Anbieter unterstützte Nachricht oder ein Callback ausschließlich nach bestätigter Übermittlung. Er muss sich auf das konkrete iframe sowie eine exakte Anbieter-Origin prüfen lassen und ohne Kontakt-/Objektdaten auskommen. Alternativ ist eine vom Anbieter bestätigte isolierte Abschlussmessung ohne zusätzlich aktivierte Tracker zu prüfen. Eine Änderung des vorhandenen gemeinsamen Anbieter-Kontos oder der alten Website ist nicht Teil dieser Arbeit.

**Justhome:** In den vorhandenen Budget-/Finanzierungs-Einbindungen ist nur die origin- und source-geprüfte resize-Nachricht belegt. Ein bestätigtes Abschlussereignis ist nicht dokumentiert beziehungsweise nachgewiesen. Ohne einen solchen Vertrag wird keine Rechner-Conversion erzeugt. Die gleichen Anforderungen an Origin, iframe-Quelle, bestätigten Abschluss und Datensparsamkeit gelten hier.

Es wurden keine Provider-Konten verändert und keine Nachrichten an Anbieter verschickt.

## Vor einer späteren Freigabe

1. SLS prüft den konkreten Statistik-Text und den neuen Abschnitt in /datenschutz/ rechtlich, einschließlich Auftragsverarbeitung, Datenübermittlungsgrundlagen und Cookie-/Aufbewahrungsangaben. Die Vorschau ist ein prüfbarer Entwurf, keine bestätigte Rechtsfreigabe.
2. Unterstützte Abschluss-Schnittstellen für PriceHubble und Justhome klären und anschließend gezielt integrieren/testen.
3. Kontrollierte reale Testvorgänge oder eine geeignete isolierte Testumgebung für die sechs Formulare verwenden; DebugView muss die erwarteten einmaligen Abschlüsse und das Ausbleiben bei Fehler/Prüffall zeigen. Keine echten Kundendaten für Tests nutzen.
4. Erst nach ausdrücklicher Veröffentlichungsentscheidung: Domain-Freigaben in Code und GTM anpassen, Debug-Modus entfernen, alte/neue Tags am geplanten Domainwechsel auf Doppelungen prüfen und erneut testen. Bis dahin bleiben PR und Deployment ausschließlich im Entwicklungs-/Preview-Betrieb.

## Primärquellen

- [Google: Basic und Advanced Consent Mode](https://developers.google.com/tag-platform/security/concepts/consent-mode)
- [Google: Consent Mode implementieren](https://developers.google.com/tag-platform/security/guides/consent)
- [Google: CSP für Tag Manager und Analytics ohne Ads](https://developers.google.com/tag-platform/security/guides/csp)
- [PriceHubble: Widget-Einbindung und Einwilligung](https://support.pricehubble.com/hc/en-gb/articles/38271599570833-Embedding-the-Lead-Generator-Widget-on-your-website)
- [PriceHubble: Analytics-Ereignisse und bestätigter Abschluss](https://support.pricehubble.com/hc/en-gb/articles/38302505014673-Analytics-Tracking-for-the-Lead-Generator-Widget)
- [PriceHubble: V1-Konfiguration](https://docs.pricehubble.com/integrations/lead_generator/lead_generator/)

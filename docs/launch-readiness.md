# SLS: Vorbereitung und gemeinsamer Onlinegang

Stand: 11. Oktober 2026. Ausschließlich neue Website. Alte Homepage und deren Übergabe bearbeitet ein anderer Verantwortlicher. Standortseiten bleiben unverändert. Heute keine Domainzuordnung, DNS-Änderung oder öffentliche Freischaltung.

## Bereits erledigt und belegt

- SEO-Grundlage aus PR #217: Metadaten, Canonicals, Entity-Graph, dynamische Immobilien-/Referenzseiten und Sitemaps. Die Vercel-Arbeitsadresse bleibt noindex; die öffentliche Indexierung hängt am tatsächlichen Host.
- Bisherige Projektgespräche zu Einwilligungen, Mobilansichten, Betrieb, Versand und Sicherheit erneut abgeglichen. Bereits getestete Kundenformulare und Versandfunktionen nicht pauschal neu ausgelöst.
- Einwilligungsverwaltung, gesperrte externe Einbettungen, getrennte API-Zugänge, zentraler Formularschutz und beschränkter Microsoft-Versand sind vorhanden. Betriebsüberwachung einschließlich externer DOWN-/UP-Warnung wurde im Datenschutz-Chat dokumentiert.
- Kontakt zum ausdrücklich bestellten Datenschutzbeauftragten: service@sls.de. Der Betreiber bestätigte die Weiterleitung am 11. Oktober. Öffentliche Datenschutzerklärung nennt diesen Kontakt und die offiziellen Propstack-Datenschutzhinweise.
- CRM-Nachweise für Kontakt- und Ratgeberanfragen verweisen auf die tatsächlich verwendete, bekannte Website-Adresse. Beliebige Origin-/Forwarded-Header können diese URL nicht bestimmen.
- Ratgeber auf sls.de und www.sls.de erst mit Produktionsvariable `SLS_PUBLIC_DOMAIN_ACTIVE=true`. Heute nicht eingerichtet. Arbeitsadresse bleibt nutzbar. Dieser Schalter steuert die Ratgeberannahme, nicht DNS oder die Indexierung sämtlicher Seiten.
- Lokale automatisierte Prüfung: 407 Tests bestanden; zusätzlich statische Website- und Magazinprüfung bestanden. Auslieferungsprüfung nach Bereitstellung separat durchführen.

## Newsletter-Abnahme

Versand über Propstack mit service@sls.de (Automatik 561383, Vorlage 1119664). Späterer Absender newsletter@sls.de erst nach Einrichtung und Verbindung. Test nur mit eigenem, ausdrücklich freigegebenem Service-Postfach; keine echten Kundenkontakte. Ablauf: neue Testadresse, Ratgeber mit optionaler Newsletter-Auswahl, Bestätigungsmail, Status vor und nach Bestätigung, anschließende Abmeldung. Bestätigung und Widerruf erst nach tatsächlicher Prüfung als erledigt markieren. Keine personalisierten Bestätigungslinks oder Kontakt-IDs in Git speichern.

## Datenschutz: Quellen und tatsächlicher Nachweis

Die offiziellen [Propstack-Software-Datenschutzhinweise](https://www.propstack.de/datenschutzerklaerung-propstack-software/) und der [Auftragsverarbeitungsvertrag](https://www.propstack.de/auftragsverarbeitung/) sind die Anbieterquellen. Ihre öffentliche Verfügbarkeit belegt nicht, welche Vertragsfassung für das SLS-Konto vereinbart wurde. Keine neue Vertragsannahme durchgeführt.

Die im Datenschutz-Chat bestätigte Bestandsprüfung steht in [retention-and-deletion.md](retention-and-deletion.md). Keine pauschale automatische CRM- oder Postfachlöschung einrichten. Datenschutz-/Löschanfragen über service@sls.de aufnehmen, an den zuständigen Datenschutzbeauftragten beziehungsweise Verantwortlichen weiterleiten und zweckbezogen bearbeiten. Vertrags-/Kontonachweise, tatsächliche Providerfristen und interne Vorgangsnachweise gehören in eine zugriffsbeschränkte SLS-Ablage, nicht in Website oder Git. Noch nicht belegte Kontodetails bleiben offen; Anbietertexte ersetzen diese Nachweise nicht.

## Ablauf beim gemeinsamen Onlinegang

1. Aktuellen main-Commit, erfolgreiches Vercel-Deployment und Projekt `sls-website` kontrollieren. Seit der Abnahme hinzugekommene Änderungen berücksichtigen. Keine alte Deployment-ID ungeprüft verwenden.
2. Erst mit Freigabe zum tatsächlichen Onlinegang sls.de und www.sls.de dem richtigen Vercel-Projekt zuordnen. Hosting bleibt bei Vercel. DNS wird dort verwaltet, wo die Domain derzeit registriert beziehungsweise delegiert ist; das ist kein Wechsel des Website-Hostings.
3. Genau die dann von Vercel angezeigten Verifikations-/DNS-Werte verwenden. Mailrouting, MX, SPF, DKIM und DMARC erhalten; keine Nameserver-Umstellung allein für die Website. Domain-/TLS-Verifikation abwarten und www auf die kanonische Hauptadresse weiterleiten.
4. Für Produktion `SLS_PUBLIC_DOMAIN_ACTIVE=true` setzen und mit dieser Variable neu bereitstellen. Dieser Schritt wird heute nicht vorweggenommen. Ratgeber dürfen ausschließlich von den vorgesehenen Hosts mit passender Origin angenommen werden.
5. Öffentliche Auslieferung prüfen: Startseite, Immobilien/Referenzen, Kontakt, Ratgeber, Datenschutz, 404, robots und Sitemaps. Hauptseiten müssen auf sls.de indexierbar sein; Arbeits-/Preview-Adressen weiter noindex. Canonicals und Schema-IDs zeigen auf sls.de. Das reine GET-Prüfskript `scripts/check-launch-readiness.mjs https://sls.de` schreibt keine CRM-Daten und versendet keine Mails.
6. Einwilligungsdialog und relevante Formulare auf der tatsächlichen Domain prüfen. Newsletter nur mit eigenem Testkontakt; eigener SLS-Bestätigungs-/Abmeldeablauf gemäß newsletter-doi.md. Funktion und Versand wurden vorher bereits geprüft; Domainwechsel erfordert insbesondere Cookies, Origin-Prüfung und Datenschutzverweise zu kontrollieren.
7. Bestehende externe Überwachung auf sls.de umstellen und Warnempfänger prüfen. Security-Cron und Versandüberwachung kontrollieren. Bei Fehlern die neue Website-Freigabe zurücknehmen und die Domainzuordnung mit dem für den Übergang zuständigen Verantwortlichen abstimmen.
8. Nach erfolgreicher Erreichbarkeit Sitemap in der zuständigen Google Search Console einreichen und entsprechende Bing-Werkzeuge prüfen. Anmeldung im richtigen Eigentümerkonto erforderlich. Suchmaschinen übernehmen Änderungen zeitversetzt; keine sofortige Indexierung oder KI-Zitierung versprechen.

## Abnahmeprotokoll

Deployment-ID, Commit, Ergebnis der 15 GET-Prüfungen und Desktop-/Mobilprüfung im Abschlussbericht festhalten. Der Newsletter-Ablauf bekommt einen separaten tatsächlichen Status. Offene organisatorische Nachweise ausdrücklich benennen; technische Tests sind keine Bestätigung des Vertragsbestands.

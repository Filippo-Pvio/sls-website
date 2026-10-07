# Sicherheitsbetrieb – 7. Oktober 2026

## Technische Änderungen

Die statische Veröffentlichung enthält nur öffentliche Website-Dateien. Backend-Quelltexte, interne Dokumentation und Tests werden aus dem veröffentlichten Dateibaum ausgeschlossen.


Alle aktiven CRM-Schreibformulare und der persönliche PDF-Versand verwenden nun den vorhandenen zentralen Redis-Schutzspeicher. Fehlende Konfiguration oder nicht erreichbarer Speicher sperrt den Vorgang. Same-origin-POST, kurzlebige signierte Formularfreigabe, zentrale Grenzen pro Netzwerk und E-Mail sowie atomare Bearbeitungssperren gelten zusätzlich zu den fachlichen Prüfungen. Schutzdaten enthalten HMAC-Kennungen, keine eingegebenen Namen, E-Mails, Nachrichten oder Unterlagen. Redis-Daten werden spätestens nach 24 Stunden automatisch verworfen. Eine ungewisse Schreibantwort bleibt für identische Eingaben gesperrt; nicht blind erneut senden.

Der persönliche PDF-Versand erfordert zuerst einen sechsstelligen, zehn Minuten gültigen Code an der Empfängeradresse. Der Code ist an Empfänger und exakt angeforderte Auswertung gebunden und einmalig verwendbar. Der feste Absender ist service@sls.de. Erst nach Bestätigung wird die persönliche PDF gesendet. Microsoft Graph 202 bestätigt die Annahme, nicht Zustellung. Gesendete Kopien bleiben im M365-Postfach; dafür braucht SLS einen tatsächlichen Löschprozess.

SIA-POST im separaten Backend verlangt SIA_SERVICE_SECRET. Die Website übergibt dieses nur serverseitig. Öffentliches GET liefert weiterhin ausschließlich die Fähigkeit des Dienstes. Eine direkte Nutzung des Backends ohne Autorisierung wird vor KI-Aufrufen abgelehnt. Browsercookie und zentrale Tagesquoten bleiben erhalten.

CSP, nosniff, Frame-Schutz, Referrer- und Berechtigungsrichtlinien sind gesetzt. Die CSP erlaubt für bestehende Inline-Initialisierung noch unsafe-inline; eine spätere Umstellung auf Nonces/Hashes benötigt einen eigenen Test aller statischen Seiten. PriceHubble, Justhome und Karten werden erst nach expliziter Aktivierung geladen. Öffentlich freigegebene Immobilienbilder von externen Bildservern bleiben erlaubt.

## Nachweise und offene Kontoeinstellungen

Nur PROPSTACK_API_KEY war bei der ersten Metadatenprüfung als allgemeiner serverseitiger CRM-Zugang konfiguriert. Die tatsächlichen Rechte dieses Schlüssels sind damit noch nicht nachgewiesen. Die technischen Schutzmaßnahmen ersetzen keine Einschränkung im Konto. Bestehende Secrets wurden nicht ausgelesen oder veröffentlicht.

### Propstack – Administrator

Unter Verwaltung → API-Schlüssel separate V1-Zugänge für die folgenden Zwecke einrichten. Werte direkt in Vercel als Secret speichern, nicht per Chat übermitteln. Erst nach Probe der neuen Zugänge den bisherigen Schlüssel einschränken; andere Bestandsintegrationen vorher berücksichtigen.

- PROPSTACK_API_KEY: nur öffentliche Objekte, zugehörige freigegebene Objektinformationen, Status und benötigte Makler-/Marktdaten lesen. Keine Kontakt-, Notiz-, Suchprofil- oder Mail-Schreibrechte. Referenzfunktionen nach ihrer tatsächlichen Nutzung prüfen.
- PROPSTACK_CONTACT_API_KEY: Aktivitätstypen lesen; Kontakte lesen/anlegen und gezielt ergänzen; Aktivitäten lesen und Notizen anlegen. Keine Kontakte löschen, keine Mailversandrechte.
- PROPSTACK_GUIDES_API_KEY: entsprechende Kontakt-/Notizrechte für Ratgeber und DOI-Trigger. Keine allgemeinen Mailversandrechte. Propstack kann Rechte möglicherweise nur nach Ressourcen statt einzelnen Feldern begrenzen; Websitevalidierung ersetzt diese Kontoebene nicht.
- PROPSTACK_INQUIRY_API_KEY: benötigte Kontakt-/Notizrechte für Immobilienanfragen; lesende Dealprüfung, soweit notwendig. Keine Objektänderung oder Kontaktlöschung.
- PROPSTACK_SEARCH_PROFILE_API_KEY: Kontakte und Suchprofile lesen/anlegen. Für den Käufer-Nachfragecheck einen zusätzlichen rein lesenden Zugang PROPSTACK_DEMAND_API_KEY verwenden.
- Für Preview separate Zugänge zu einem Testbestand verwenden; aktuelle gemeinsame Produktions-/Preview-Schlüssel bis dahin ausdrücklich als verbleibendes Risiko dokumentieren.

Versandautomatisierung: ausschließlich SLS_RATGEBER_VERKAUF_ANGEFORDERT für Ratgeber und SLS_NEWSLETTER_DOI_ANGEFORDERT für Bestätigungsmail. Prüfnotizen dürfen nie versenden. Newsletter/accept_contact erst nach tatsächlichem Double-Opt-in entsprechend dem angezeigten Text aktivieren; zusätzliche Immobilienmailings nicht unbeabsichtigt einschalten. Wiederholte Trigger ebenfalls auf Propstack-Seite unterdrücken. Nachweis von Bestätigung und Abmeldung erhalten.

Referenz: https://docs.propstack.de/ und https://docs.propstack.de/reference/kontakte

### Microsoft 365 – Administrator

Die bestehende App identifizieren, die über MS_GRAPH_CLIENT_ID verwendet wird; ID im Vercel-Dashboard prüfen, kein Secret exportieren. Mail.Send auf service@sls.de einschränken, vorzugsweise Exchange Application RBAC mit passendem Postfach-Scope. Keine zusätzliche organisationsweite Mail.Send-Zuweisung behalten, die den Scope aushebelt. Mail.Read/Mail.ReadWrite sind für diesen Versand nicht erforderlich. Mit Test-ServicePrincipalAuthorization sowohl erlaubtes als auch fremdes Postfach prüfen. Bestehende andere Integrationen vor Entzug einer gemeinsamen Berechtigung erfassen.

MFA und eingeschränkter Zugriff auf das Service-Postfach, Malwarekontrolle und Löschverantwortliche prüfen. CAREER_* weiterhin nicht aktivieren, bevor Postfach, Rechte, Datenschutzfreigabe und synthetischer Zustelltest geklärt sind.

Referenz: https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac

### Datenschutz – Verantwortlicher/IT

Die lokale Seite /datenschutz/ erklärt die neuen Verarbeitungen und verlinkt die allgemeine SLS-Erklärung. Sie ersetzt nicht die Prüfung tatsächlicher Vertrags-, Speicher- und Löschbedingungen. AV-Verträge und Drittlandgarantien für Vercel, Redis/Upstash, Propstack, Microsoft und die KI-Verarbeitung prüfen. Person für Löschung in CRM, Service-Postfach, Downloads/Weiterleitungen und Backups benennen. Keine pauschale automatische CRM-Löschung aktivieren, bevor gesetzliche Aufbewahrung und Kundenbeziehungen getrennt sind. Die bisherige WordPress-Erklärung unter sls.de/datenschutz/ wurde nicht überschrieben.

Google-Maps-Browserschlüssel: Websites und erforderliche Maps-APIs im Google-Konto einschränken. Öffentlich sichtbarer Browserkey ist beabsichtigt; die Anbieterbeschränkung ist die Schutzmaßnahme.

## Betrieb und Störungsbearbeitung

Vercel-Runtime-Logs enthalten Ereignisse form_security_rejected, form_write_uncertain, sales_report_mail_failed und sales_report_failed ohne Formularinhalte. Bei mehreren 503: Redis-Verbindung prüfen. Bei form_write_uncertain: CRM/Postfach zuerst auf tatsächlich angelegten Vorgang prüfen; kein manuelles Mehrfachversenden. 429 bedeutet ausgeschöpfte Schutzgrenze. Ein einzelner erwarteter 400/403 in einem Negativtest ist kein Sicherheitsvorfall.

GET /api/security-health/ ist mit dem serverseitigen Service-Secret geschützt und prüft die Erreichbarkeit des Schutzspeichers. Das Secret nur als origin-gebundenen Authorization-Header in einem geeigneten privaten Monitor verwenden. Nie in einer URL, öffentlicher Statusseite oder Browsercode speichern. Kontinuierliche Alarmzustellung ist ohne eingerichteten Monitor/Empfänger noch nicht nachgewiesen; Runtime-Logs allein sind keine automatische Benachrichtigung.

Für eine Rückkehr die vorangegangene geprüfte Vercel-Deployment-ID verwenden. Ein Zurückrollen entfernt die neuen Schutzmaßnahmen: deshalb schreibende Formulare im Störungsfall vorzugsweise vorübergehend sperren und gezielt reparieren. SIA-Website und Backend müssen dieselbe Service-Authentifizierung unterstützen; bei Veröffentlichung erst die Website mit Header aktivieren, dann das abgesicherte Backend.

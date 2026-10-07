# Sicherheitsbetrieb – 7. Oktober 2026

## Technische Änderungen

Die statische Veröffentlichung enthält nur öffentliche Website-Dateien. Backend-Quelltexte, interne Dokumentation und Tests werden aus dem veröffentlichten Dateibaum ausgeschlossen.


Alle aktiven CRM-Schreibformulare und der persönliche PDF-Versand verwenden nun den vorhandenen zentralen Redis-Schutzspeicher. Fehlende Konfiguration oder nicht erreichbarer Speicher sperrt den Vorgang. Same-origin-POST, kurzlebige signierte Formularfreigabe, zentrale Grenzen pro Netzwerk und E-Mail sowie atomare Bearbeitungssperren gelten zusätzlich zu den fachlichen Prüfungen. Schutzdaten enthalten HMAC-Kennungen, keine eingegebenen Namen, E-Mails, Nachrichten oder Unterlagen. Redis-Daten werden spätestens nach 24 Stunden automatisch verworfen. Eine ungewisse Schreibantwort bleibt für identische Eingaben gesperrt; nicht blind erneut senden.

Der persönliche PDF-Versand erfordert zuerst einen sechsstelligen, zehn Minuten gültigen Code an der Empfängeradresse. Der Code ist an Empfänger und exakt angeforderte Auswertung gebunden und einmalig verwendbar. Das Versandpostfach wird ausschließlich serverseitig durch MS_GRAPH_SENDER festgelegt; ohne diese Konfiguration gilt service@sls.de. Der Formularempfänger kann dieses Postfach nicht ändern. Microsoft Graph benötigt eine gültige Postfach-ID beziehungsweise den tatsächlichen Benutzerprinzipalnamen; eine SMTP-Aliasadresse allein ist nicht zwingend geeignet. Erst nach Bestätigung wird die persönliche PDF gesendet. Microsoft Graph 202 bestätigt die Annahme, nicht Zustellung. Gesendete Kopien bleiben im M365-Postfach; dafür braucht SLS einen tatsächlichen Löschprozess.

SIA-POST im separaten Backend verlangt SIA_SERVICE_SECRET. Die Website übergibt dieses nur serverseitig. Öffentliches GET liefert weiterhin ausschließlich die Fähigkeit des Dienstes. Eine direkte Nutzung des Backends ohne Autorisierung wird vor KI-Aufrufen abgelehnt. Browsercookie und zentrale Tagesquoten bleiben erhalten.

CSP, nosniff, Frame-Schutz, Referrer- und Berechtigungsrichtlinien sind gesetzt. Die CSP erlaubt für bestehende Inline-Initialisierung noch unsafe-inline; eine spätere Umstellung auf Nonces/Hashes benötigt einen eigenen Test aller statischen Seiten. PriceHubble, Justhome und Karten werden erst nach expliziter Aktivierung geladen. Öffentlich freigegebene Immobilienbilder von externen Bildservern bleiben erlaubt.

## Nachweise und offene Kontoeinstellungen

Bei der ersten Metadatenprüfung war nur PROPSTACK_API_KEY als allgemeiner CRM-Zugang konfiguriert. Am 7. Oktober wurde dieser über den administrativen API-Log mit einer gezielten Website-Abfrage identifiziert: Propstack-Schlüssel „Website“, ID 335328. Zehn unbenötigte Schreibrechte wurden entfernt und nach erneutem Laden bestätigt: Deals, Kontaktstatus, Kontaktquellen und Merkmale anlegen/ändern sowie Aufgaben und Suchprofile ändern. Bestehende Secrets wurden nicht ausgelesen oder veröffentlicht.

### Propstack – Administrator

Sechs neue V1-Zugänge wurden mit gezielter Freigabe erstellt und direkt aus Propstack in neue geschützte Vercel-Variablen übertragen. Alle sechs sind ausschließlich für Produktion eingerichtet. Die bisherige gemeinsame Variable wurde nicht überschrieben. Die Website verwendet für vertrauliche CRM-Vorgänge in Produktion und Preview ausschließlich den jeweils zugehörigen Zugang; fehlt er, wird der Vorgang vor einem Provider-Aufruf gesperrt. Der allgemeine Schlüssel dient dafür in veröffentlichten Versionen nicht mehr als Ersatz.

- PROPSTACK_PUBLIC_API_KEY: Objekte lesen/anzeigen, Objektstatus lesen, Makler lesen/anzeigen. Keine Kontakt-, Notiz-, Suchprofil- oder Schreibrechte. Propstack begrenzt hier nach Ressourcen, nicht auf einzelne öffentliche Objektstatus. Die Website prüft zusätzlich den Veröffentlichungsstatus und liefert nur freigegebene Felder. PROPSTACK_API_KEY bleibt vorerst als vorhandene öffentliche Lese-Alternative erhalten; alte Deployments und der branchbezogene Preview-Zugang benötigen eine gesonderte Prüfung.
- PROPSTACK_CONTACT_API_KEY: Aktivitätstypen lesen; Kontakte lesen/anlegen und gezielt ergänzen; Aktivitäten lesen und Notizen anlegen. Keine Kontakte löschen, keine Mailversandrechte.
- PROPSTACK_GUIDES_API_KEY: entsprechende Kontakt-/Notizrechte für Ratgeber und DOI-Trigger. Keine allgemeinen Mailversandrechte. Propstack kann Rechte möglicherweise nur nach Ressourcen statt einzelnen Feldern begrenzen; Websitevalidierung ersetzt diese Kontoebene nicht.
- PROPSTACK_INQUIRY_API_KEY: Kontakte lesen/anlegen/anzeigen, Aktivitäten und Notizen lesen/anzeigen/anlegen, Aktivitätstypen lesen, Kontaktquellen und Deals nur lesen/anzeigen. Keine Kontaktänderung, Objektänderung oder Löschung. Auch die nachträgliche Aktivitäts- und Dealprüfung verwendet diesen Zugang statt des öffentlichen Objektschlüssels.
- PROPSTACK_SEARCH_PROFILE_API_KEY: Kontakte und Suchprofile lesen/anlegen. Für den Käufer-Nachfragecheck einen zusätzlichen rein lesenden Zugang PROPSTACK_DEMAND_API_KEY verwenden.
- Für Preview fehlen noch separate Zugänge zu einem Testbestand. Die neuen produktiven Zugänge wurden dort nicht freigegeben. Neue Preview-Versionen können deshalb keine CRM-Formulare oder den Nachfragecheck über einen allgemeinen Ersatzschlüssel betreiben. Die vorhandenen älteren Preview-Deployments und der branchbezogene Altzugang sind damit noch nicht automatisch widerrufen.

Versandautomatisierung: ausschließlich SLS_RATGEBER_VERKAUF_ANGEFORDERT für Ratgeber und SLS_NEWSLETTER_DOI_ANGEFORDERT für Bestätigungsmail. Prüfnotizen dürfen nie versenden. Newsletter/accept_contact erst nach tatsächlichem Double-Opt-in entsprechend dem angezeigten Text aktivieren; zusätzliche Immobilienmailings nicht unbeabsichtigt einschalten. Wiederholte Trigger ebenfalls auf Propstack-Seite unterdrücken. Nachweis von Bestätigung und Abmeldung erhalten.

Referenz: https://docs.propstack.de/ und https://docs.propstack.de/reference/kontakte

### Microsoft 365 – Administrator

Die App „SLS Verkaufscheck Website“ wurde identifiziert: Client-ID 01c3134e-3c87-4104-bd9c-38a9307ba812, Dienstprinzipal-ID 281b2bb1-ae3f-4508-bb2d-10aa22d9ddf6. Exchange Application RBAC ist eingerichtet: Rolle Application Mail.Send, Scope SLS-Website-Verkaufscheck-Mailbox, Filter EmailAddresses -eq 'smtp:verkaufscheck@sls.de'. Der Filter wurde vor der Zuweisung gegen genau ein Postfach mit der erwarteten Objekt-ID geprüft. Test-ServicePrincipalAuthorization erlaubt verkaufscheck@sls.de und verweigert f.livera@sls.de. Die zusätzliche organisationsweite Microsoft-Graph-Mail.Send-Zustimmung wurde in Entra widerrufen und ihr Fehlen nach Neuladen bestätigt. User.Read als delegierte Zustimmung blieb bestehen; Mail.Read/Mail.ReadWrite sind nicht erteilt. Berechtigungs-Caches können die vollständige Durchsetzung zeitlich verzögern.

Das freigegebene Versandpostfach ist ein SharedMailbox mit primärer Adresse verkaufscheck@sls.de und Benutzerprinzipalnamen verkaufscheck@slsimmobilienpartner.onmicrosoft.com. service@sls.de existiert in diesem Microsoft-Tenant nicht als Postfach. MS_GRAPH_SENDER verwendet deshalb jetzt die geprüfte Postfach-Objekt-ID bd20fafe-f2c3-4240-9e1b-703ab2741360. Diese Konfiguration ist produktiv veröffentlicht. Ein ausdrücklich freigegebener Test mit synthetischen Angaben an f.livera@sls.de bestätigte am 7. Oktober um 14:23 Uhr den Eingang der Code-Mail und um 14:26 Uhr die zweite Mail mit SLS-Verkaufsanalyse.pdf (rund 1 MB). Die Code-Bestätigung und beide API-Antworten waren erfolgreich; die erste Zustellung ist zusätzlich im Exchange-Trace als Delivered belegt.

MFA und eingeschränkter Zugriff auf das Versandpostfach, Malwarekontrolle und Löschverantwortliche prüfen. CAREER_* weiterhin nicht aktivieren, bevor Postfach, Rechte, Datenschutzfreigabe und synthetischer Zustelltest geklärt sind.

Referenz: https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac

### Datenschutz – Verantwortlicher/IT

Die lokale Seite /datenschutz/ erklärt die neuen Verarbeitungen und verlinkt die allgemeine SLS-Erklärung. Sie ersetzt nicht die Prüfung tatsächlicher Vertrags-, Speicher- und Löschbedingungen. AV-Verträge und Drittlandgarantien für Vercel, Redis/Upstash, Propstack, Microsoft und die KI-Verarbeitung prüfen. Person für Löschung in CRM, Service-Postfach, Downloads/Weiterleitungen und Backups benennen. Keine pauschale automatische CRM-Löschung aktivieren, bevor gesetzliche Aufbewahrung und Kundenbeziehungen getrennt sind. Die bisherige WordPress-Erklärung unter sls.de/datenschutz/ wurde nicht überschrieben.

Google-Maps-Browserschlüssel: Websites und erforderliche Maps-APIs im Google-Konto einschränken. Öffentlich sichtbarer Browserkey ist beabsichtigt; die Anbieterbeschränkung ist die Schutzmaßnahme.

## Betrieb und Störungsbearbeitung

Vercel-Runtime-Logs enthalten Ereignisse form_security_rejected, form_write_uncertain, m365_mail_failed, m365_token_failed und sales_report_failed ohne Formularinhalte. Bei mehreren 503: Redis-Verbindung prüfen. Bei form_write_uncertain: CRM/Postfach zuerst auf tatsächlich angelegten Vorgang prüfen; kein manuelles Mehrfachversenden. 429 bedeutet ausgeschöpfte Schutzgrenze. Ein einzelner erwarteter 400/403 in einem Negativtest ist kein Sicherheitsvorfall.

GET /api/security-health/ ist mit dem serverseitigen Service-Secret geschützt und prüft die Erreichbarkeit des Schutzspeichers. Das Secret nur als origin-gebundenen Authorization-Header in einem geeigneten privaten Monitor verwenden. Nie in einer URL, öffentlicher Statusseite oder Browsercode speichern. GET /api/security-monitor/ wird ausschließlich in Produktion stündlich durch Vercel Cron aufgerufen und verlangt das separate CRON_SECRET. Es prüft Redis-PING, offene Prüfmarkierungen aus ungewissen Schreibantworten und die Ablehnung nicht autorisierter direkter SIA-Aufrufe. Ergebnisse stehen als security_monitor_ok beziehungsweise security_monitor_alert in den Runtime-Logs. SECURITY_ALERT_EMAIL wird nur nach Auswahl des Empfängers gesetzt; ohne diese Variable werden keine Warnmails versandt. Bestehende gleiche Vorfälle werden bei erreichbarem Redis für 24 Stunden zusammengefasst. Bei Redis-Ausfall sind stündliche Erinnerungen und einzelne doppelte Cron-Ausführungen möglich, da dann kein zentraler Versandabgleich verfügbar ist. Warnmails enthalten keine Kundendaten. Microsoft-Graph-Annahme ist kein Zustellnachweis. Ein vollständiger Vercel- oder Microsoft-Ausfall kann über diesen internen Monitor keine Mail melden; dafür ist später ein unabhängiger externer Monitor nötig. Ungewisse Vorgänge erst im CRM/Postfach abgleichen; die Prüfmarkierung sls:security:review:last darf ein Administrator nach dem Abgleich im Redis-Dashboard löschen und verfällt sonst nach 24 Stunden.

Für eine Rückkehr die vorangegangene geprüfte Vercel-Deployment-ID verwenden. Ein Zurückrollen entfernt die neuen Schutzmaßnahmen: deshalb schreibende Formulare im Störungsfall vorzugsweise vorübergehend sperren und gezielt reparieren. SIA-Website und Backend müssen dieselbe Service-Authentifizierung unterstützen; bei Veröffentlichung erst die Website mit Header aktivieren, dann das abgesicherte Backend.

## Versandkorrektur am 7. Oktober 2026

Zwei Produktionsversuche wurden von Microsoft Graph sendMail ausdrücklich mit HTTP 404 abgelehnt (Prüfkennungen 60cd8fa4d0ce und de060616be52). Die Umstellung auf einen festen Absender hatte MS_GRAPH_SENDER übergangen. Der konfigurierte Versandzugang wird wieder verwendet. Diese beiden pending-Resultate werden bei Wiederholung einmalig und nur bis 8. Oktober 2026, 12 Uhr Berliner Zeit entsperrt; erfolgreiche oder andere ungewisse Resultate bleiben geschützt. Neue eindeutige Graph-4xx-Ablehnungen geben die Versandreservierung frei, Netzwerkfehler und 5xx bleiben gesperrt. Formularfreigabe, E-Mail-Code und Mengenbegrenzung bleiben verpflichtend. Code-Anforderungsantworten werden nur neun Minuten zwischengespeichert, damit eine neue Anforderung nach Ablauf möglich bleibt. Der endgültige Postfach-Eingang muss erneut durch SLS geprüft werden.

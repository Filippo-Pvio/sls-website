# Bewerbungsformular – Umsetzung und Aktivierung

Empfänger und Absender der Formular-E-Mail sind fest `bewerbung@sls.de`. Die Website ist als statische HTML-Seite unter `/karriere/` umgesetzt. Uploads werden ausschließlich beim Absenden übertragen. Die Datenschutzhinweise stehen unter `/karriere/datenschutz/`.

## Aktueller Zustand

Online-Versand ist **nicht aktiv**, solange Microsoft-365-Zugang und Datenschutz-Freigabe fehlen. Das API antwortet dann beim GET mit `available: false` und bei POST mit 503, bevor der Handler den Body liest. Der Absenden-Button bleibt deaktiviert. Direktbewerbungen per E-Mail sind erreichbar. Keine Bewerbungsinhalte wurden zu Testzwecken extern verschickt.

## Microsoft 365 anbinden

Ein M365-/Exchange-Administrator muss zunächst bestätigen, dass `bewerbung@sls.de` in diesem Tenant tatsächlich ein zugängliches Exchange-Online-Postfach ist; ein bloßer Weiterleitungsalias ist nicht ausreichend. Der Implementierung liegt das im Projekt bekannte Microsoft 365 zugrunde, der tatsächliche Postfachprovider ist noch nicht verifiziert. Falls das Postfach anders betrieben wird, muss der Transport entsprechend angepasst werden.

Eine eigene Entra-Anwendung verwenden. `Mail.Send` ausschließlich für das Postfach `bewerbung@sls.de` mittels Exchange Application RBAC einschränken. Keine organisationsweite Mail.Read/ReadWrite-Berechtigung und keine zusätzliche unbeschränkte Mail.Send-Zuweisung in Entra. Anwendungsberechtigungen sind additiv: eine zusätzliche unbeschränkte Entra-Berechtigung würde den RBAC-Scope aushebeln. Mit Test-ServicePrincipalAuthorization die Beschränkung prüfen. Diese Einrichtung erzeugt neue Sicherheitsberechtigungen und muss durch den zuständigen Administrator erfolgen; sie wurde nicht automatisch ausgeführt.

Vertrauliche Werte ausschließlich als Vercel-Server-Umgebungsvariablen hinterlegen, niemals im Chat, im Browsercode oder in Git:

- `CAREER_M365_TENANT_ID`: Tenant-GUID
- `CAREER_M365_CLIENT_ID`: Application-GUID
- `CAREER_M365_CLIENT_SECRET`: dediziertes, regelmäßig rotiertes App-Secret (mindestens 16 Zeichen)
- `CAREER_TOKEN_SECRET`: zufälliges Secret mit mindestens 32 Zeichen für kurzlebige Formularsignaturen
- `CAREER_PRIVACY_APPROVED=1`: erst nach der unten beschriebenen tatsächlichen organisatorischen Prüfung setzen

Die Funktion ist in `vercel.json` nur für `api/career-application.js` auf Frankfurt (`fra1`) gesetzt. Andere Funktionen bleiben unverändert. Diese Regionseinstellung garantiert keine ausschließliche EU-Verarbeitung aller Microsoft-/Vercel-Dienste.

## Datenschutz vor Aktivierung

Der Text unter `/karriere/datenschutz/` ist ein konkret vorbereiteter Entwurf für diese Datenverarbeitung. Vor Aktivierung verantwortlich prüfen:

- korrekter Betreiber, ggf. bestellter Datenschutzbeauftragter und interner Zugriffskreis
- bestätigter M365-Postfachprovider und tatsächlich eingesetzte IT-Dienstleister
- Auftragsverarbeitungsverträge mit Vercel/Microsoft, Subprozessoren und Garantien für Drittlandübermittlungen
- sechs Monate nach Absage als tatsächlich umgesetzte Regelfrist; kein pauschaler gesetzlicher Sechsmonatszwang
- Verantwortliche für die Löschung aus Postfach, lokalen Downloads, Weiterleitungen und weiteren Kopien, einschließlich Backup-Konzept
- Bewerberpool bleibt ausgeschlossen; keine Werbung, keine Weitergabe an Propstack und keine KI-Auswahl über dieses Formular
- Schutz der Mailbox mit beschränktem Zugriff, MFA und Malwareprüfung für Anhänge

Die Website löscht nicht automatisch Microsoft-365-Mails. Eine Inbox-Regel, die alle Mails pauschal sechs Monate nach Eingang löscht, wäre keine korrekte Umsetzung der Frist nach Absage. Abschlussdatum und etwaige rechtliche Aufbewahrung müssen im HR-Prozess berücksichtigt werden. Ohne Prüfung dieser Punkte `CAREER_PRIVACY_APPROVED` nicht setzen. Nach finaler Prüfung die konditionalen Hinweise zum Aktivierungsstand im öffentlichen Datenschutztext an den tatsächlichen Betrieb anpassen. Rechtsgrundlagen und Hinweise sind keine anwaltliche Freigabe.

## Dateien und Grenzen

Vier Uploadbereiche: Lebenslauf (Pflicht), Anschreiben, Zeugnisse, weitere Unterlagen (optional). Pro Bereich eine PDF/DOC/DOCX-Datei, maximal 2 MiB pro Datei und 3 MiB insgesamt. Keine öffentliche Ablage, kein Blob-Storage, keine Bewerberdaten in LocalStorage. Die Begrenzung berücksichtigt Vercels Request-Grenze (4,5 MB) und die Base64-Vergrößerung. Für größere Dateien wäre ein separater, privater Uploaddienst nötig.

Server prüft Endung, Größe, Base64, PDF-Kennung/EOF und offensichtliche aktive PDF-Inhalte, OLE-/Word-Kennung bei DOC sowie DOCX-ZIP-Verzeichnis, Makro-/Einbettungsnamen und Entpackgröße. Das ist **keine vollständige Malwareprüfung**. Mailbox-/Endpoint-Schutz bleibt erforderlich; DOC im Zweifel künftig deaktivieren.

Microsoft Graph `202 Accepted` bestätigt die Annahme des Versandauftrags, nicht die abschließende Zustellung. Deshalb meldet die Oberfläche nur Annahme des Versands. Es gibt keine automatische Wiederholung bei unklarem Versand. Doppelklicks werden im Browser verhindert; Referenzen werden im flüchtigen Instanzspeicher überwacht, es besteht keine verteilte/dauerhafte Idempotenzgarantie. Für hohe Last ggf. einen privaten persistenten Statusspeicher ergänzen.

## Validierung

`node --test qa/career-application.test.mjs` prüft ausschließlich mit synthetischen Dokumenten und gemockten Microsoft-Antworten. Vor Aktivierung ist eine ausdrücklich autorisierte Zustellprüfung mit synthetischen Unterlagen erforderlich: tatsächlicher Eingang im HR-Postfach, vier korrekte Anhänge, Reply-To, interne Zugriffsrechte und Malwarekontrolle. Kein Produktionsversand wurde für einen Test ausgelöst.

Offizielle Referenzen:
- https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow
- https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac
- https://vercel.com/docs/functions/configuring-functions/region
- https://www.gesetze-im-internet.de/bdsg_2018/__26.html

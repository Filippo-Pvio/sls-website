# Bewerbungsformular – Umsetzung und Aktivierung

Empfänger und Absender der Formular-E-Mail sind fest `bewerbung@sls.de`. Die Website ist als statische HTML-Seite unter `/karriere/` umgesetzt. Uploads werden ausschließlich beim Absenden übertragen. Die Datenschutzhinweise stehen unter `/karriere/datenschutz/`.

## Aktueller Zustand

Die Einrichtung ist abgeschlossen und der synthetische End-to-End-Test wurde am 10. Oktober 2026 zugestellt. Die Aktivierung auf der bestehenden Arbeitswebsite erfolgt mit dieser Änderung und `CAREER_PRIVACY_APPROVED=1` in Production. Die endgültige Domain und der spätere Hosterwechsel sind davon ausgeschlossen.

Fehlen die M365-Konfiguration oder die Aktivierungsfreigabe, antwortet das API weiterhin beim GET mit `available: false` und bei POST mit 503, bevor der Handler den Body liest. Der Absenden-Button bleibt dann deaktiviert. Direktbewerbungen per E-Mail bleiben erreichbar.

## Microsoft 365 anbinden

Am 10. Oktober 2026 wurde das gemeinsame Exchange-Online-Postfach `bewerbung@sls.de` angelegt. Der Nutzer hat ausdrücklich Vollzugriff für Filippo Livera (`f.livera@sls.de`), Mischa Stratmann (`m.stratmann@sls.de`) und Dennis Sahlmen (`d.sahlmen@sls.de`) freigegeben. Diese drei Konten sind berechtigt, Bewerbungen und Anhänge zu lesen und zu löschen. Zusätzliche SendAs-Rechte wurden nicht vergeben. Die Geschäftsführung übernimmt die Bearbeitung und die Löschung nach einer Absage.

Die eigene Entra-Anwendung **SLS Bewerbungsformular Website** (Client-ID `56ee4a98-1f04-4918-b2df-27aebf8d1374`, Service Principal `624b3c25-fb39-4ab0-9432-1fc9a2c5f436`) erhält über Exchange Application RBAC nur `Application Mail.Send` im Scope **SLS-Website-Bewerbung-Mailbox**. Filter: `EmailAddresses -eq 'smtp:bewerbung@sls.de'`. Die Rollenvergabe heißt **SLS-Website-Bewerbung-MailSend**. Keine organisationsweite Graph-Mail.Send-Zuweisung und keine Mail.Read/ReadWrite-Rechte wurden hinzugefügt.

`Test-ServicePrincipalAuthorization` bestätigt den Versandzugriff auf `bewerbung@sls.de` und verweigert ihn für `f.livera@sls.de` sowie `verkaufscheck@sls.de`. Die Standard-Malwareprüfung in Microsoft 365 ist aktiviert. Die aktive Richtlinie „Require MFA for all Users“ verlangt MFA; ihre einzige Ausnahmegruppe enthält zwei Atlas-Notfallkonten und keine der drei Geschäftsführungskonten. Der Schutz heruntergeladener Dateien bleibt organisatorisch zu kontrollieren.

Das dedizierte App-Secret ist geschützt in Vercel Production sowie ausschließlich für den Testbranch in Preview hinterlegt. Es läuft am **8. April 2027** ab und muss vorher rotiert werden. Secrets stehen weder hier noch im Browsercode oder in Git.

Vertrauliche Werte ausschließlich als Vercel-Server-Umgebungsvariablen hinterlegen, niemals im Chat, im Browsercode oder in Git:

- `CAREER_M365_TENANT_ID`: Tenant-GUID
- `CAREER_M365_CLIENT_ID`: Application-GUID
- `CAREER_M365_CLIENT_SECRET`: dediziertes, regelmäßig rotiertes App-Secret (mindestens 16 Zeichen)
- `CAREER_TOKEN_SECRET`: zufälliges Secret mit mindestens 32 Zeichen für kurzlebige Formularsignaturen
- `CAREER_PRIVACY_APPROVED=1`: erst nach der unten beschriebenen tatsächlichen organisatorischen Prüfung setzen

Die Funktion ist in `vercel.json` nur für `api/career-application.js` auf Frankfurt (`fra1`) gesetzt. Andere Funktionen bleiben unverändert. Diese Regionseinstellung garantiert keine ausschließliche EU-Verarbeitung aller Microsoft-/Vercel-Dienste.

## Organisatorischer Betrieb und Datenschutz

Die Datenschutzhinweise unter `/karriere/datenschutz/` nennen die tatsächlichen Dienstleister und die Geschäftsführung als Zugriffskreis. Die Geschäftsführung wurde vom Nutzer als zuständig für Bearbeitung und Löschung benannt. Im laufenden Betrieb verantwortlich sicherstellen:

- korrekter Betreiber, ggf. bestellter Datenschutzbeauftragter und interner Zugriffskreis
- bestätigter M365-Postfachprovider und tatsächlich eingesetzte IT-Dienstleister
- Auftragsverarbeitungsverträge mit Vercel/Microsoft, Subprozessoren und Garantien für Drittlandübermittlungen
- sechs Monate nach Absage als tatsächlich umgesetzte Regelfrist; kein pauschaler gesetzlicher Sechsmonatszwang
- Verantwortliche für die Löschung aus Postfach, lokalen Downloads, Weiterleitungen und weiteren Kopien, einschließlich Backup-Konzept
- Bewerberpool bleibt ausgeschlossen; keine Werbung, keine Weitergabe an Propstack und keine KI-Auswahl über dieses Formular
- Schutz der Mailbox mit beschränktem Zugriff, MFA und Malwareprüfung für Anhänge

Die Website löscht nicht automatisch Microsoft-365-Mails. Eine Inbox-Regel, die alle Mails pauschal sechs Monate nach Eingang löscht, wäre keine korrekte Umsetzung der Frist nach Absage. Abschlussdatum und etwaige rechtliche Aufbewahrung müssen im HR-Prozess berücksichtigt werden. Die technische Aktivierung ersetzt weder die betriebliche Fristenkontrolle noch die Ablage der konkreten Vertragsnachweise. Die Standardvertragsgrundlagen sind die Vercel Terms einschließlich DPA sowie die Microsoft-Vertragsbedingungen einschließlich Products and Services DPA. Ein abgeschlossener individueller Rechts- oder Vertragsaudit wird damit nicht behauptet. Rechtsgrundlagen und Hinweise sind keine anwaltliche Freigabe.

## Dateien und Grenzen

Vier Uploadbereiche: Lebenslauf (Pflicht), Anschreiben, Zeugnisse, weitere Unterlagen (optional). Pro Bereich eine PDF/DOC/DOCX-Datei, maximal 2 MiB pro Datei und 3 MiB insgesamt. Keine öffentliche Ablage, kein Blob-Storage, keine Bewerberdaten in LocalStorage. Die Begrenzung berücksichtigt Vercels Request-Grenze (4,5 MB) und die Base64-Vergrößerung. Für größere Dateien wäre ein separater, privater Uploaddienst nötig.

Server prüft Endung, Größe, Base64, PDF-Kennung/EOF und offensichtliche aktive PDF-Inhalte, OLE-/Word-Kennung bei DOC sowie DOCX-ZIP-Verzeichnis, Makro-/Einbettungsnamen und Entpackgröße. Das ist **keine vollständige Malwareprüfung**. Mailbox-/Endpoint-Schutz bleibt erforderlich; DOC im Zweifel künftig deaktivieren.

Microsoft Graph `202 Accepted` bestätigt die Annahme des Versandauftrags, nicht die abschließende Zustellung. Deshalb meldet die Oberfläche nur Annahme des Versands. Es gibt keine automatische Wiederholung bei unklarem Versand. Doppelklicks werden im Browser verhindert; Referenzen werden im flüchtigen Instanzspeicher überwacht, es besteht keine verteilte/dauerhafte Idempotenzgarantie. Für hohe Last ggf. einen privaten persistenten Statusspeicher ergänzen.

## Validierung

`node --test qa/career-application.test.mjs` prüft ausschließlich mit synthetischen Dokumenten und gemockten Microsoft-Antworten. Vor Aktivierung ist eine ausdrücklich autorisierte Zustellprüfung mit synthetischen Unterlagen erforderlich: tatsächlicher Eingang im HR-Postfach, vier korrekte Anhänge, Reply-To, interne Zugriffsrechte und Malwarekontrolle. Der erste Vorschauversuch wurde vor dem Funktionsaufruf durch die bestehende Vercel-Regel gegen API-Schreibzugriffe blockiert. Für die Wiederholung wurde eine vorübergehende Ausnahme ausschließlich für POST auf der Bewerbungsroute des konkreten geschützten Vorschauhosts freigegeben. Der erfolgreiche Test trägt die Referenz `b8ac07f1-aed3-4f2a-bd82-5372a84de404`. Exchange meldet `Delivered`; der Eingang in Outlook unter bewerbung@sls.de, alle vier PDF-Anhänge und Reply-To `funktionstest@example.invalid` wurden geprüft. Die temporäre Firewallregel wurde danach entfernt und die Entfernung veröffentlicht. Die ursprüngliche Vorschau-Sperre bleibt aktiv. Es wurde genau eine Testmail zugestellt.

Offizielle Referenzen:
- https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow
- https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac
- https://vercel.com/docs/functions/configuring-functions/region
- https://www.gesetze-im-internet.de/bdsg_2018/__26.html

- https://vercel.com/legal/terms
- https://vercel.com/legal/dpa
- https://www.microsoft.com/licensing/docs/view/Microsoft-Products-and-Services-Data-Protection-Addendum-DPA

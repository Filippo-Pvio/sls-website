# Rückkehr zum bestehenden Agentur-Container

Stand: 3. November 2026. Umsetzung vom Nutzer in diesem Chat beauftragt. Arbeitsbranch: `fix/restore-agency-tracking-20261103`; Ausgangspunkt: main `d59d4520a651a58b719b3c2fe564abc393132817`.

## Status

Zugriff durch die Agentur erhalten und Einladung angenommen. Originalversion 21 exportiert und außerhalb des Repositories gesichert. Migration in eigenem Workspace 23 als Merge geprüft: sieben bestehende Tags um eine ausschließlich für die neue Website geltende Ausnahme ergänzt; 18 Objekte hinzugefügt, nichts gelöscht. Version 22 „SLS Relaunch – Cookie-Abgleich 2026-11-03“ am 3. November um 16:41:53 veröffentlicht. Website-Freigabe erfolgt über PR #285 nach erfolgreicher geschützter Vorschau. Keine Kontoverknüpfungen, Kampagnen oder Conversion-Aktionen verändert.

## Website-Anpassung

- Ein Loader für `GTM-W3LWF7C6`; der neue Container wird nach der Umstellung nicht zusätzlich geladen.
- Google-Statistik, Clarity und Google-/Meta-Werbemessung erhalten getrennte Opt-ins. Bestehende Entscheidungen autorisieren die hinzugefügten Anbieter nicht; die neue Textversion fordert eine neue Auswahl an.
- Basic-Modus: Ohne irgendeine der drei Freigaben wird GTM nicht geladen. Clarity erhält seine eigene `consentv2`-Analysefreigabe, ohne Clarity-Werbefreigabe. Google-Werbezustände bleiben ohne Marketing-Einwilligung denied.
- Bestehende sechs bestätigte Website-Abschlussnamen bleiben erhalten; die Brücke übernimmt keine Formularfelder oder Objektkennungen und entfernt Query und Fragment aus den expliziten GA-Seitenparametern.
- Widerruf beendet die weitere Weitergabe sofort, entfernt erreichbare eigene Cookies des widerrufenen Anbieters und verwendet den vorhandenen Reload des Consent-Managers zum Beenden geladener SDKs.
- Gezielte CSP-Ergänzungen für die bestehenden Meta-/Clarity-Dienste und entsprechende Datenschutzhinweise.
- Nur sls.de und der bestehende Produktionsalias sind aktiv. Beim Build dieses Preview-Branches werden ausschließlich die von Vercel tatsächlich gelieferten Projekt-/Branch-Hosts ergänzt; Produktion erhält keine solchen Preview-Freigaben.

## Durchgeführte Container-Migration

1. Bestehenden GTM-Workspace und aktuelle veröffentlichte Version separat exportieren. Eventuelle fremde Workspace-Änderungen prüfen; nichts pauschal überschreiben.
2. Tatsächliche bisherigen Tags, Templates und Asset-IDs mit dem Export vergleichen. Erwartete öffentliche Version: 21; Analytics `G-5CDDRCTXCM`, Meta-Pixel `1640129720298425`, Clarity-Projekt `t3vffd89eo`.
3. Den Import lokal aus dem geprüften Export erzeugen:

   `node scripts/prepare-agency-container.mjs <agency-export.json> <reviewed-import.json>`

4. In einem eigenen Workspace als Merge mit gezieltem Überschreiben der geprüften bestehenden Objekte importieren und die Vorschau aller Änderungen kontrollieren. Der Generator ersetzt keinen Container und bricht bei falscher Container-ID, abweichendem Tag-Set oder bereits vorhandener Migration ab.
5. Die bisherigen Tags und Borlabs-Auslöser bleiben erhalten. Eine Ausnahme sperrt sie ausschließlich auf Seiten mit der neuen Brückenkennung `sls-agency-v1`. Neue, getrennt freigegebene Tags verwenden die bisherigen Asset-IDs auf der neuen Website. Andere Seiten, die den Container ohne diese Brücke verwenden, behalten die bisherigen Tags und Auslöser.
6. Der Google-Tag und die sechs neuen Abschlussereignisse verwenden die bestehende Analytics-ID. Der bestehende Google-Tag ist zusätzlich mit Ads AW-11560165529 verbunden. Er startet einmal pro Seitenaufruf nach Statistik- oder Werbefreigabe und berücksichtigt die getrennten nativen Google-Einwilligungszustände. Bei Statistik allein sind begrenzte cookielose Ads-Messsignale möglich; dies ist in Cookie-Dialog und Datenschutzhinweisen offengelegt. Die bisherigen Zusatzereignisse `pageview_immobilienbewertung` und `pageview_verkaufen` werden erhalten. Seitenaufrufe werden nicht als bestätigte Formularabschlüsse ausgegeben. Die Clarity-Freigabe ist unabhängig von `analytics_storage` für Google.
7. Keine Ads-Conversion-Aktion, Kampagne, Kontoverknüpfung, Analytics-Aufbewahrung oder Zugriffsberechtigung verändern. Die tatsächlichen von Ads verwendeten Conversion-Aktionen und Importe müssen separat gelesen und mit den vorhandenen Ereignissen abgeglichen werden. Ein Conversion Linker ist kein alleiniger Nachweis einer Abschlussmessung.

## Abnahme und Veröffentlichung

- Lokale Abnahme: 32 gezielte Tests erfolgreich; vollständiger öffentlicher Build erfolgreich; Diff ohne Formatfehler. Produktion erzeugt keine Testformulare und keine Preview-Hostfreigaben.
- Geschützte Vercel-Vorschau `sls-website-g462p9d7v-info-91172609.vercel.app`, Commit `4e475b2`: Tag Assistant bestätigt den richtigen alten Container und die bestehende Analytics-ID. Keine optionalen Tags vor Zustimmung bzw. nach Widerruf auf „Nur notwendige“. Statistik allein startet die neue Google-Konfiguration; Clarity allein startet das bestehende Clarity-Projekt ohne Google-Statistik und Meta. Marketing allein löst die Google-Konfiguration, Conversion Linker und bestehenden Meta-Pixel aus. Keine CSP-Fehler in den geprüften Szenarien.
- Alle sechs echten Frontend-Handler mit isoliert simulierten API-Antworten geprüft: `contact_request_success`, `buyerfinder_request_success`, `guide_request_success`, `search_profile_success`, `property_inquiry_success`, `sales_report_success`. Jeder Abschluss einmal in der lokalen Brücke und als gesendeter GA-Treffer an `G-5CDDRCTXCM` im Tag Assistant bestätigt. Keine echten CRM-/Mail-Transaktionen. Das ist kein Nachweis echter Mailzustellung.
- Einschränkung: Meta meldet für die Preview-Domain eine kontoseitige Traffic-Sperre. Deshalb nach Website-Freigabe nochmals auf sls.de prüfen. Analytics-Berichtsverarbeitung und Ads-Conversion-Importe sind durch GTM-Zugriff allein nicht verifizierbar und wurden nicht verändert.
- Nach Website-Freigabe kanonische Domain auf alten Container, getrennte Freigaben, Widerruf und fehlende öffentliche QA-Seiten prüfen und Ergebnis im Abschlussprotokoll festhalten.
- Rückfall: Website auf den vor der Umstellung gesicherten Produktionsstand zurückstellen. Neue Containerkonfiguration der Agentur ist ohne neue Brückenkennung auf anderen Seiten nicht aktiv. Bei Bedarf die gesicherte vorherige GTM-Version wiederherstellen.

## Primärquellen

- Google Consent Mode: https://developers.google.com/tag-platform/security/guides/consent
- Google Conversion Linker: https://support.google.com/tagmanager/answer/7549390
- Microsoft Clarity consentv2: https://learn.microsoft.com/en-gb/clarity/setup-and-installation/clarity-consent-api-v2
- Microsoft Clarity Cookies: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-cookies

# Rückkehr zum bestehenden Agentur-Container

Stand: 3. November 2026. Umsetzung vom Nutzer in diesem Chat beauftragt. Arbeitsbranch: `fix/restore-agency-tracking-20261103`; Ausgangspunkt: main `d59d4520a651a58b719b3c2fe564abc393132817`.

## Status

Website-Anpassung lokal vorbereitet. Keine Veröffentlichung und keine Änderungen an Google-Konten oder GTM erfolgt. Der angemeldete Nutzer `f.livera@sls.de` sieht in GTM ausschließlich `GTM-PSH7R4R8`; Zugriff auf `GTM-W3LWF7C6` ist noch erforderlich. Vor der Website-Veröffentlichung müssen der tatsächliche Export des alten Containers geprüft, die Migration importiert und der veröffentlichte Container im Browser abgenommen werden. Der vorbereitete Import-Generator wurde mit Testdaten geprüft, noch nicht gegen einen echten GTM-Export des Agentur-Containers.

## Website-Anpassung

- Ein Loader für `GTM-W3LWF7C6`; der neue Container wird nach der Umstellung nicht zusätzlich geladen.
- Google-Statistik, Clarity und Google-/Meta-Werbemessung erhalten getrennte Opt-ins. Bestehende Entscheidungen autorisieren die hinzugefügten Anbieter nicht; die neue Textversion fordert eine neue Auswahl an.
- Basic-Modus: Ohne irgendeine der drei Freigaben wird GTM nicht geladen. Clarity erhält seine eigene `consentv2`-Analysefreigabe, ohne Clarity-Werbefreigabe. Google-Werbezustände bleiben ohne Marketing-Einwilligung denied.
- Bestehende sechs bestätigte Website-Abschlussnamen bleiben erhalten; die Brücke übernimmt keine Formularfelder oder Objektkennungen und entfernt Query und Fragment aus den expliziten GA-Seitenparametern.
- Widerruf beendet die weitere Weitergabe sofort, entfernt erreichbare eigene Cookies des widerrufenen Anbieters und verwendet den vorhandenen Reload des Consent-Managers zum Beenden geladener SDKs.
- Gezielte CSP-Ergänzungen für die bestehenden Meta-/Clarity-Dienste und entsprechende Datenschutzhinweise.
- Nur sls.de und der bestehende Produktionsalias sind aktiv. Beim Build dieses Preview-Branches werden ausschließlich die von Vercel tatsächlich gelieferten Projekt-/Branch-Hosts ergänzt; Produktion erhält keine solchen Preview-Freigaben.

## Container-Migration nach Erhalt der Rechte

1. Bestehenden GTM-Workspace und aktuelle veröffentlichte Version separat exportieren. Eventuelle fremde Workspace-Änderungen prüfen; nichts pauschal überschreiben.
2. Tatsächliche bisherigen Tags, Templates und Asset-IDs mit dem Export vergleichen. Erwartete öffentliche Version: 21; Analytics `G-5CDDRCTXCM`, Meta-Pixel `1640129720298425`, Clarity-Projekt `t3vffd89eo`.
3. Den Import lokal aus dem geprüften Export erzeugen:

   `node scripts/prepare-agency-container.mjs <agency-export.json> <reviewed-import.json>`

4. In einem eigenen Workspace als Merge mit gezieltem Überschreiben der geprüften bestehenden Objekte importieren und die Vorschau aller Änderungen kontrollieren. Der Generator ersetzt keinen Container und bricht bei falscher Container-ID, abweichendem Tag-Set oder bereits vorhandener Migration ab.
5. Die bisherigen Tags und Borlabs-Auslöser bleiben erhalten. Eine Ausnahme sperrt sie ausschließlich auf Seiten mit der neuen Brückenkennung `sls-agency-v1`. Neue, getrennt freigegebene Tags verwenden die bisherigen Asset-IDs auf der neuen Website. Andere Seiten, die den Container ohne diese Brücke verwenden, behalten die bisherigen Tags und Auslöser.
6. Der Google-Tag und die sechs neuen Abschlussereignisse verwenden die bestehende Analytics-ID. Die bisherigen Zusatzereignisse `pageview_immobilienbewertung` und `pageview_verkaufen` werden erhalten. Seitenaufrufe werden nicht als bestätigte Formularabschlüsse ausgegeben. Die Clarity-Freigabe ist unabhängig von `analytics_storage` für Google.
7. Keine Ads-Conversion-Aktion, Kampagne, Kontoverknüpfung, Analytics-Aufbewahrung oder Zugriffsberechtigung verändern. Die tatsächlichen von Ads verwendeten Conversion-Aktionen und Importe müssen separat gelesen und mit den vorhandenen Ereignissen abgeglichen werden. Ein Conversion Linker ist kein alleiniger Nachweis einer Abschlussmessung.

## Abnahme und Veröffentlichung

- Lokale Abnahme: 26 gezielte Tests erfolgreich, vollständiger öffentlicher Build erfolgreich. Browser: neue getrennte Kategorien vorhanden und standardmäßig abgelehnt; auf localhost keine externen Messtags. Noch kein Nachweis der GTM-Importvalidierung, tatsächlicher Provider-Anfragen oder eines Dateneingangs in der bisherigen Analytics-Property.
- Auf der geschützten Preview nach GTM-Anpassung Ablehnung, Statistik allein, Clarity allein, Marketing allein, alle Freigaben und Widerruf prüfen. Pro Szenario die tatsächlich geladenen Tags, Netzwerkziele und CSP-Verstöße prüfen.
- Bestätigte Formularereignisse ohne reale CRM-/Mail-Transaktionen über isolierte Simulation abnehmen; keine erfundenen Live-Leads erstellen. Nicht als Nachweis tatsächlicher E-Mail-Zustellung ausgeben.
- Erst nach erfolgreicher Container-Abnahme die Website umstellen und die kanonische Domain erneut prüfen. Nicht aus dem aktuellen lokalen Vorbereitungsstand ungeprüft veröffentlichen.
- Rückfall: Website auf den vor der Umstellung gesicherten Produktionsstand zurückstellen. Neue Containerkonfiguration der Agentur ist ohne neue Brückenkennung auf anderen Seiten nicht aktiv. Bei Bedarf die gesicherte vorherige GTM-Version wiederherstellen.

## Primärquellen

- Google Consent Mode: https://developers.google.com/tag-platform/security/guides/consent
- Google Conversion Linker: https://support.google.com/tagmanager/answer/7549390
- Microsoft Clarity consentv2: https://learn.microsoft.com/en-gb/clarity/setup-and-installation/clarity-consent-api-v2
- Microsoft Clarity Cookies: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-cookies

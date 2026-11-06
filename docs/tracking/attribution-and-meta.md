# Kampagnenzuordnung und Meta-Abschlüsse – 6. November 2026

Beauftragt nach Kims Prüfung von Version 22. Ausgangspunkt main 2fad8e5. Arbeitsbranch fix/tracking-attribution-20261106.

## Umsetzung

- Die Website übermittelt festgelegte UTM-Schlüssel (source, medium, campaign, id, term, content, source_platform, creative_format, marketing_tactic) und syntaktisch begrenzte gclid/gbraid/wbraid/fbclid. Andere Query-Parameter und Fragmente werden aus dem expliziten Google-Seitenparameter entfernt. Keine Formularwerte oder freien Event-Payloads werden übernommen. Kampagnenwerte mit E-Mail-Zeichen bzw. überlangen oder unzulässigen Inhalten werden verworfen.
- Externe Referrer werden auf die Herkunfts-Domain reduziert; interne Referrer enthalten Domain und Pfad ohne Query/Fragment. Der Seitentitel stammt aus document.title. Google-Konfiguration und drei GA-Ereignistags verwenden passende Datenschichtvariablen.
- Die sechs bestätigten Frontend-Abschlüsse bleiben für Analytics an Statistikfreigabe gebunden. Bei Werbefreigabe wird unabhängig davon sls_marketing_conversion mit ausschließlich dem festen Abschlussnamen bereitgestellt. Keine rückwirkende Wiedergabe zuvor abgelehnter Abschlüsse.
- Neuer Meta-Tag: genau ein pixel-spezifisches Lead pro bereitgestelltem Werbeabschluss, mit content_name als Abschlussart. Zusätzliche Google-Consent-Prüfungen für Werbung; keine Formulardaten. Bisheriger Meta PageView bleibt erhalten. Keine Ads-Conversion-Aktion, Kampagne oder Budgetänderung.
- Container-Migration: vier bestehende Google-Tags ändern, drei Variablen, einen Trigger und einen Meta-Tag hinzufügen; übrige Tags, Variablen, Auslöser und Vorlagen erhalten. Frischer v22-Export außerhalb des Repositories gesichert.
- Vorschau-Testformulare für sechs Abläufe und zwei Eigentümer-Landingpages verwenden simulierte API-Antworten, ohne CRM-/Mail-Transaktionen. Sie werden nur auf dem expliziten Preview-Branch gebaut und niemals in Produktion.

## Offener Kontopunkt

Der Nutzer hat entschieden: Kim soll die automatische Erfassung von E-Mail und Telefonnummer im bisherigen Google-Tag deaktivieren und bestätigen. Der angemeldete Zugang hat GTM-Veröffentlichungsrechte, aber die bisherigen Analytics-/Google-Tag-Einstellungen sind nicht zugänglich. Die durch die Website selbst übergebenen Ereignisse enthalten keine Kontaktdaten. Eine kontoseitig aktive automatische Erfassung ist davon getrennt und nicht als bereits abgeschaltet auszugeben.

## Abnahme

Lokale Tests und öffentlicher Build erfolgreich. GTM-Import, Vorschau und Produktion werden gesondert geprüft und im Abschlussprotokoll dokumentiert. Konfiguration der Schlüsselereignisse durch Kim erhalten. Google Ads bleibt bis zu einem beschlossenen Kampagnenstart zurückgestellt.

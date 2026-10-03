# Kontaktseite und Propstack

Die neue Kontaktseite verwendet vorhandene API-Zugänge serverseitig (optional PROPSTACK_CONTACT_API_KEY, sonst PROPSTACK_INQUIRY_API_KEY bzw. PROPSTACK_API_KEY). Keine Schlüssel im Browser.

## Vom Eigentümer in Propstack einzurichten

Fünf Notizkategorien mit diesen exakten Namen (Gedankenstrich „–“):

| Auswahl | Notizkategorie und Notiztitel |
| --- | --- |
| Verkaufen | Website Kontakt – Verkaufswunsch |
| Immobiliensuche | Website Kontakt – Immobiliensuche |
| Wert erfahren / Bewertung | Website Kontakt – Bewertungsanfrage |
| Anderes Anliegen | Website Kontakt – Allgemeine Anfrage |
| Zusätzlich bei Rückruf | Website Kontakt – Rückruf gewünscht |

Kategorie muss für Notizen sein (`for_notes` / `note`). Das Backend liest die IDs anhand der Namen. Es legt keine Kategorien oder Automatisierungen an.

Bei Rückruf werden die Anliegen-Notiz und die zusätzliche Rückruf-Notiz am selben Kontakt angelegt. Auf der Rückrufkategorie die Aufgabe, Fälligkeit und zuständige Person durch die Propstack-Automatisierung festlegen. Keine doppelte Rückrufaufgabe zusätzlich über die Anliegenkategorie anlegen.

Notizinhalt enthält Anliegen, eingegebenen Namen, E-Mail, Rückrufnummer, Nachricht, optionalen Ort und Kontaktweg. Bei Rückruf zusätzlich bevorzugtes Zeitfenster:
- Vormittags · 9–12 Uhr
- Mittags · 12–14 Uhr
- Nachmittags · 14–16 Uhr
- Später Nachmittag · 16–18 Uhr
- Zeitlich flexibel

Das Zeitfenster ist keine Terminzusage. Die Eingaben dienen ausschließlich der Bearbeitung dieser Anfrage; es werden keine Newsletter-Einwilligungen oder vorhandenen Kontaktfelder verändert. Bestehender Kontakt wird nur bei eindeutiger Übereinstimmung von primärer E-Mail und Namen verwendet; sonst verständlicher Konflikthinweis. Suchanfragen erzeugen hier keinen Suchauftrag automatisch.

## Freischaltung und Prüfung

`GET /api/propstack-contact-request` liest nur die Konfiguration und liefert verfügbare Anliegen und Rückrufbereitschaft plus signiertes Formulartoken. Nicht vorhandene / doppelte Kategorien geben keine Bereitschaft. Vor jedem POST werden die benötigten Kategorien erneut geprüft, bevor Kontakt oder Notizen geschrieben werden.

Die CRM-Übergabe wird mit gemockter API in `qa/contact-request.test.mjs` geprüft. Browser-Tests verwenden abgefangene API-Antworten und schreiben keine echten CRM-Daten. Eine echte Anfrage erst nach Einrichtung der Kategorien und Automatisierungen mit dem Eigentümer testen.

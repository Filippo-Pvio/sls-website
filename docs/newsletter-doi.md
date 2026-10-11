# Eigener SLS-Newsletter-Ablauf

Stand: 11. Oktober 2026. Umsetzung nach ausdrücklicher Auswahl des Betreibers. Echte Abnahme ausschließlich mit dem eigenen Service-Postfach.

## Ablauf und Einwilligungsumfang

Die freiwillige Checkbox auf /downloads/ dokumentiert die Auswahl, setzt aber keine Newsletter- oder allgemeine Kontaktfreigabe. Nach eindeutiger Zuordnung des Kontakts schreibt die Website eine Notiz `SLS_NEWSLETTER_BESTAETIGUNG_AUSSTEHEND` ohne die alte Automatisierungskategorie und sendet eine eigene Bestätigungsmail über den vorhandenen Microsoft-365-Zugang. Die Ratgeber-Automatisierungen bleiben unverändert.

Die Mail enthält einen sieben Tage gültigen Bestätigungslink und einen Abmeldelink. Beide öffnen /newsletter/. GET, Vorabruf oder ein Mail-Sicherheits-Scanner aktiviert beziehungsweise widerruft nichts. Erst eine ausdrückliche Auswahl im Formular mit frischer Formularfreigabe und passender Origin führt zum POST. Für die Bestätigung muss die Newsletter-Einwilligung nochmals aktiv angekreuzt werden.

Der Server prüft den verschlüsselten, authentifizierten Link, Zweck, primäre E-Mail-Zuordnung, Kontaktbestand und die neueste Anforderung. Nur `newsletter` wird auf true beziehungsweise false gesetzt und anschließend erneut gelesen. `accept_contact`, Datenschutz-/Speicherfreigabe und Immobilienmailing-Felder bleiben unverändert. Notizen halten den genauen Einwilligungstext, die Version und den Zeitpunkt fest. Ein Abmelden widerruft auch alle noch offenen Website-Bestätigungen; ein alter Bestätigungslink kann danach keine Reaktivierung auslösen.

## Versand späterer Newsletter

Die bestätigte Einwilligung gilt ausschließlich für die beschriebenen Newsletter-E-Mails. Für eine spätere Versandliste müssen der aktuelle Newsletter-Wunsch, die passende bestätigte Einwilligung und etwaige Abmeldungen berücksichtigt werden. Kein pauschales Aktivieren allgemeiner Kontaktierung oder Immobilienmailings, um einen Filter zu umgehen. Dieser Ablauf startet keine Werbeserie und baut keinen Newsletter-Redaktionsversand.

Jede spätere Marketing-Mail braucht einen funktionierenden individuellen Abmeldelink. Der eigene Link wird in der Bestätigungsmail bereits mitgeliefert; das Propstack-Standard-Abmelden bleibt ergänzend verwendbar, sofern es den Newsletter-Wunsch zuverlässig ausschaltet. Die vorab dokumentierte Vorlage mit `kontakt_profil_button` wird von der neuen Website nicht mehr ausgelöst. Die bestehende CRM-Automatisierung wurde nicht für andere Kontakte geändert.

## Technische Grenzen und Betrieb

- Persönliche Links tragen verschlüsselte, authentifizierte Zuordnungen im URL-Fragment. Keine E-Mail-Adresse oder Kontakt-ID im Klartext; das Fragment wird beim Öffnen entfernt und der Link ausschließlich im POST-Inhalt verarbeitet. Keine Tokens in Git, Logs oder Screenshots veröffentlichen. Die Seite und API sind noindex und no-store.
- Redis enthält nur HMAC-Kennungen und neutrale Bearbeitungszustände. Anforderungs-/Bestätigungs-/Widerrufsmarkierungen sieben Tage; gegenseitige Kontaktsperre höchstens zehn Minuten. CRM-Notizen und Postfachkopien folgen der organisatorischen Bestandsprüfung. Kein neuer Dienst und keine zusätzlichen Kontorechte eingerichtet.
- Verschlüsselung nutzt `NEWSLETTER_TOKEN_SECRET`, falls vorhanden, sonst den bereits vorhandenen Redis-REST-Schlüssel mit separater Schlüsselableitung. Keine Schlüsselrotation im Rahmen dieser Arbeit. Eine spätere Rotation muss die Gültigkeit bereits versandter Abmeldelinks berücksichtigen; Kontakt über service@sls.de bleibt verfügbar. Abmeldetokens verfallen nicht nach sieben Tagen.
- Ein unklarer Schreib-/Versandabschluss wird als Prüfbedarf ausgegeben. Keine automatische Wiederholung von Bestätigungsmails oder unsicher bestätigten CRM-Änderungen. Eine bestätigte Identität muss vor jeder Änderung weiter zur primären E-Mail des Kontakts passen; archivierte/gelöschte Kontakte werden nicht aktiviert.
- Zeitgleiche Bestätigung und Abmeldung werden pro Kontakt serialisiert. Bei laufender Änderung fordert das Formular zum späteren Wiederholen auf. Eine abgelaufene oder ersetzte Bestätigung erfordert eine neue ausdrückliche Anmeldung.

## Abnahme

Automatisierte Prüfungen decken fehlende Konfiguration, Doppelversand, Manipulation, falschen Zweck, sieben Tage Ablauf, wechselnde Kontaktidentität, Abmeldung vor/nach Bestätigung, veraltete Bestätigungen, konkurrierende Aktionen und unklare API-Antworten ab. Der tatsächliche Postfach-/CRM-Test ist gesondert zu protokollieren und darf erst nach sichtbarer Bestätigung und Abmeldung als bestanden gelten.

Anbietergrundlage: [Propstack-Kontaktfelder](https://docs.propstack.de/reference/kontakte) und [Propstack-Newsletter-Anleitung](https://docs.propstack.de/webseite/newsletter-anmeldung). Der Standard-Aktivierungslink aktiviert mehrere Freigaben; deshalb wird er für diese engere Einwilligung nicht verwendet.

# SLS: Aufbewahrung, Prüfung und Löschung

Stand: 7. Oktober 2026. Verantwortlicher für die Entscheidungen: Filippo Livera, gemäß seiner Zuständigkeitsbestätigung. Der endgültige Onlinegang bleibt zurückgestellt.

## Technisch vorbereitete Browserfrist

Der freiwillig gespeicherte Verkaufscheck-Fortschritt erhält eine Frist von 30 Tagen ab letzter tatsächlicher Speicherung. Bloßes Lesen verlängert sie nicht. Nach Ablauf wird er nicht wiederhergestellt und beim nächsten Aufruf des Checks entfernt. Ohne Website-Aufruf kann der Eintrag technisch länger im Browser liegen; eine Hintergrundlöschung auf geschlossenen oder ausgeschalteten Geräten wird nicht behauptet. Nutzer können jederzeit selbst löschen. Nur der Check-Schlüssel wird entfernt, keine anderen Website-Daten.

Vorhandene valide Stände ohne Zeitstempel bleiben erhalten. Beim ersten Aufruf nach der Umstellung startet einmalig eine 30-Tage-Frist; unbekanntes Alter wird nicht erfunden. Gespeichert werden nur validierte Checkantworten, keine Kontaktangaben. Die Änderung benötigt die konkrete Freigabe für diese Frist und die bestehende Arbeitswebsite vor ihrer Veröffentlichung.

## Vorschlag für die SLS-Bestandsprüfung

Die folgenden Fristen sind organisatorische Vorschläge zur Prüfung, keine gesetzlich vorgegebenen Löschfristen und keine bereits eingerichteten automatischen Löschregeln. Abgelaufene Zwecke werden nicht allein wegen eines turnusmäßigen Termins weiter gespeichert; eine Löschanfrage wird unabhängig von der Prüfliste bearbeitet.

| Bestand | Anlass und vorgeschlagener Prüfpunkt | Entscheidung vor Löschung |
| --- | --- | --- |
| Einmalige Kontakt-/Ratgeberanfrage ohne Folgegeschäft | Nach dokumentiertem Abschluss in die nächste monatliche Prüfung aufnehmen; spätestens nach 6 Monaten ohne begründeten weiteren Zweck erneut kontrollieren | Ist die Anfrage tatsächlich abgeschlossen? Besteht ein anderer Zweck, Vertrag, Anspruch, bestätigte Einwilligung oder eine Aufbewahrungspflicht? Reicht die Entfernung der betreffenden Notiz statt des gesamten Kontakts? |
| Inaktiver oder erledigter Suchauftrag | In der nächsten monatlichen Prüfung, spätestens 90 Tage nach dokumentiertem Ende | Deaktivierung ist keine Löschung. Profil gezielt beurteilen; gemeinsame Kontaktakte nicht pauschal löschen. Aktive Aufträge ausnehmen. |
| Reine automatische Verkaufsanalyse/PDF ohne Folgegeschäft | Gesendete Kopie nach 90 Tagen zur Prüfung vorlegen | Klären, ob Geschäftsbrief, Bestandteil eines Kundenfalls oder sonstiger erforderlicher Nachweis. Erst dann gezielt löschen oder getrennt geschützt archivieren. Empfängerkopie liegt außerhalb der SLS-Löschkontrolle. |
| Abgelaufene Bestätigungscode-Mail | Gesendete Kopie nach 30 Tagen zur Prüfung vorlegen | Code selbst gilt nur 10 Minuten. Ausnahmen für offene Zustellprobleme oder Nachweiszwecke dokumentieren; keinen gesamten Mailthread anhand eines Betreffs löschen. |
| Betriebslogs | Tatsächliche Providerfrist je Dienst dokumentieren; bei freiwilligen Zusatzlogs maximal 30 Tage als Ziel prüfen | Vorfallbezug und rechtliche Notwendigkeit separat beurteilen. Keine neue kostenpflichtige Logspeicherung allein zum Erreichen dieser Frist. Pseudonymisierte Kennungen sind keine anonymen Daten. |
| Backups und weitere Kopien | Vor dem Onlinegang für jeden Anbieter Zyklus, Restore-Verfahren und Löschzuständigkeit festhalten | Nicht blind Sicherungen löschen. Bei Wiederherstellung abgeschlossene Löschungen erneut anwenden; Sicherungskopien nicht wieder als aktive Kundendaten verwenden. |

Für laufende Kunden-/Vertragsakten gibt es in diesem Konzept keine pauschale automatische CRM-Löschung. Das heißt nicht unbegrenzte Aufbewahrung: Zweck, Abschluss und gegebenenfalls gesetzliche Pflicht müssen pro Datenkategorie dokumentiert sein. Newsletter-Widerruf stoppt Werbung; erforderliche Nachweise oder eine Sperrinformation können einen getrennten, beschränkten Zweck haben.

## Monatlicher Ablauf für Filippo Livera

1. In Propstack ausschließlich dokumentiert abgeschlossene Website-Anfragen und inaktive Suchprofile zur Prüfung auswählen. Fehlende Abschlussdaten als Klärungsfall behandeln; Datum der letzten Aktivität ist kein sicherer Abschlussnachweis. Keine vollständige CRM-Liste exportieren.
2. Im Versandpostfach ausschließlich identifizierte Verkaufscheck-/Bestätigungsmails sichten. Absender, Zeit, Nachricht und Anhang abgleichen; Betreff allein ist keine Löschfreigabe. Die Website-App erhält dafür keine neuen Mail.Read-/Löschrechte.
3. Pro Vorgang prüfen: laufende Beziehung, anderer Verarbeitungszweck, gesetzliche Archivpflicht, offener Anspruch/Streit, Einwilligungsnachweis oder Löschanfrage. Bei unklarer Einordnung keine automatische Löschung; konkreten Klärungsgrund und zeitnahen Prüftermin festhalten.
4. Nur den tatsächlich entfallenen Bestand entfernen. Bei mehreren Zwecken relevante Unterlagen gesondert geschützt aufbewahren und den operativen Zugriff auf entbehrliche Daten beenden. Andere Kontaktaktivitäten, Verträge oder Suchprofile nicht mitlöschen.
5. Löschung in aktiven Systemen und weiteren SLS-Kopien kontrollieren: CRM, Microsoft, gegebenenfalls IONOS/Propstack-Mail, lokale Downloads und Weiterleitungen. Anbieterfristen für Papierkorb/Backups festhalten. Endgültiges Leeren nur mit konkreter Freigabe des betroffenen Bestands.
6. Einen knappen Nachweis in einer zugriffsbeschränkten SLS-Ablage festhalten: Datenkategorie, Zweckende, angewendete Regel, Ausnahmegrund, Entscheidung, Datum, Verantwortlicher und betroffene Systeme. Keine Namen, Mailadressen, Kontakt-IDs oder PDF-Inhalte in Git, Website-Dateien oder öffentlichen Logs ablegen.

Der Ablauf ist hier dokumentiert, kein bereits laufender geplanter Löschjob. Zur automatischen CRM-/Mail-Löschung fehlen noch bestätigte Regeln sowie verlässliche Abschluss-/Ausnahmekennzeichen. Ein Altersfilter allein wird nicht als Löschentscheidung eingesetzt.

## Nachweisvorlage ohne Kundendaten

| Datenkategorie | Zweckende dokumentiert | Regel / Prüfpunkt | Entscheidung und gegebenenfalls Ausnahme | Nächste Prüfung | Zuständig | Systembereinigung geprüft |
| --- | --- | --- | --- | --- | --- | --- |
| Ausfüllen in geschützter SLS-Ablage | Datum | Regelbezeichnung | löschen / zweckgebunden aufbewahren / klären | Datum | Name | betroffene Systeme und Datum |

## Grenzen und Quellen

Die Speicherung muss sich am erforderlichen Zweck orientieren; Löschung und gesetzliche Aufbewahrung sind zusammen zu beurteilen. [DSGVO, insbesondere Art. 5 und 17](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32016R0679).

Empfangene und abgesandte Handelsbriefe können sechs Jahre aufzubewahren sein, grundsätzlich ab Schluss des maßgeblichen Kalenderjahres. Andere Kategorien haben andere Fristen. Daraus folgt keine pauschale Sechsjahresfrist für jeden Websitekontakt und keine pauschale 90-Tage-Löschung für jede PDF-Mail. [§ 257 HGB](https://www.gesetze-im-internet.de/hgb/__257.html), [§ 147 AO](https://www.gesetze-im-internet.de/ao_1977/__147.html). Die Einordnung der SLS-Unterlagen und weitere einschlägige Pflichten sind mit dem tatsächlichen Geschäftsprozess abzugleichen.

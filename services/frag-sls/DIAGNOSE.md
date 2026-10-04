# Diagnose 1.4.0

Die bisherigen Schwächen lagen in der inhaltlichen Prüfung: Eine gültige Quellen-ID bewies nicht, dass ein Satz aus der Quelle folgt. Ein allgemeiner Prompt verhinderte weder falsche Aussagen zum Notaranderkonto noch unzulässige Erweiterungen von SLS-Leistungen.

Neu: Fachquellen mit Prüftermin, strikte Trennung der Quellenarten, eigener Modellaufruf für inhaltlichen Quellenabgleich, vollständige Prüfung aller Absatzindizes, Zurückhalten des Entwurfs bei jeder negativen oder unvollständigen Bewertung. Bei Ausfall keine Ausgabe eines ungeprüften Entwurfs. Keine erneute Generierungsschleife.

Offene Grenze: Modellprüfer kann falsche Antworten übersehen. Echte Modelltests nach Deployment stehen aus. Bestehendes Modell unverändert, keine neuen Zugangsdaten erforderlich. Kontingent-/Authentifizierungsfehler können weiterhin Fallbacks auslösen. Logs enthalten nur Fehlerkategorie und ggf. HTTP-Status, keine Fragen, Entwürfe, Schlüssel oder Rohfehler.

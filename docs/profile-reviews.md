# Persönliche Profilbewertungen – aktueller Stand

Auf Filippos Profil steht ausschließlich die persönliche Google-Kundenstimme von
Bettina Alzner, die auf der bisherigen SLS-Website mit fünf Sternen veröffentlicht
und direkt zur Google-Bewertung verlinkt ist. Der unveränderte Auszug umfasst 24
Wörter; weitere Kürzung ist durch Auslassungszeichen markiert. Es wird kein Datum
erfunden. Die Unternehmensbewertung und der Gesamtdurchschnitt sind entfernt.

Quelle: https://sls.de/immobilienmakler-duesseldorf/
Original: https://maps.app.goo.gl/iAwqDabn7UrioGfdA

Der redaktionell übernommene Auszug ist aktuell keine Live-Synchronisierung.
Der vollständige automatische Google-Abruf benötigt weiterhin OAuth-Zugang zum
Google-Unternehmensprofil. Bei freigegebenen Live-Daten wird der Auszug ersetzt.

Das Videocover kommt über /api/youtube-thumbnail direkt vom im YouTube-Metadatum
og:image hinterlegten maxresdefault-Bild, mit YouTubes hqdefault als Rückfall nur
bei nicht vorhandener maximaler Auflösung. Keine anderen Szenen als Ersatzbilder.

## Vollständige Google-Bewertungsliste

Die vorhandene Places-Anbindung liefert maximal fünf Bewertungen. Sie ermöglicht
keine vollständige Suche nach Mitarbeiternamen. Dafür ist die Google Business
Profile API mit freigeschaltetem Google-Cloud-Projekt und OAuth-Verbindung zum
verwalteten SLS-Unternehmensprofil notwendig.

Der serverseitige Abruf mit Pagination ist in lib/google-profile-reviews.mjs
vorbereitet. Folgende Werte müssen über die geschützten Vercel-Einstellungen
konfiguriert werden; keine Geheimnisse im Repository oder Browser hinterlegen:

- GOOGLE_BUSINESS_CLIENT_ID
- GOOGLE_BUSINESS_CLIENT_SECRET
- GOOGLE_BUSINESS_REFRESH_TOKEN (OAuth scope: https://www.googleapis.com/auth/business.manage)
- GOOGLE_BUSINESS_LOCATION (accounts/<Kontonummer>/locations/<Standortnummer>)

Die bestehende GOOGLE_PLACES_API_KEY-Anbindung liefert weiterhin den öffentlichen
Google-Link. /api/profile-reviews?profile=filippo-livera meldet den Anschlussstatus,
ohne Zugangsdaten oder nicht freigegebene Bewertungstexte auszugeben.

## Persönliche Zuordnung

config/profile-reviews.mjs enthält Name, eindeutige Namensvarianten und die
freigegebene Review-ID bzw. den Places-Review-Link. Nach einmaliger inhaltlicher
Prüfung approvedReviewId (Business Profile) oder approvedReviewUri (Places)
setzen. Die Live-Anbindung liest ausschließlich die jeweils verifizierte Bewertung.
Die fünf Places-Ergebnisse sind keine vollständige Liste. Ein dort nicht mehr
enthaltener Treffer beweist deshalb keine Löschung. Der geprüfte statische
Auszug bleibt erhalten, bis er redaktionell aktualisiert oder entfernt wird.
Mehrdeutige Zuordnungen zuerst prüfen. Die Zahl und der Durchschnitt bleiben immer
als Unternehmensbewertung gekennzeichnet, nicht als Mitarbeiterdurchschnitt.

## Weitere Videos

Eine .profile-video-card innerhalb [data-video-track] mit echtem Video, lokalem
Vorschaubild, data-video-id und data-video-title ergänzen. Bei mindestens zwei
Videos erscheinen Navigation und Positionsanzeige; mobil lässt sich die Galerie
wischen. Keine leeren oder doppelten Videokarten ergänzen. Der Player wird erst
beim Klick geladen; der ursprüngliche YouTube-Link funktioniert ohne JavaScript.

## Leitsatz

Der Satz stammt wortgetreu aus dem von Filippo gelieferten STILPUNKTE-Interview:
https://www.stilpunkte.de/experteninterviews/ki-immobilienbewertung-wie-digitale-tools-den-immobilienverkauf-verbessern-interview-mit-filippo-livera/

## Teamprofile (03.10.2026)

Alle 21 Profile sind im serverseitigen Register angelegt. Für 13 weitere Personen
liegen verifizierte Auszüge in content/team/reviews.json vor. Quelle ist der
öffentliche Google-Review-Widget auf sls.de bzw. der bestehende Places-Abruf.
Jeder Datensatz enthält Namensbezug, tatsächliche Sterne, Autor, Datum, direkte
Google-Verlinkung, Quellseite und Prüfdatum. Kein Auszug enthält mehr als 25 Wörter.

Die 14 sichtbaren Kundenstimmen betreffen Filippo, Dennis, Mischa, Andreas, Cüneyt,
Tanja, Daniel, Maximilian, Dustin, Heiko, Manuela, Gina und Jacqueline und Uwe.
Für Nico, Kristina, Svea, Daniela, Sophia, Arne und Samy konnte im geprüften
Material kein eindeutiger Treffer verifiziert werden. Ihre Sektion bleibt verborgen
und erscheint nur, wenn eine passende, geprüfte persönliche Bewertung vorliegt.
Keine allgemeine Firmenbewertung als persönliche Stimme einsetzen.

Nach Änderungen an reviews.json: python scripts/build-team-profiles.py ausführen.
Filippos separat gepflegtes Referenzprofil wird dabei nicht überschrieben.
Autorenname und Mitarbeitername werden getrennt behandelt: Gina K. als Autorin
einer Offermann-Bewertung ist kein Bezug zur Mitarbeiterin Gina Künnecke.

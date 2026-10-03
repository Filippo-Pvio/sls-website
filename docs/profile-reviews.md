# Mitarbeiterprofile: Google-Bewertungen und Videos

Die Musterseite ist /team/filippo-livera/. Auf dieser Seite wird die vorhandene
Google-Gesamtbewertung live geladen und ausdrücklich als Unternehmensbewertung
gekennzeichnet. Ohne bestätigte persönliche Bewertung erscheint kein persönliches
Kundenzitat. Bei Ausfällen bleibt die gesamte optionale Bewertungssektion verborgen.

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
setzen. Keine Bewertungstexte kopieren oder fest ins Repository speichern.
Die Bewertung wird bei Besuch neu von Google gelesen. Entfernte Bewertungen und
Bewertungen ohne weiterhin passenden Namensbezug werden nicht angezeigt.
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

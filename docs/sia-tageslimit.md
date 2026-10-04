# SIA-Tageslimit

## Aktivierung

In Vercel für das Projekt `sls-website` unter Storage eine Upstash-Redis-Datenbank verbinden (Production und Preview). Die Verbindung muss folgende serverseitige Variablen bereitstellen:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN` (Schreibzugriff)

Alternativ werden `KV_REST_API_URL` und `KV_REST_API_TOKEN` unterstützt. Danach neu deployen. Keine Zugangsdaten in den Browser oder ins Repository kopieren.

Solange beide Variablen fehlen, bleibt das bisherige Verhalten ohne Tageslimit bestehen. Bei konfiguriertem, aber nicht erreichbarem Zähler werden keine neuen KI-Anfragen gestartet.

## Verhalten

- Zehn erfolgreiche Antworten pro anonymem Browser und Kalendertag in Europe/Berlin. Sommer-/Winterzeit berücksichtigt.
- Belegte Wissensbasis-Antworten zählen ebenfalls; technische Fehler und unbeantwortete Fragen ohne Quellen zählen nicht.
- Signiertes Secure/HttpOnly/SameSite-Cookie; keine Fragen oder Kontaktdaten im Zähler. Cookie wird bei Nutzung auf 24 Stunden verlängert.
- Atomare Reservierungen verhindern Überschreitungen durch parallele Anfragen. Abgebrochene Reservierungen verfallen nach 90 Sekunden.
- Ab drei verbleibenden Antworten dezenter Hinweis; nach Ausschöpfen verständliche Meldung und bestehender Teamkontakt.
- Missbrauchsschutz: 60 Versuche pro Browser / 10 Minuten, 1000 Versuche pro Netzwerk / 10 Minuten. Netzwerkadresse nur als HMAC-Schlüssel, keine Speicherung der Klartextadresse im Zähler.
- Ohne Anmeldung bleibt dies eine Browserbegrenzung: Cookie-Löschen, andere Browser oder Geräte ermöglichen einen neuen Zähler. Keine Personenidentifizierung oder Fingerprinting.
- Das Limit schützt `/api/sia-ask` auf dieser Website. Der separate öffentliche SLS-Fragedienst benötigt bei Bedarf einen eigenen Zugriffsschutz.

## Prüfungen nach Verbindung

Zehn erfolgreiche Antworten mit demselben Cookie senden: die elfte Anfrage muss HTTP 429 mit `code: daily_limit` liefern und darf den Fragedienst nicht aufrufen. Fehler dürfen `remaining` nicht verringern. Zweiter Browser muss unabhängig zählen. Wiederholung nach Deployment muss denselben Tageszähler verwenden.

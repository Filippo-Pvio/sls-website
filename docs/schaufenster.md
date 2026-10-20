# SLS Schaufenster / iiSignage²

Fester Produktionslink: `https://sls.de/schaufenster/` (nach Veröffentlichung).

In iiSignage² ein Programm im Querformat 16:9 erstellen, den Link als Webinhalt über die gesamte Fläche einfügen, dem Display zuweisen und den gewünschten täglichen Zeitplan veröffentlichen. Der Immobilienwechsel läuft innerhalb der Webseite: keine separate Folie je Objekt anlegen. Wenn iiSignage² eine Dauer pro Webinhalt verlangt, eine lange Dauer wählen; kurze Playlist-Schleifen würden die Seite laufend neu starten. Auf dem tatsächlichen Display die vollständige Liste, Lesbarkeit und Fortsetzung nach Neustart/Netzunterbrechung prüfen. Browser-/Player-Version und Firmware sind noch unbekannt.

- Alle öffentlich freigegebenen Kaufangebote exakt aus dem bestehenden Websitekatalog: `/api/propstack-properties/?display=1`. Der Modus nutzt dieselbe Status-, Archiv- und Feldfilterung sowie denselben serverseitigen Lesezugang. Kein neuer API-Schlüssel erforderlich.
- 20 Sekunden je Immobilie, bis zu drei öffentliche Fotos. Höher aufgelöste Bilder aus dem bestehenden Detailendpunkt; nie private Bilder oder Grundrisse. Fehlende Bilder ergeben eine neutrale SLS-Fläche, keine fremden Beispielimmobilien.
- Vollständiger Datenabgleich alle fünf Minuten. Serverkatalog maximal 60 Sekunden im Arbeitsspeicher, Endpunkt maximal 60 Sekunden im CDN. Änderungen werden beim nächsten erfolgreichen Abruf wirksam. Entfernte Objekte verschwinden auch bei Detailantwort 404/410 unmittelbar.
- Bei Datenfehlern läuft die zuletzt bestätigte Auswahl bis maximal 30 Minuten ab letztem erfolgreichen Abgleich weiter. Danach neutrale SLS-Kontaktanzeige. Automatische Start-/Ausfallwiederholung alle 30 Sekunden, außerdem bei Netzrückkehr und Wiederaufnahme des Players. Kein Angebot wird dauerhaft offline gespeichert.
- Nur aktuelle und folgende Objektdetails im begrenzten Arbeitsspeicher. Keine Interaktion, Werbung, Analyse, Formulare, Cookies oder lokalen Speicher erforderlich. Die dafür markierte Schaufensterseite wird von der automatischen Consent-/Tracking-Einfügung ausgenommen.
- Einbettung der öffentlichen Schaufensterseite in HTTPS-Oberflächen ist erlaubt (`frame-ancestors https:`), damit der Signage-Player sie darstellen kann. X-Frame-Options und bisherige CSP bleiben auf allen anderen Websitepfaden unverändert. Keine Freigabe von CRM-Oberflächen oder privaten Daten.

Validierung: bestehende Katalog-/Datenschutztests plus Browserprüfungen für Rotation, vollständige Auswahl, Aktualisierung/Entfernung, leere Auswahl, Datenstörung und Wiederaufnahme. Ein bestandener Browserlauf ersetzt keinen Dauertest auf dem iiyama-Gerät.

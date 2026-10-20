# SLS Schaufenster / iiSignage²

Fester Produktionslink: `https://sls.de/schaufenster/` (nach Veröffentlichung).

Angebotsansicht: 63 % freie Fotofläche links, 37 % cremefarbene Informationsspalte rechts. Preis, Eckdaten und QR-Code liegen vollständig in der Spalte; kein dunkler Verlauf über den Objektfotos. Schriftgrößen berücksichtigen Bildschirmbreite und -höhe. Eigenes, auf `.property-display` begrenztes Stylesheet `assets/schaufenster-angebote.css`; die Angebotsansicht wird auch im Gesamtprogramm verwendet.

In iiSignage² ein Programm im Querformat 16:9 erstellen, den Link als Webinhalt über die gesamte Fläche einfügen, dem Display zuweisen und den gewünschten täglichen Zeitplan veröffentlichen. Der Immobilienwechsel läuft innerhalb der Webseite: keine separate Folie je Objekt anlegen. Wenn iiSignage² eine Dauer pro Webinhalt verlangt, eine lange Dauer wählen; kurze Playlist-Schleifen würden die Seite laufend neu starten. Auf dem tatsächlichen Display die vollständige Liste, Lesbarkeit und Fortsetzung nach Neustart/Netzunterbrechung prüfen. Browser-/Player-Version und Firmware sind noch unbekannt.

- Alle öffentlich freigegebenen Kaufangebote exakt aus dem bestehenden Websitekatalog: `/api/propstack-properties/?display=1`. Der Modus nutzt dieselbe Status-, Archiv- und Feldfilterung sowie denselben serverseitigen Lesezugang. Kein neuer API-Schlüssel erforderlich.
- 20 Sekunden je Immobilie, bis zu drei öffentliche Fotos. Höher aufgelöste Bilder aus dem bestehenden Detailendpunkt; nie private Bilder oder Grundrisse. Fehlende Bilder ergeben eine neutrale SLS-Fläche, keine fremden Beispielimmobilien.
- Vollständiger Datenabgleich alle fünf Minuten. Serverkatalog maximal 60 Sekunden im Arbeitsspeicher, Endpunkt maximal 60 Sekunden im CDN. Änderungen werden beim nächsten erfolgreichen Abruf wirksam. Entfernte Objekte verschwinden auch bei Detailantwort 404/410 unmittelbar.
- Bei Datenfehlern läuft die zuletzt bestätigte Auswahl bis maximal 30 Minuten ab letztem erfolgreichen Abgleich weiter. Danach neutrale SLS-Kontaktanzeige. Automatische Start-/Ausfallwiederholung alle 30 Sekunden, außerdem bei Netzrückkehr und Wiederaufnahme des Players. Kein Angebot wird dauerhaft offline gespeichert.
- Nur aktuelle und folgende Objektdetails im begrenzten Arbeitsspeicher. Keine Interaktion, Werbung, Analyse, Formulare, Cookies oder lokalen Speicher erforderlich. Die dafür markierte Schaufensterseite wird von der automatischen Consent-/Tracking-Einfügung ausgenommen.
- Einbettung der öffentlichen Schaufensterseite in HTTPS-Oberflächen ist erlaubt (`frame-ancestors https:`), damit der Signage-Player sie darstellen kann. X-Frame-Options und bisherige CSP bleiben auf allen anderen Websitepfaden unverändert. Keine Freigabe von CRM-Oberflächen oder privaten Daten.

Validierung: bestehende Katalog-/Datenschutztests plus Browserprüfungen für Rotation, vollständige Auswahl, Aktualisierung/Entfernung, leere Auswahl, Datenstörung und Wiederaufnahme. Ein bestandener Browserlauf ersetzt keinen Dauertest auf dem iiyama-Gerät.

## QR-Code zum Exposé

Die obere Logo-/Navigationsleiste entfällt. Rechts unten steht für jede Immobilie ein eigener schwarz-weißer QR-Code mit vier Modulen weißem Rand. Er enthält `https://sls.de/immobilien/?objekt=<ID>`; die bestehende Website leitet diese stabile Objektadresse auf das aktuelle Exposé weiter. Der Code wird synchron mit dem Angebot gewechselt und bei leerem oder veraltetem Datenbestand vollständig ausgeblendet.

Lokale Erzeugung mit `assets/vendor/qrcode-generator-1.4.4.js` (Kazuhiko Arase, MIT; Lizenz daneben), Fehlerkorrektur Q. Quelle: offizielles npm-Paket `qrcode-generator@1.4.4`. Kein QR-Dienst, Drittanbieterabruf oder Tracking. Automatischer Test: `node --test qa/schaufenster-qr.test.mjs`. Scannbarkeit durch die reale Schaufensterscheibe weiterhin am Gerät prüfen.

## Zufällige Reihenfolge

Beim Start wird die gesamte Auswahl zufällig gemischt. Jede Immobilie erscheint pro Durchlauf einmal. Anschließend wird neu gemischt; bei mindestens zwei Angeboten wird eine direkte Wiederholung an der Durchlaufgrenze vermieden. Der Datenabgleich erhält die laufende Reihenfolge und die bereits verstrichene Anzeigezeit. Entfernte Angebote entfallen, neue Angebote werden für den laufenden Durchlauf ergänzt und untereinander zufällig sortiert. Prüfung: `node --test qa/schaufenster-order.test.mjs qa/schaufenster-qr.test.mjs`.

## Referenz-Schaufenster

Eigener fester Link: `https://sls.de/schaufenster/referenzen/`. Gleiche Gestaltung ohne obere Leiste, 20 Sekunden je Objekt, zufällige Durchläufe, automatischer Datenabgleich und QR-Code. Die bestehende Angebotsseite bleibt unter `/schaufenster/` erreichbar.

Quelle: `/api/propstack-sold-references/?display=1`, vollständige öffentliche Referenzauswahl der Website (Status Verkauft / Erfolgreich vermarktet, Kaufobjekte, öffentliche Fotos, vorhandener Titel und Ort). Derselbe Lesezugang und dieselbe Auswahlprüfung wie bei der Referenzgalerie; keine Tagesauswahl oder manuelle Objektliste. Nur öffentliche Fotos ohne Grundrisse (bis zu drei, große Variante bevorzugt), Ort, Objekttyp und vorhandene Wohnfläche/Grundstück/Zimmer/Baujahr. Keine Kaufpreise, Verkaufspreise, Provisionen oder Kontaktdaten aus CRM-Objekten. Statt Preis wird „Erfolgreich vermittelt“ angezeigt. Nur Arbeitsspeicher-/CDN-Cache von je maximal 60 Sekunden; fehlgeschlagene Abrufe werden als Fehler zurückgegeben, ohne alte Daten als neuen Erfolg auszugeben.

QR-Ziel: `https://sls.de/referenz/objekt-<ID>/`; die bestehende Referenzroute leitet auf die aktuelle kanonische Referenzseite weiter. Referenzbilder und Eckdaten kommen mit dem vollständigen Katalog, ohne zusätzliche Detailabfragen je Folie. Prüfungen: `qa/reference-display.test.mjs`, `qa/schaufenster-order.test.mjs`, bestehende Galerie-/QR-Tests.

## Schaufenster Immobilienbewertung

Eigener fester TV-Link: `https://sls.de/schaufenster/immobilienbewertung/`. Menüfreie 16:9-Präsentation mit vier Botschaften, wechselnden bestehenden Bewertungsmotiven und 20 Sekunden Anzeigezeit je Motiv. Fortlaufender Durchlauf in inhaltlicher Reihenfolge. Bildfehler blockieren den Textwechsel nicht; nach ausgesetzter Wiedergabe wird die aktuelle Botschaft fortgesetzt.

Der lokal erzeugte QR-Code bleibt auf allen Motiven unverändert und führt zu `https://sls.de/immobilienbewertung/`. Der Bewertungsrechner wird erst dort auf dem Smartphone aufgerufen. Die TV-Seite selbst lädt keine externen Widgets, Formulare oder Trackingdienste. Textgrundlage ist die bestehende Bewertungsseite: erste digitale Wertindikation, ergänzt um die persönliche Einordnung vor Ort. Keine erfundenen Preise, Erfolgsgarantien oder Kostenversprechen.

Dateien: `schaufenster/immobilienbewertung/index.html`, `assets/schaufenster-bewertung.js`, `assets/schaufenster-bewertung.css`; gemeinsame Farben, Schriften und Grundgestaltung aus `assets/schaufenster.css`. Test: `node --test qa/schaufenster-bewertung.test.mjs`.

## Gesamtprogramm und weitere Themen

Empfohlener Link für iiSignage²: `https://sls.de/schaufenster/programm/`.

Die Mischung läuft in einer vierminütigen Schleife: aktuelle Angebote 60 Sekunden, Käuferfinder 20, Referenzen 20, Bewertung 20, Team 20, Ratgeber 20, Verkaufsablauf 20, Kundenstimmen 20, Immobilienvideos 40. Jede Seite bleibt auch einzeln erreichbar unter `/schaufenster/kaeuferfinder/`, `/team/`, `/ratgeber/`, `/verkaufsablauf/`, `/kundenstimmen/`, `/videos/` (jeweils mit Präfix `/schaufenster`).

Das Programm hält pro Thema einen begrenzten iframe im Speicher, lädt den nächsten vor und pausiert unsichtbare Inhalte. Videos werden beim Themenwechsel gestoppt und zerstört. Die Nachrichtensteuerung akzeptiert ausschließlich den eigenen gleichursprünglichen Programmrahmen. Fremde Einbettungen wie iiSignage² werden dadurch nicht pausiert. Längere Unterbrechungen und Ladefehler blockieren die Schleife nicht; ersatzweise erscheint eine SLS-Kontaktanzeige.

Die sechs Themen werden bei jedem Website-Build aus den vorhandenen veröffentlichten Teamprofilen, belegten Google-Rezensionsauszügen, Ratgeberinhalten und Immobilienvideos und Geschäftsführer-Gesprächen erzeugt (`scripts/build-signage.mjs`). Es werden nur abgeschlossene Rezensionssätze verwendet und Auszüge/Prüfdatum/Quelle gekennzeichnet. QR-Codes für Kundenstimmen führen zum passenden Teamprofil mit Originalquellenlink. Keine erfundenen Käufergesuche, Nachfragezahlen oder Kundenstimmen. Käuferfinder-QR führt zum bestehenden Nachfragecheck.

Ratgeber-QRs enthalten `?ratgeber=<Code>` und wählen den angefragten Ratgeber nur vor, wenn der bestehende Server ihn als verfügbar meldet. Kein Versand, keine Kontaktanlage und keine Formularübermittlung ohne Eingabe und Absenden durch die Person am Smartphone.

Die Videoseite enthält alle zwölf Videos der Website: sieben Instagram-Reels als lokal gespeicherte, maximal 40-sekündige H.264-Vorschauen ohne Audiospur, zwei YouTube-Roomtouren und drei Geschäftsführer-Gespräche. Die fünf YouTube-Videos werden über die offizielle IFrame-API stumm abgespielt. Die Gesprächsdaten werden mit der Videoseite geteilt (`lib/video-interviews.mjs`). Die vollständigen Filme sind jeweils über den passenden QR-Code erreichbar. Deutsche Untertitel werden angefordert, soweit das jeweilige Video diese anbietet. Bei Plattform-/Playerfehlern oder blockiertem Autoplay bleiben Titel, Original-Vorschaubild (wenn abrufbar) und QR zur vollständigen Roomtour erhalten. Die Verfügbarkeit als aktuelles Angebot wird nicht behauptet. Die Reels wurden am 20.10.2026 aus den öffentlich abrufbaren SLS-Einbettungen gesichert und für den Fernseher mit echten Einzelbild-Vorschauen optimiert. Ihre URLs unter `/assets/videos/schaufenster/` sind dauerhaft und unabhängig von ablaufenden Instagram-Adressen. Keine Instagram-Player oder extrahierten YouTube-Videodateien. Neu hinzugefügte Instagram-Reels benötigen ebenfalls eine gespeicherte TV-Datei; der Build prüft die lokalen Mediendateien. Die echte automatische Wiedergabe auf dem iiyama-Player muss am Gerät geprüft werden.

Nur die öffentliche Schaufenster-CSP erlaubt nun zusätzlich gleichursprüngliche Programmrahmen und das offizielle YouTube-API-Skript. Schutzregeln der übrigen Website bleiben unverändert. Themen laden keine Analyse-/Trackingprogramme. Die Videoseite nimmt bei aktiver Wiedergabe Verbindung zu YouTube auf.

Prüfung: `node --test qa/signage-programme.test.mjs` prüft Inhalte, Originalbelege, QR-Ziele, alle neun Programmteile über mehrere Runden, Pause/Resume, Ursprungskontrolle und Videostummschaltung/-stopp. Bestehende Angebots-, Referenz-, Bewertungs- und Datenschutzprüfungen ergänzen die Tests.

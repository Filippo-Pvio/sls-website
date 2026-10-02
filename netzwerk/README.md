# Netzwerkseite

Die sechs Profile stehen in index.html. Bei Änderungen auch die ItemList in den strukturierten Daten aktualisieren. Kategorien und Filter müssen übereinstimmen. Angaben stammen aus den verlinkten Partner-Websites; keine garantierten Einsatzgebiete oder Leistungszusagen ergänzen.

## Drei Headerfotos ergänzen

Originaldateien aufbewahren. Aus den Originalen hochwertige WebP-Varianten (z. B. Qualität 88–92) in passenden Breiten bis zur tatsächlichen Originalbreite erstellen. Nicht hochskalieren. Visuell mit dem Original vergleichen. Dateien in assets/images/netzwerk/ ablegen.

Im JSON-Element network-hero-config in index.html images mit drei Objekten füllen. Jedes Objekt hat src (lokaler /assets/ Pfad), optional srcset (responsive Varianten) und position (z. B. 50% 40%). Kein CSS-Zoom. Ohne Bilder bleibt der blaue Hintergrund; defekte Bilder werden übersprungen. Der automatische Wechsel läuft alle 6,5 Sekunden mit weicher Überblendung. Reduzierte Bewegung und Hintergrund-Tabs werden berücksichtigt.

Nach Einbau alle drei Motive auf Desktop und Mobil prüfen, passende Ausschnitte einstellen sowie den Bildwechsel testen. Anschließend og:image mit dem ausgewählten Headerbild ergänzen.

# Gemeinsame Besichtigungsvideos

Die Übersicht `/videos/` wird bei jedem öffentlichen Build mit `scripts/build-videos.mjs` erzeugt. `lib/property-tour-videos.mjs` durchsucht dazu die HTML-Seiten einschließlich Teamprofilen und Magazin. Die erzeugten Videoseiten und lokale Arbeitsdateien werden ausgeschlossen.

Neue Instagram- oder YouTube-Player werden aufgenommen, wenn ihr Titel oder Beschreibung sie als Roomtour, Rundgang oder Immobilienpräsentation erkennbar macht. Bei neutralen Titeln kann der umgebende Artikel oder Player mit `data-video-category="property-tour"` gekennzeichnet werden. Unterstützt werden die bestehenden Profilattribute `data-reel-id` und `data-video-id` sowie direkte Instagram-/YouTube-Einbettungen. Die vorhandene Playerschablone kann auf jeder Seite verwendet werden.

`property-tours.json` enthält die redaktionell geprüften Angaben der bisherigen neun Videos. Dies ist keine abgeschlossene Auswahlliste: weitere passende Player werden automatisch ergänzt. Ein Video ohne verbleibenden Player auf der Website wird entfernt. Doppelte IDs erscheinen einmal, die Angaben aus einem Teamprofil haben Vorrang. Die drei Geschäftsführer-Gespräche werden separat dargestellt und gelangen nicht ins Karussell.

`property-tours.generated.json` dokumentiert die aktuell gefundene Sammlung und ihre Quellseiten. Dieser Stand wird beim Build neu erstellt. Es findet keine automatische Überwachung der Instagram-/YouTube-Konten statt; neue Videos werden nach Einbau auf der Website bei deren nächster Veröffentlichung gesammelt.

# Interviews und Videos auf Mitarbeiterprofilen

Alle Mitarbeiterprofile laden `assets/profile-video-gallery.css` und `assets/profile-video-gallery.js`. Ohne Videos wird keine zusätzliche Fläche angezeigt.

## Interviews als eigener Abschnitt

Nach dem blauen Bereich zur persönlichen Arbeitsweise folgt, sofern vorhanden, `.profile-interview-section` als direktes Kind von `main`. Die Hintergrundfarbe zieht sich über die volle Seitenbreite; der Inhalt bleibt in `.wrap.profile-interview-layout` bündig zu den anderen Abschnitten. Der Interviewbereich ist warmhell, der folgende Videobereich weiß und die Referenzen blau.

Links stehen Name, STILPUNKTE und die H2 „Geschäftsführer im Interview.“ mit dem Thema als eigenem `span`. Rechts folgen die bestehende inhaltliche Zusammenfassung und der Link „Interview bei STILPUNKTE lesen“. Die Zusammenfassungen sind keine wörtlichen Zitate. Filippo, Mischa und Dennis verwenden dieselbe Struktur. Als Vorlage dient `team/mischa-stratmann/index.html`. Ohne redaktionelles Interview wird kein leerer Interviewabschnitt angelegt.

## Ein weiteres Video ergänzen

In `[data-profile-video-gallery] > [data-video-track]` eine weitere `.profile-video-card` ergänzen. Instagram-Karten erhalten `data-video-provider="instagram"` und am Player `data-reel-id` mit der elfstelligen Reel-ID. YouTube-Karten erhalten `data-video-provider="youtube"` und den bisherigen Vorschaubild-Link mit `data-video-id`. Jede Karte benötigt eine aussagekräftige H3 und einen Link zur Quelle; vorhandene Podcastlinks bleiben bei ihrem Video. Bei Filippo und Mischa stehen die Immobilien-Reels zuerst, das Gespräch folgt danach.

Der gemeinsame Code zählt die Karten beim Laden der Seite automatisch. Weitere Videos benötigen keine mitarbeiterbezogenen Skripte oder festen Zähler. Bei einem Video entfällt die Navigation. Ab zwei Videos erscheint ein Karussell: eine Karte steht im Vordergrund, ihre Nachbarn sind kleiner und versetzt dahinter. Pfeile, Tastatur und Wischen wechseln das vordere Video; die sichtbaren Vorschaukarten lassen sich direkt auswählen. Die Navigation läuft am Ende wieder zum Anfang. Reduzierte Bewegung wird berücksichtigt.

Instagram-Vorschauen laden beim sichtbaren Karussell direkt. Nur der vordere Player ist bedienbar. Die hinteren Player und ihre Links sind `inert` und werden von einem Auswahlbutton überlagert. Beim Wechsel wird der vorherige Player ersetzt, um seine Wiedergabe zu beenden. YouTube startet erst nach Klick auf das Vorschaubild. Verlässt die Galerie den sichtbaren Bereich, werden alle Player entfernt. Eine eigene Vorschau mit Titel und Play-Symbol überbrückt das erneute Laden eines Instagram-Embeds.

Die Bühne reserviert die Höhe der größten Karte. Videos behalten ihr ursprüngliches Format. Die Auswahl scrollt die Seite nicht; vertikale Wischgesten bleiben dem Seitenscrollen vorbehalten. Auf kleinen Bildschirmen oder Geräten mit primärer Touch-Eingabe nutzt die Galerie natives horizontales Scrollen. Dadurch wechseln auch Gesten, die direkt im externen Player beginnen, das Video. Eine feststehende Kartenebene behält die Darstellung mit Vordergrund und kleineren Vorschauen bei. Unsichtbare Scrollpunkte rasten auf jeweils einem Video ein; zwei zusätzliche Scrollpunkte erlauben den Übergang zwischen Anfang und Ende. Erst nach dem Ende einer Scrollbewegung wird der zuvor laufende Player ersetzt. Ein Timer dient als Rückfall für Browser ohne `scrollend`. Tippen auf die Steuerelemente und vertikales Seitenscrollen bleiben möglich.

## Prüfung

`QA_BROWSER_CHANNEL=chrome npm run qa -- --grep 'profile video galleries'` prüft die drei durchgehenden Interviewabschnitte, Vordergrund-/Vorschaukarten, das Stoppen vorheriger Player, Pfeile/Tastatur, mobiles Wischen auf Beschriftung und direkt im externen Player, Tippen zum Abspielen, Umlauf am Reihenende, Wischen ohne Seitensprung, vertikales Scrollen sowie ein automatisch ergänztes zweites Mitarbeitervideo. Neue Quellen anschließend auch mit den echten Playern auf Desktop und Handy prüfen.

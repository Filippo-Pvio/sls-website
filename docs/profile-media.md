# Interviews und Videos auf Mitarbeiterprofilen

Alle Mitarbeiterprofile laden die gemeinsame Darstellung in `assets/profile-video-gallery.css` und die Bedienung in `assets/profile-video-gallery.js`. Ohne Videos wird keine zusätzliche Fläche angezeigt.

## Reihenfolge

Nach dem blauen Bereich zur persönlichen Arbeitsweise folgt, sofern vorhanden, die redaktionelle STILPUNKTE-Interviewbox. Sie steht als `.profile-interview-card.profile-interview-feature` direkt in der `.wrap` des Medienbereichs. Bestehende Zusammenfassungen bleiben erhalten; neue Zitate dürfen nur aus dem verlinkten Interview übernommen werden.

Darunter stehen die Überschrift und die gemeinsame Videoreihe. Als Vorlage dient `team/mischa-stratmann/index.html`. Mitarbeiter ohne Interview erhalten nur den Videobereich; keine leere Interviewbox einsetzen.

## Ein weiteres Video ergänzen

In `[data-profile-video-gallery] > [data-video-track]` eine weitere `.profile-video-card` ergänzen. Instagram-Karten erhalten `data-video-provider="instagram"` und am Player `data-reel-id` mit der elfstelligen Reel-ID. YouTube-Karten erhalten `data-video-provider="youtube"` und den bisherigen Vorschaubild-Link mit `data-video-id`. Jede Karte benötigt eine aussagekräftige Überschrift, eine kurze Beschreibung und einen Link zur Quelle; vorhandene Podcastlinks bleiben bei ihrem Video.

Die gemeinsame Bedienung zählt die Karten beim Laden der Seite automatisch. Weitere Videos benötigen keine Änderungen am Skript oder mitarbeiterbezogene Zähler. Eine einzelne Karte hat keine Navigation; mehrere Karten erscheinen nebeneinander und sind horizontal scrollbar. Auf kleinen Handys ist ein Teil der nächsten Karte sichtbar. Pfeile und Tastatur bedienen dieselbe Reihe. Wenn alle Karten hineinpassen, werden die Pfeile ausgeblendet und die Gesamtzahl angezeigt.

Instagram lädt bei sichtbaren Karten direkt. YouTube lädt erst beim Abspielen. Verlässt eine Karte den sichtbaren Bereich, wird ihr Player entfernt und die Wiedergabe beendet. Wischgesten zum Durchblättern funktionieren auf den eigenen Kartenbeschriftungen; innerhalb fremder Player gelten deren eigene Steuerelemente.

## Prüfung

`QA_BROWSER_CHANNEL=chrome npm run qa -- --grep 'profile video galleries'` prüft Interview-Reihenfolge, Desktop/Tablet/Handy, Navigation, horizontales Wischen, normales Seitenscrollen und das Ergänzen eines zweiten Videos ohne neues Skript. Neue Quellen anschließend auch mit den echten Playern prüfen.

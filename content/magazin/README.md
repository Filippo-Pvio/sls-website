# SLS Magazin

65 redaktionell überarbeitete Beiträge behalten ihre bisherigen URLs. `articles.json` enthält Texte, Ursprungsautoren, Veröffentlichungsdaten, Überarbeitungsdatum, Themen und verwandte Beiträge. `sources.json` verwaltet die verwendeten Primärquellen. Änderungen werden mit `npm run build:magazine` als statische Seiten und Suchindex erzeugt; `npm run qa:magazine` prüft Verweise, Bilddateien, Überschriften, Canonicals und strukturierte Daten.

Die Veröffentlichung erfolgt als SLS Redaktion, mit separater Nennung der Ursprungsautoren. Historische Schlagzeilen werden nicht als aktuelle Nachrichten ausgegeben. Nicht belegte Prognosen, Renditeversprechen, politische Ergebnisse und konkrete Gerichtsbehauptungen wurden entfernt oder neutral eingeordnet. Individuelle rechtliche und finanzielle Entscheidungen benötigen weiterhin eine Prüfung im konkreten Fall.

Die Illustrationen sind redaktionelle Schemata ohne quantitative Marktdaten. SVG-Originale liegen neben den hochwertigen JPEG-Ausgaben unter assets/images/magazin. Autorenporträts stammen aus den bestehenden SLS-Profilen. Foto-Szenen verwenden vorhandene Website-Bilder.

`generated.json` dokumentiert die erzeugten Seiten. Artikel beim Entfernen nicht ersatzlos löschen: Für eine spätere Zusammenführung zunächst Weiterleitungen der bisherigen URLs planen. Die fünf Themenbereiche und ihre URLs sind im Generator definiert. Suchergebnisse werden clientseitig gefiltert; alle Artikel bleiben ohne JavaScript über statische Seiten erreichbar.

## Gestaltung und Markenbezeichnung

Alle sichtbaren Markennennungen im Magazin werden als „SLS Immobilienpartner“ ausgeschrieben. Die gemeinsame Navigation und der Footer verwenden ebenfalls die vollständige Bezeichnung. Die Übersicht nutzt das bestehende 1120px-Raster, eine integrierte Suche und offene Textkarten. Das Praxisbild und die drei vom Nutzer gelieferten Hero-Fotos bleiben erhalten; kleine Beiträge benötigen kein dekoratives Titelbild. Ab 450 Wörtern Fließtext wird ein Inhaltsverzeichnis ausgegeben. Praxisbeiträge mit Foto können zusätzlich eine Titelabbildung erhalten. Vier zentrale Ratgeber wurden um praktische Vorbereitungsschritte erweitert.

## Magazin auf der Startseite

Bei jedem Vercel-Deployment erzeugt `scripts/build-magazine.mjs` Magazin und Startseiten-Karten gemeinsam aus `articles.json`. Neue Beiträge werden nur einmal in dieser Quelle gepflegt und veröffentlicht. Ohne `status` gilt ein Beitrag als veröffentlicht; `status: "draft"` schließt ihn aus, `status: "published"` veröffentlicht ihn. Zukünftige Veröffentlichungsdaten werden erst bei einem Deployment an oder nach diesem Datum berücksichtigt. Eine bloße lokale Änderung ohne Veröffentlichung aktualisiert die Website nicht.

Die Startseite enthält die sechs neuesten veröffentlichten Beiträge aller Kategorien, sortiert nach `datePublished` (bei gleichem Datum nach ID). Überarbeitungen ändern diese Reihenfolge nicht. Der neueste Beitrag ist immer unter den drei sichtbaren Karten; zwei weitere werden zufällig aus den übrigen fünf gewählt, danach wird die Reihenfolge gemischt. `sessionStorage` hält Auswahl und Reihenfolge während eines Besuchs stabil. Ändert sich der Pool bei einer Veröffentlichung, wird die Auswahl erneuert. Ohne JavaScript erscheinen die drei neuesten Beiträge; ohne zugänglichen Browserspeicher funktioniert die Zufallsauswahl weiterhin.

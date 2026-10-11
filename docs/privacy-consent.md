# Einwilligungsverwaltung – 11. Oktober 2026

Ziel: Besucher entscheiden vor Anbieterzugriff; gespeicherte Freigaben erlauben anschließend automatisches Laden. Ablehnung oder Schließen erteilt keine Freigabe. Die endgültige Domain und der Hosterwechsel sind nicht Teil dieser Änderung.

## Bestand und technische Steuerung

| Kategorie | Dienste/Speicherung | Vor Freigabe |
| --- | --- | --- |
| Medien | Instagram, YouTube einschließlich externem Vorschaubild, ImmoScout24-/Immowelt-Badges, virtuelle Rundgänge | iframe/image src wird bereits vor HTML-Auslieferung entfernt; dynamische Frames erhalten zuerst nur eine inerte Datenadresse |
| Karten | Google Maps, OpenStreetMap, Google Maps SDK | statische/dynamische Frames gesperrt; interaktive Kartenbibliothek/SDK/Tiles starten erst nach Freigabe |
| Rechner | PriceHubble, Justhome | iframe und PriceHubble-Skript gesperrt |
| Optionale Darstellung | Magazin-/Referenzauswahl, SIA-Hinweiszustand | kein Zugriff auf sessionStorage ohne Freigabe; eigene Einträge bei Ablehnung entfernt |
| Angeforderte Funktionen/Sicherheit | Datenschutzauswahl, SIA-Quota-Cookie, ausdrücklich benutzte Favoriten, freiwillig gespeicherter Verkaufscheck | unabhängig von optionalen Kategorien; separate Zwecke und Fristen erläutert |

Lokale Fonts und Leaflet-Dateien benötigen keine Drittanbieterfreigabe. SLS-Bilder und Propstack-Objektbilder gehören zur Auslieferung der angeforderten Websiteinhalte. Es wird kein neuer Statistik-/Werbedienst eingebaut. Diese Implementierung ist kein Nachweis der Cookies aller künftigen Drittanbieter; vor neuen Einbindungen erneut inventarisieren.

Auswahl: `sls-privacy-choice-v1`, Version `2026-10-11.1`, maximal 180 Tage, boolesche Kategorien plus Zeitpunkt/Version ohne individuelle Kennung. Entscheidung bleibt im Browser, kein neuer Server-Export und keine zentrale Einwilligungsakte. Bei geänderter Textversion/abgelaufener Auswahl wird erneut gefragt. Blockierte Speicherung wirkt nur für die aktuelle Seite. Cross-Tab-Änderungen und Wiederherstellung aus dem Browser-Seitencache prüfen den Stand erneut.

Widerruf entfernt die Einbindungen und lädt die Seite neu, damit auch SDK-interne Verbindungen enden. Von fremden Domains gesetzte Cookies kann SLS nicht löschen. Alte Drittanbieter-Cookies und vor der Umstellung bestehende Verbindungen werden nicht als rückwirkend entfernt behauptet.

## Veröffentlichung und Zielhost

`lib/consent-html.mjs` läuft im öffentlichen Build und im SSR-Immobilienrenderer. Auch die lokale Vorschau verwendet dieselbe Transformation. Ein reiner MutationObserver wäre für statische iframe-src zu spät. Beim eigenen Hoster müssen der öffentliche Build und der dynamische Renderer weiterhin diese Transformation anwenden. Keine Roh-HTML-Dateien ungeprüft übertragen.

Vor Onlinegang: tatsächliche Providerbedingungen/Speichertechniken, Einwilligungstexte, Vertragsnachweise und Zielhost-Prüfung abschließen. Die technische Umsetzung ersetzt diese dienstbezogene Bewertung nicht. Bereits besprochene Propstack-Vertragsnachweise und die vollständige Datenschutzerklärung für sls.de bleiben separate Arbeiten.

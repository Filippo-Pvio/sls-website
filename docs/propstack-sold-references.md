# Verkaufte Immobilien auf der Startseite

Die blaue Startseiten-Sektion zwischen Team und Kundenstimmen lädt ihre Daten aus
`/api/propstack-sold-references`. Für Produktion wird ausschließlich der
serverseitige `PROPSTACK_API_KEY` mit Leserechten für Objekte und Objektstatus
benötigt. Ohne funktionierenden API-Zugang bleibt die Sektion verborgen.

Der Endpunkt ermittelt die Propstack-Status-IDs anhand der exakten Namen
`Verkauft` und `Erfolgreich vermarktet`. Er lädt alle entsprechenden
Kaufobjekte einschließlich archivierter Objekte, blättert durch die
vollständige Ergebnismenge und prüft den Status an jedem Datensatz erneut.
Er zeigt nur Objekte mit Stadt, Titel und mindestens einem Foto mit
`is_private: false` (keine Grundrisse). Adressen, Kaufpreise und
Kontaktdaten werden nicht ausgegeben.

Aus den geeigneten Objekten werden täglich bis zu zehn neue Referenzen
deterministisch zufällig gewählt. Innerhalb des Tages bleibt die Reihenfolge
stabil; dadurch springt das Karussell nicht bei jedem Seitenaufruf.
Falls SLS den Verkaufstatus anders benannt hat, muss der Statusname
gezielt geprüft werden. Die separate Vorschau unter `/immobilien-test/`
bleibt unabhängig.

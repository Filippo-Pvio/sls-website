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

## Teamprofile: Einkauf und Verkauf

Teamprofile zeigen bis zu drei verkaufte öffentliche Immobilien. Explizite
`custom_fields.verkaufsmakler` und `custom_fields.einkaufsmakler` werden anhand
der Propstack-Nutzer-IDs auf die veröffentlichte Teamliste zugeordnet.
Ohne expliziten Verkaufsmakler gilt der bisherige Betreuer als Rückfallzuordnung.
Verkaufsbeteiligungen haben Vorrang, Einkaufsbeteiligungen ergänzen freie Plätze.
Ein Objekt erscheint pro Profil nur einmal. Einkaufsreferenzen tragen den Hinweis
„Verkauft · Einkauf begleitet“. Fehlende Felder werden serverseitig aus Objektdetails
nachgeladen. Der öffentliche Feed gibt nur Profilkennung und Rolle aus, keine
rohen Custom-Felder, internen Notizen oder Kundendaten.
Neue Teamprofile brauchen keine gesonderte Freigabeliste im JavaScript;
der Referenzbereich wird bei vorhandenen Treffern automatisch angelegt.

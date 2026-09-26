# Verkaufte Immobilien auf der Startseite

Die Startseiten-Sektion zwischen Team und Rezensionen lädt ihre Daten ausschließlich aus
`/api/propstack-sold-references`. Ohne ausdrücklich freigegebene Datensätze bleibt sie
vollständig verborgen. Der bestehende Test unter `/immobilien-test/` wird nicht verändert.

Für das Production-Deployment sind vier Umgebungsvariablen nötig:

- `PROPSTACK_API_KEY`: serverseitiger Propstack-V1-Schlüssel mit Leserecht für Objekte und Objektstatus; niemals im Frontend.
- `PROPSTACK_REFERENCE_STATUS_ID`: numerische ID des Propstack-Status, der die abgeschlossenen Verkäufe kennzeichnet.
- `PROPSTACK_REFERENCE_STATUS_NAME`: dessen exakter Name zur Gegenprüfung.
- `PROPSTACK_REFERENCE_PROPERTY_IDS`: durch SLS einzeln zur Referenznutzung und Veröffentlichung ihrer Bilder freigegebene, kommaseparierte numerische Objekt-IDs (höchstens zehn).

Freigabe bedeutet ausdrücklich, dass die Eigentümer-/Bildrechte für diese Referenznutzung
geklärt sind. Ein Status „erfolgreich vermarktet“ allein ist keine Freigabe. Es werden nur
Kaufobjekte mit genau diesem Status und mindestens einem als öffentlich gekennzeichneten
Foto gezeigt; es werden keine Kaufpreise, Adressen oder Kontaktdaten ausgeliefert.
Der Endpunkt ist gegen Indexierung markiert, die Sektion wird erst nach einem erfolgreichen
Datenabruf eingeblendet. Nach der Konfiguration müssen Desktop, Smartphone und die
inhaltliche Zuordnung jedes Fotos vor der öffentlichen Nutzung geprüft werden.

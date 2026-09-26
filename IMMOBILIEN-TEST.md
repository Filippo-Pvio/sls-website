# Getrennte Vercel-Vorschau für SLS-Immobilien

Diese Vorschau liegt nur auf dem Branch `feat/propstack-property-preview` unter `/immobilien-test/`. Die produktiven Routen `/kaufen/`, `/immobilien/` und die Homepage bleiben unverändert. `?demo=1` zeigt die Gestaltung anhand eines öffentlich sichtbaren Beispielobjekts. Die normale URL nutzt ausschließlich die Propstack-API.

Für die **Preview-Umgebung** des Vercel-Projekts `sls-website` werden serverseitig benötigt:

- `PROPSTACK_API_KEY`: Propstack-V1-API-Schlüssel mit **Leserecht für Objekte**, nicht ins Frontend oder Git übernehmen.
- `PROPSTACK_TEST_PROPERTY_IDS`: kommagetrennte Propstack-IDs der für diesen Test einzeln freigegebenen Kaufobjekte.
- `PROPSTACK_PUBLIC_STATUS_NAME`: exakter Name eines öffentlich darstellbaren Status (für den ersten Test: `Vermarktung`). Die ID und `nonpublic: false` werden serverseitig gegen Propstack verifiziert. Bei keinem oder mehreren Treffern werden keine Objekte angezeigt.

Nur wenn alle drei Werte vorliegen, fragt `/api/propstack-test-properties` Daten ab. Andere Objekte, archivierte Objekte, Mietobjekte, nicht freigegebene Status und als privat markierte Bilder werden nicht ausgeliefert. Der Fehlerzustand fällt nicht auf Beispielobjekte zurück.

Für diese Vorschau wurde ein separater API-Schlüssel mit Objekte-Leserecht angelegt. Seine tatsächliche Funktion und die Zuordnung des Status werden erst durch den Live-Abruf bestätigt.

Anfragen, Propstack-Exposéversand, Rechtsformular und Suchprofilübermittlung sind noch nicht freigeschaltet. Ihre konkrete Zuordnung und Protokollierung wird vor der Integration mit einem Testkontakt geprüft. Ebenso bleiben URL- und SEO-Migration ein separater Prüfschritt.

Lokale Überprüfung: `node --test qa/propstack-preview.test.mjs`; Design: `/immobilien-test/?demo=1`.

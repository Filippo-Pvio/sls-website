# Getrennte Vercel-Vorschau für SLS-Immobilien

Diese Vorschau liegt nur auf dem Branch `feat/propstack-property-preview` unter `/immobilien-test/`. Die produktiven Routen `/kaufen/`, `/immobilien/` und die Homepage bleiben unverändert. `?demo=1` zeigt die Gestaltung anhand eines öffentlich sichtbaren Beispielobjekts. Die normale URL nutzt ausschließlich die Propstack-API.

Für die **Preview-Umgebung** des Vercel-Projekts `sls-website` werden serverseitig benötigt:

- `PROPSTACK_API_KEY`: Propstack-V1-API-Schlüssel mit **Leserecht für Objekte**, nicht ins Frontend oder Git übernehmen.
- `PROPSTACK_TEST_PROPERTY_IDS`: kommagetrennte Propstack-IDs der für diesen Test einzeln freigegebenen Kaufobjekte.
- `PROPSTACK_PUBLIC_STATUS_NAME`: exakter Name eines für den Test freigegebenen Status (`Vermarktung`). Die ID wird serverseitig gegen Propstack abgeglichen. `nonpublic: true` sperrt die Ausgabe; Propstack liefert für diesen SLS-Status `nonpublic: null`, weshalb der Status für das einzelne freigegebene Objekt zugelassen wird. Fehlende oder mehrdeutige Status bleiben gesperrt. Die allgemeine Freigabelogik für eine spätere Veröffentlichung muss gesondert validiert werden.

Nur wenn alle drei Werte vorliegen, fragt `/api/propstack-test-properties` Daten ab. Andere Objekte, archivierte Objekte, Mietobjekte, nicht freigegebene Status und als privat markierte Bilder werden nicht ausgeliefert. Der Fehlerzustand fällt nicht auf Beispielobjekte zurück.

Für diese Vorschau wurde ein separater API-Schlüssel mit Objekte-Leserecht angelegt. Seine tatsächliche Funktion und die Zuordnung des Status werden erst durch den Live-Abruf bestätigt.

Anfragen, Propstack-Exposéversand, Rechtsformular und Suchprofilübermittlung sind noch nicht freigeschaltet. Ihre konkrete Zuordnung und Protokollierung wird vor der Integration mit einem Testkontakt geprüft. Ebenso bleiben URL- und SEO-Migration ein separater Prüfschritt.

Lokale Überprüfung: `node --test qa/propstack-preview.test.mjs`; Design: `/immobilien-test/?demo=1`.


Deployment-Hinweis: Die Suchprofil-CTA-Position wird im Preview nach der ersten Ergebnisrunde getestet.

## Interne Datenprüfung vor dem Livegang (30.09.2026)

Auf dem aktuellen Preview-Branch `feat/propstack-property-preview-current` werden redaktionelle Prüfaufforderungen nicht mehr in der Besucheransicht ausgegeben. Diese Änderung ist keine Freigabe der Datenqualität oder der Veröffentlichung.

- Energieangaben: Bei nicht ausdrücklich als „wird nicht benötigt“ markierten Objekten Ausweistyp, Kennwert, Energieträger, Baujahr und Effizienzklasse auf Vollständigkeit prüfen. Besucher erhalten bei Lücken den neutralen Hinweis „Weitere Angaben zum Energieausweis erhalten Sie auf Anfrage“; Angebotskarten zeigen „Energieangaben auf Anfrage“.
- Baujahr: Ein aus den Objektdaten übernommenes Baujahr weiterhin mit dem Energieausweis abgleichen. Die sachliche Kennzeichnung „Baujahr laut Objektdaten“ bleibt erhalten. Beispiel aus der Preview-Prüfung: SLS 4826, Objekt-ID 4954810.
- Provision: Wenn ein Provisionssatz vorliegt, aber kein ausführlicher Provisionshinweis, den Text in Propstack ergänzen und fachlich prüfen. Vorhandene Provisionssätze und Texte werden unverändert angezeigt; fehlende Texte werden nicht erfunden.
- Grundstück SLS 10257, Objekt-ID 6158199: In der vorherigen Browserprüfung waren 900 m² Grundstücksfläche und „wird nicht benötigt“ vorhanden; keine fehlenden Energiewerte daraus ableiten.

Die Liste beschreibt die offenen Prüfkriterien und bekannte Beispiele, keinen vollständigen Audit aller Angebote. Anfrage-Statusmeldungen und die ausdrücklich aufgerufene Demo-Kennzeichnung bleiben erhalten. SEO-Prüfung und Homepage-Verknüpfung sind separate nächste Schritte.

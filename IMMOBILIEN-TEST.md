# Getrennte Vercel-Vorschau für SLS-Immobilien

Diese Vorschau liegt nur auf dem Branch `feat/propstack-property-preview` unter `/immobilien-test/`. Die produktiven Routen `/kaufen/`, `/immobilien/` und die Homepage bleiben unverändert. `?demo=1` zeigt die Gestaltung anhand eines öffentlich sichtbaren Beispielobjekts. Die normale URL nutzt ausschließlich die Propstack-API.

Für die **Preview-Umgebung** des Vercel-Projekts `sls-website` werden serverseitig benötigt:

- `PROPSTACK_API_KEY`: Propstack-V1-API-Schlüssel mit **Leserecht für Objekte**, nicht ins Frontend oder Git übernehmen.
- `PROPSTACK_TEST_PROPERTY_IDS`: kommagetrennte Propstack-IDs der für diesen Test einzeln freigegebenen Kaufobjekte.
- `PROPSTACK_PUBLIC_STATUS_IDS`: kommagetrennte numerische IDs der in SLS tatsächlich öffentlich darstellbaren Status.

Nur wenn alle drei Werte vorliegen, fragt `/api/propstack-test-properties` Daten ab. Andere Objekte, archivierte Objekte, Mietobjekte, nicht freigegebene Status und als privat markierte Bilder werden nicht ausgeliefert. Der Fehlerzustand fällt nicht auf Beispielobjekte zurück.

Der bisherige Frymo-**OpenImmo-Export** verwendet FTP/SFTP und ist kein API-Schlüssel. Falls SLS zusätzlich das Frymo-Suchprofil-Widget verwendet, kann dafür ein Propstack-Schlüssel existieren; dessen dokumentierte Rechte sind Kontakte und Suchprofile. Ob dieser Schlüssel auch **Objekte lesen** darf, ist erst nach Prüfung der tatsächlichen Rechte und einem lesenden API-Test klar. Ein separater nur lesender Schlüssel für diese Vorschau ist vorzuziehen.

Anfragen, Propstack-Exposéversand, Rechtsformular und Suchprofilübermittlung sind noch nicht freigeschaltet. Ihre konkrete Zuordnung und Protokollierung wird vor der Integration mit einem Testkontakt geprüft. Ebenso bleiben URL- und SEO-Migration ein separater Prüfschritt.

Lokale Überprüfung: `node --test qa/propstack-preview.test.mjs`; Design: `/immobilien-test/?demo=1`.

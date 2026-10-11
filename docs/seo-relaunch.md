# SEO-Relaunch: technische Umsetzung

Stand: 11. Oktober 2026. Ausgangspunkt: main 97b1e3391405f5ca549b27b7f822081d5e9abd73. Freigabe zur Umsetzung im Projektchat erteilt.

## Verhalten

- Nur der tatsächliche Host sls.de ist zur Indexierung freigegeben. Vercel-Vorschauen erhalten noindex, follow als HTTP-Header; dynamische Seiten zusätzlich als HTML-Metadatum. www.sls.de leitet dauerhaft auf sls.de weiter. Die Domain selbst wird durch diese Änderung nicht angeschlossen oder umgeschaltet.
- Der öffentliche Build erzeugt Canonicals, vollständige Navigation und einen verknüpften Schema.org-Graphen mit einer stabilen Unternehmensidentität, Website, Büros, Personen, Standorten und Leistungen. Die Gesprächsräume in Düsseldorf sind als Place modelliert. Es werden keine ungeprüften Öffnungszeiten oder Bewertungssterne ergänzt.
- Angebote, Referenzen und lokale Objektbelege stehen im ersten HTML. Pagination verwendet echte Links; gültige Folgeseiten haben eigene Canonicals. Filter-, Demo- und Favoritenansichten bleiben noindex. Falsche Objektslugs und alte objekt-Parameter leiten serverseitig weiter. Fehler liefern echte Fehlerstatuscodes statt leerer erfolgreicher Seiten.
- Referenzdetailseiten verwenden ausschließlich die bereits öffentlich freigegebene Galerieprojektion; keine privaten CRM-Daten, Preise oder aktiven Verkaufsangebote.
- Der Sitemap-Index umfasst die vollständige statische Sitemap und zwei dynamische Sitemaps für Angebote und Referenzen. Ein API-Ausfall erzeugt 503 statt einer leeren erfolgreichen Sitemap. lastmod wird nur aus belegten Änderungen übernommen.
- Sieben frühere Standort-URLs bleiben erreichbar. Lokale Seiten erhalten Kontaktwege, vorhandene öffentliche Quellen und aktuell veröffentlichte lokale Angebote und Referenzen.
- Drei vorhandene YouTube-Interviews haben eigene Video-Seiten mit verifizierten Metadaten, lokalen Vorschaubildern und Einwilligung vor dem Einbetten. Zusammenfassungen sind keine Transkripte.
- 24 bisher extern auf sls.de referenzierte öffentliche Bilder liegen unter ihren bisherigen Upload-Pfaden. Das vorhandene Impressum wurde übernommen.

## Migration

content/seo/migration-status.json dokumentiert 636 eindeutige URLs der alten öffentlichen Sitemaps: 112 erhaltene URLs, 496 dauerhafte Weiterleitungen und 28 gezielt entfernte Seiten; keine offene Zuordnung. 340 frühere Immobilien-URLs wurden über öffentliche Kennungen beziehungsweise eindeutige Titel/Orte zugeordnet. 22 weitere waren in den aktuellen öffentlichen Katalogen nicht enthalten und liefern 410. Dies behauptet keinen privaten Vermarktungsstatus. Vier numerische Ortsarchive und zwei ehemalige Danke-Seiten liefern ebenfalls 410.

Die Konfiguration enthält zusätzlich bekannte Aliasregeln. Einige frühere allgemeine Marketingartikel führen auf die thematisch nächste Leistungs- oder Presseseite. Eine Wiederherstellung ihres vollständigen Originalinhalts kann sinnvoll sein, wenn deren Suchleistung dies rechtfertigt. Die Zuordnung beruht auf dem am 11. Oktober öffentlich abrufbaren Bestand; später geänderte Veröffentlichungen müssen vor dem Relaunch erneut abgeglichen werden.

Generatoren: scripts/build-migration.mjs, build-restored-cities.mjs, build-videos.mjs und build-seo.mjs. Der vorhandene öffentliche Build integriert die drei letztgenannten. Interne Dokumentation, Konfiguration, Tests und Referenzdaten werden nicht als statische Website ausgeliefert.

## Prüfung

node --test qa/*.test.mjs: 397 Tests. Statische Seitenprüfung und Magazinprüfung zusätzlich. qa/seo-server.mjs und qa/seo-browser.cjs prüfen Desktop, Mobilgerät, Navigation, Pagination, Objekt- und Referenzdetails, lokale Belege und Video-Einwilligung einschließlich Browserbetrieb ohne JavaScript. Der lokale Prüfdienst erlaubt ausschließlich GET/HEAD und verwendet synthetische Objekte; keine echten Formulare oder CRM-Schreibzugriffe.

## Noch vor dem öffentlichen Relaunch zu erledigen

1. Vollständigen alten Upload-Bestand einschließlich PDFs sichern und unter den vorhandenen URLs verfügbar halten. Die 24 übernommenen Bilder sind kein vollständiger WordPress-Medienexport.
2. Aktuelle Unternehmens-, Impressums- und Datenschutzangaben fachlich bestätigen; die Übernahme ersetzt keine Prüfung ihrer Aktualität.
3. DNS/Domainwechsel separat durchführen, danach echte HTTP-Statuscodes, Host-Indexierung, Sitemap und Weiterleitungen auf sls.de erneut prüfen. Die Live-Indexierung auf diesem Host lässt sich erst nach dessen Anschluss abschließend prüfen.
4. Search Console und Bing Webmaster Tools mit verifizierter Eigentümerschaft prüfen, Sitemaps einreichen und alte Suchzugriffe/Backlinks gegen die Migration abgleichen. Google-Unternehmensprofile, Öffnungszeiten, Einzugsgebiete und externe Firmeneinträge mit tatsächlich betriebenen Standorten abstimmen. Diese Konten wurden nicht verändert.
5. Felddaten zu Core Web Vitals und Indexierungsberichte nach Veröffentlichung beobachten; lokale Browserprüfungen liefern keine echten CrUX- oder Rankingwerte.

## Redaktionelle und strategische Weiterarbeit

- Primärquellen bei zeitabhängigen rechtlichen, steuerlichen und finanziellen Aussagen präzise zuordnen und aktualisieren; vorhandene Texte wurden nicht pauschal als fachlich geprüft deklariert.
- Für eigene Marktberichte zuerst Zeitraum, Stichprobe, Angebots-/Abschlusspreise, Mindestfallzahlen und Veröffentlichungsregeln festlegen. Die separate Marktkarte ist durch diesen Pull Request nicht integriert oder geprüft.
- Echte Interviewtranskripte, nachvollziehbare Autoren-/Prüferangaben und lokale Fallstudien ergänzen. Keine erfundenen Transkripte, Marktstatistiken oder Bewertungen.
- IndexNow kann später mit einem verwalteten Schlüssel und sinnvoller Veröffentlichungslogik ergänzt werden. llms.txt oder spezielle FAQ-Rich-Results sind keine Voraussetzung für Indexierung oder eine zugesicherte KI-Zitation.

Die technische Umsetzung verbessert Crawlability und eindeutige Entitäten. Sie garantiert weder Rankings noch Erwähnungen in KI-Antworten.

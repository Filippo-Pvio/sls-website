# SEO-Relaunch: technische Umsetzung

## Domainvorbereitung vom 18. Oktober 2026 – ausschließlich Entwicklung/Preview

Dieser Entwicklungsstand bereitet den späteren Domainwechsel vor. Kein Merge, Produktionsdeployment, Domainanschluss, DNS-/Nameserverwechsel oder Eingriff in die alte Website ist damit freigegeben. Die Google-Hostfreigabe für sls.de und diesen Preview-Branch wird ausschließlich vorbereitet; der veröffentlichte GTM-Stand bleibt unverändert. Google Ads, Meta und E-Mail-Konfiguration werden nicht geändert. Ein vollständiges wiederherstellbares Backup der alten WordPress-Installation einschließlich Datenbank und Konfiguration liegt nicht vor. Der Nutzer hat am 18.10.2026 ausdrücklich auf dieses Backup als Voraussetzung verzichtet; die lokale Mediensicherung ist kein Ersatz dafür. Die Wiederherstellung des vollständigen alten CMS ist damit nicht zugesichert.

Die bekannten Alt-URLs werden als Vereinigung des Bestands vom 11.10. und der aktuellen öffentlichen Sitemaps erhalten: **650 URLs**, davon 112 unverändert, 501 dauerhafte Weiterleitungen und 37 entfernte Seiten. Die acht inzwischen aus Sitemaps verschwundenen URLs werden nicht aus dem historischen Inventar gelöscht. Die 14 zusätzlichen Immobilien-URLs wurden anhand identischer öffentlich sichtbarer SLS-Objektkennungen zugeordnet. Zwei identisch betitelte Ascheberg-Angebote behalten unterschiedliche Ziele (SLS 9698 / 9699). Fünf bisherige Ziele werden anhand derselben Objekt-ID unmittelbar auf ihren aktuellen Pfad aktualisiert; darunter ein inzwischen öffentliches Referenzobjekt. Neun weitere Ziele fehlen in beiden aktuellen öffentlichen Immobilien-Sitemaps und liefern 404/410. Ihre früheren URLs führen auf die bestehende informative 410-Seite, ohne einen privaten Verkaufsstatus zu behaupten. Die Entscheidungen stehen in `content/seo/relaunch-decisions.json` und werden von `scripts/build-migration.mjs` reproduzierbar angewendet. Alte Redirects dürfen die neuen 410-Regeln nicht überdecken; Prozentkodierungsvarianten werden ebenfalls aktualisiert.

### Konkrete Umschaltvorbereitung

Die fünf geplanten IONOS-Web-DNS-Operationen und der Rückfall stehen in `content/seo/cutover-preparation.json`. Die projektspezifische Vercel-Abfrage vom 18.10.2026 nennt als bevorzugte IPv4-Werte 216.150.1.1 und 216.150.16.1; laut Vercel genügt ein Wert. Vorbereitet ist der Apex-A-Eintrag 216.150.1.1 und für www der CNAME ce245609cd2655e6.vercel-dns-016.com. Die bisherigen beiden A- und AAAA-Webeinträge werden dabei ersetzt beziehungsweise entfernt. Kein neuer IPv6-Zielwert wurde geliefert. Alle übrigen 37 beobachteten DNS-Einträge und die IONOS-Nameserver bleiben erhalten. Die Werte und etwaige Eigentumsnachweise sind unmittelbar vor Ausführung erneut zu prüfen. Es wurde kein DNS-Eintrag und kein Domainanschluss verändert. Quelle: [Vercel Domain Configuration](https://vercel.com/docs/rest-api/domains/get-a-domain-s-configuration).

Die Erneuerung des TLS-Zertifikats am alten Ursprung muss nach dem DNS-Wechsel weiterhin möglich sein; allein ein heute gültiges Zertifikat sichert den späteren Betrieb nicht. Ohne den bisherigen Ursprung funktioniert die Medienbrücke nicht.

### Alte öffentliche Medienadressen

`api/legacy-media.js` erhält `/wp-content/uploads/…` als vorläufige Brücke zum bisherigen Hosting. Zugelassen sind ausschließlich **24.102 erfolgreich lokal archivierte öffentliche Bild-/PDF-Pfade** aus `content/seo/legacy-media-paths.json`. Die 53 bereits am alten Ursprung mit 404 antwortenden Dateiadressen sind nicht freigeschaltet. Die Dateipfadliste bleibt im Funktionspaket und wird nicht als statische Website veröffentlicht. Bereits vorhandene statische Dateien bleiben erhalten. Die rund 2,86 GB große lokale Sicherung wird nicht ins Repository oder Preview hochgeladen; diese Brücke ist kein Ersatz für einen dauerhaften Medienumzug oder ein WordPress-Backup.

Der serverseitige HTTPS-Leser verbindet den Host/SNI-Namen `sls.de` durch eine eigene DNS-Auflösung ausschließlich mit der dokumentierten bisherigen IPv4 `185.175.196.36`. Dadurch führt ein späterer öffentlicher DNS-Wechsel nicht zu einer Schleife zurück zur neuen Website. Die normalen CA-/Hostname-Prüfungen bleiben aktiv. Es werden ausschließlich GET-Abrufe an bekannte Upload-Pfade ausgeführt; keine Redirects verfolgt und keine Browser-Cookies, Autorisierungsheader, IP-Adressen oder Referrer an den Altserver weitergereicht. Nur GET/HEAD werden angeboten. Pfadmanipulation, andere CMS-Routen, nicht gelistete Dateien, aktive Dokumenttypen und fremde Ziele werden vor dem Zugriff abgewiesen. Antworttypen, Zeit und Größe sind begrenzt. Fehler bleiben ohne Cache, erfolgreiche Medien können im CDN zwischengespeichert werden.

**Betriebsvoraussetzung:** Altes Hosting, alte Medien und ein gültiges Zertifikat für sls.de müssen bis zu einem gesonderten dauerhaften Medienumzug weiterbestehen. Diese Abhängigkeit ist ein Punkt vor jeder Kündigung des bisherigen Hostings. Es werden keine Sicherheitsprüfungen abgeschaltet, um einen ausgefallenen Ursprung zu umgehen. Die Übergangslösung schafft weder einen neuen Speichervertrag noch eine automatische Wiederherstellung aus der nur lokal vorhandenen Sicherung.

Prüfung: 14 gezielte automatisierte Tests einschließlich bestehender SEO-/Status-/Sitemap-Prüfungen bestanden; öffentlicher Build erfolgreich. Die Migration lässt sich ohne weitere Änderungen erneut erzeugen. Echte Abrufe über den fest aufgelösten HTTPS-Ursprung lieferten ein Bild und die Broschüre mit HTTP 200; ihre SHA-256-Prüfsummen stimmen mit der lokalen Sicherung überein. Zusätzliche Preview-Abnahme wird im zugehörigen PR dokumentiert. Keine echten Formular-/CRM-Transaktionen.

Technische Primärquellen: [Node.js HTTPS](https://nodejs.org/api/https.html), [Node.js TLS](https://nodejs.org/api/tls.html), [Vercel Functions-Grenzen](https://vercel.com/docs/functions/limitations). Vor dem tatsächlichen Domainwechsel sind die projektspezifischen Vercel-DNS-Vorgaben und HTTPS-Funktion erneut abzugleichen. IONOS-Mail-, Verifizierungs- und Subdomain-Einträge sowie Domain Guard/DNSSEC bleiben in dieser Änderung unangetastet.

## Historischer Implementierungsstand vom 11. Oktober 2026

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

# Allgemeines Immobilienwissen und Dialog in SIA

## Aktivierung

Im Vercel-Projekt `sls-website` die sensitive serverseitige Variable `OPENAI_API_KEY` für Production und Preview hinterlegen. Der vorhandene Schlüssel in `frag-sls` ist sensitive und nicht auslesbar; eine Projektverbindung teilt diesen Schlüssel nicht automatisch. Einen passenden Schlüssel direkt in Vercel eintragen, niemals in Chat oder Repository. Der Schlüssel braucht Zugriff auf die Responses API und gehostete Websuche.

Danach den aktuellen `main`-Stand neu deployen. `/api/sia-config` zeigt `dialogueEnabled: true`, sobald der Schlüssel im Deployment vorhanden ist. Ohne Schlüssel bleibt der vorhandene SLS-Fragedienst aktiv und der Dialogmodus ausgeblendet.

Standardmodell ist `gpt-4.1-mini`, das der vorhandene Fragedienst ebenfalls verwendet. Optional über `SIA_OPENAI_MODEL` ändern; das gewählte Modell muss Responses API, Structured Outputs und `web_search` unterstützen.

## Verhalten

1. Frage mit bis zu drei früheren Frage-Antwort-Paaren einordnen; keine unbegrenzte Historie.
2. Allgemeine Immobilienthemen über gehostete Websuche auf freigegebenen Behörden-, Gesetzes-, Notariats- und Verbraucherquellen beantworten. Definitionen direkt erklären. Ungewöhnliche Begriffe nicht stillschweigend umdeuten.
3. SLS-Informationen weiterhin aus dem bisherigen bestätigten Fragedienst. Aktuelle bzw. rekonstruierte Fragen mit SLS-Bezug werden zwingend dorthin geschickt.
4. Wenn wesentliches Wissen über das Anliegen fehlt, eine kurze Rückfrage. Nach einer bereits markierten Rückfrage verhindert der Server eine weitere direkt aufeinander folgende Rückfrage.
5. Erfolgreiche belegte Antworten zählen zum vorhandenen Tageslimit. Klärungsfragen, themenfremde Hinweise und technische Fehler zählen nicht. Technischer Missbrauchsschutz gilt weiterhin auch für kostenlose Klärungsfragen.
6. Quellen nur aus echten URL-Annotationen der API und erlaubten HTTPS-Domains übernehmen. Inline-Zitate öffnen die interne Quellenansicht; keine ungeprüften externen Links. Diese Ansicht kennzeichnet recherchierte Quellen als Quellenhinweis, ohne zu behaupten, den vollständigen Originalartikel wiederzugeben.
7. Der Verlauf bleibt nur im Arbeitsspeicher des Widgets. „Neues Gespräch“ oder Neuladen löscht den Kontext; das Tageskontingent bleibt bestehen. API-Anfragen verwenden `store: false`; dies ist keine Zusage über sämtliche providerseitigen Aufbewahrungsfristen.

## Prüfungen

`node --test qa/sia-dialogue.test.mjs qa/sia-api.test.mjs qa/sia-widget.test.mjs qa/sia-quota.test.mjs qa/sia-general-knowledge.test.mjs`

Die API-Antworten der Dialogtests sind Fixtures, keine echten Modellaufrufe. Nach Aktivierung live prüfen: Bergbauminderverzicht (Begriffszuordnung und passende Quellen), klare Begriffsfrage ohne unnötige Rückfrage, unklare Anfrage mit genau einer Rückfrage, kurze Antwort wie „Ja“, personalisierte SLS-Nachfrage, Prompt-Injektion, Quellenanzeige, Zeitüberschreitungen und Quota vor/nach einer Klärungsfrage. Modellverhalten und Zugriff auf gehostete Suche sind erst dann verifiziert.

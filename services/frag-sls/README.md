# Zentraler SIA-Dienst · frag-dialogue-1

Dieses Verzeichnis ist das Vercel-Root-Directory des bestehenden Projekts `frag-sls`. Veröffentlichung erfolgt über `main` im vorhandenen Repository. Der bestehende serverseitige `OPENAI_API_KEY` bleibt unverändert.

Allgemeine Immobilienfragen werden mit aktuellen Quellen recherchiert. Unternehmensfragen verwenden die bestätigte Wissensbasis. Bei fehlenden Angaben ist eine kurze Rückfrage erlaubt; bis zu drei vollständige Gesprächspaare werden berücksichtigt. GET `/api/ask` liefert die Fähigkeiten für das Website-Widget. Die Website verwaltet weiterhin das Tageslimit; Rückfragen zählen nicht als beantwortete Fragen.

169 lokale Regressionstests bestehen. Echte Modellantworten müssen nach dem Deployment geprüft werden. Die folgenden Abschnitte dokumentieren den vorherigen Stand des unverändert übernommenen Unternehmensmoduls.

---

## Änderung 1.4.3
Keine Gegenfragen: Generator und Prüfer sind entsprechend angepasst. Erkannte unbelegte Rückfrageabsätze werden vor der inhaltlichen Prüfung entfernt; der verbleibende Text muss die Quellen- und Vollständigkeitsprüfung bestehen. Besteht die Antwort nur aus Fragen, erfolgt eine Ersatzantwort. Formulierungen ohne Fragezeichen werden zusätzlich auf typische Aufforderungen geprüft; die semantische Modellprüfung bleibt erforderlich. Persönlicher Abschluss bleibt bestehen. 131 lokale Tests und Browserprüfung bestanden; echte Modellantwort nach Upload prüfen.

## Änderung 1.4.2
Das automatisch gesetzte Präfix „Allgemeiner Hinweis:“ entfällt; ein solches Präfix am Beginn eines Modellabsatzes wird entfernt. Jede erfolgreiche API-Antwort und jede Ersatzantwort erhält einen redaktionellen, thematisch passenden Kontaktabschluss. Bei Fachfragen wird die zuständige Fachberatung genannt. Der doppelte Kontaktsatz im KI-Hinweiskasten entfällt; Hinweis und Kontaktlinks bleiben. Echte Modelltests nach Deployment stehen aus.

## Korrektur Wohnungssuche / Verkauf
Der pauschale Verkaufs-Fallback ist entfernt. Bei fehlendem Bezug werden keine Verkaufsleistungen ersatzweise ausgegeben. Generator und Prüfer unterscheiden praktische Planungsratschläge von belegpflichtigen Vertragsaussagen. Testfall housing-before-sale ergänzt. Echte Antwortqualität dieser Änderung nach Deployment prüfen; die offenen Befunde aus 1.4.0 sind damit nicht pauschal behoben.

# SIA – SLS Immobilien Assistenz · 1.4.2

Dieses Paket aktualisiert ausschließlich den separaten Prototyp frag-sls. Keine Änderungen an sls-website oder sls-marktkarte.

## Verhalten

1. Der Server erstellt eine kurze strukturierte Antwort. Unternehmensbehauptungen brauchen bestätigte Unternehmensquellen; rechtliche, steuerliche, vertragliche und finanzielle Aussagen brauchen Fachquellen. Praktische Tipps dürfen frei formuliert werden.
2. Der Server prüft Format, Quellenarten, Länge und einige offensichtliche Grenzverletzungen.
3. Ein zweiter OpenAI-Aufruf prüft jeden Absatz gegen seine Quellen, auf unzulässige Schlussfolgerungen und auf fehlende Teilantworten. Ein Entwurf wird erst nach einem vollständigen positiven Prüfergebnis ausgegeben.
4. Bei Ablehnung, Zeitüberschreitung oder Fehler erscheint ausschließlich eine Ersatzantwort aus passenden bestätigten Unternehmensinformationen und aktuellen Fachgrundlagen. Unbestätigte Website-Auszüge werden nicht mehr als Antwort verwendet. Fehlt eine Grundlage, wird keine fachliche Behauptung erfunden.

Die zusätzliche Modellprüfung ist KEINE Garantie für Richtigkeit, rechtliche Zulässigkeit oder Vollständigkeit. Generator und Prüfer verwenden dasselbe konfigurierte Modell und können denselben Fehler übersehen. Sie ersetzt keine fachliche Sichtprüfung. Prompt-Injection und semantische Fehler können nicht vollständig ausgeschlossen werden. Die Tests mit simulierten Antworten belegen die technische Sperre, nicht die Urteilsqualität des echten Modells.

## Quellen

Acht bestätigte Unternehmensquellen: data/approved-facts.json. Sechs redaktionell zusammengefasste Fachgrundlagen: data/expert-facts.json. Enthalten sind amtliche Gesetzestexte (§ 57 BeurkG; §§ 505a, 502, 656b–656d BGB; § 23 EStG) und notarielle Erläuterungen zur Kaufpreisabwicklung. Jede Fachgrundlage hat Originalquellen, Abgleichdatum und Prüftermin. Die Zusammenfassungen sind keine vollständige Rechtsdatenbank, nicht anwaltlich geprüft und keine Live-Recherche.

Ab 02.01.2027 werden diese Fachgrundlagen ohne erneuten Abgleich nicht mehr an das Modell übergeben oder als Ersatzantwort ausgegeben. Für die Aktualisierung zuerst Originalquellen prüfen, danach Text, Datum und Prüftermin in data/expert-facts.json ändern und `python3 scripts/build-expert-pages.py` ausführen. Nicht einfach den Prüftermin verschieben. Die Versionskopien früherer Pakete bleiben unverändert.

## Deployment

ZIP entpacken und im bestehenden Vercel-Projekt **frag-sls** hochladen. OPENAI_API_KEY bleibt ausschließlich eine serverseitige Vercel-Environment-Variable. OPENAI_MODEL optional, Standard gpt-4.1-mini. Keine Schlüssel in HTML oder Paket.

Es sind jetzt bis zu ZWEI Modellaufrufe pro Antwort nötig. Dadurch steigen API-Verbrauch und Antwortzeit. Gemeinsames Zeitbudget: 38 Sekunden; Browser: 45 Sekunden; Vercel-Funktion: 60 Sekunden. Keine automatischen kostenpflichtigen Wiederholungen. Bestehende Kontingent-/Fehler-Fallbacks bleiben erhalten.

## Tests

- `npm test`: lokale Unit-/API-Regressionen, ohne echte OpenAI-Aufrufe.
- `node test/browser.cjs`: Playwright und Chrome vorausgesetzt; Desktop, Mobilansicht, simulierte Modellantworten, Fachquellen-Link, Prüfablehnung und Fallback.
- `node scripts/eval-live.cjs --base-url https://frag-sls.vercel.app`: dreizehn feste Testfragen gegen die bereitgestellte Version. Vorher wird die Versionsnummer geprüft, damit nicht versehentlich die alte Logik getestet wird. Optional `--case escrow` für einen Fall.
- Alternativ mit lokal bereits sicher gesetztem OPENAI_API_KEY: `node scripts/eval-live.cjs`.

Echte Modelltests verursachen API-Verbrauch (bis zu 26 Modellaufrufe für dreizehn Fragen). Berichte landen in eval-results. Enthalten sind nur feste Testfragen, Antworten und Prüfsignale; keine Schlüssel. Fallback zählt nicht als erfolgreiche KI-Antwort. Automatische Wort-/Quellenchecks sind nur Hinweise. Jeder Fall muss anschließend anhand der Kriterien fachlich gelesen werden, insbesondere Negationen, Einzelbedingungen und falsche Prämissen. Ergebnis erst dann als geprüft markieren.

Die neue Version wurde lokal mit 126 Tests und Browserprüfung verifiziert. Echte Modellantworten der neuen Version sind noch NICHT geprüft, da lokal kein OpenAI-Key verfügbar ist. Nach dem Upload ist der Live-Fragenkatalog der nächste verpflichtende Prüfschritt.

API-Dokumentation: https://developers.openai.com/api/docs/guides/structured-outputs

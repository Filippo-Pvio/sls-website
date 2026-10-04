"""Build curated source snapshots; read website references without modifying them."""
from pathlib import Path
import re,html,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent/'sls-website'
DATE='2026-10-02'
def clean(s):
 s=re.sub(r'<a\b[^>]*>.*?</a>','',s,flags=re.S)
 return ' '.join(html.unescape(re.sub('<[^>]+>',' ',s)).split())
def brand(s):return re.sub(r'\bSLS\b(?! Immobilienpartner)', 'SLS Immobilienpartner',s)
def load(page):return (SOURCE/page/'index.html').read_text()
records=[]
def add(id,page,title,text,patterns,section=''):
 raw=load(page); assert text and text in clean(raw), (id,text)
 records.append(dict(id=id,title=brand(title),text=text,patterns=patterns,sourcePath=f'sls-website/{page}/index.html',pagePath=f'/{page}/',section=section or title,snapshotDate=DATE,sourceHash=hashlib.sha256(raw.encode()).hexdigest(),reviewStatus='Projektstand – fachliche Freigabe offen',url=f'/quellen/{id}.html'))
def faq(page,index,id,patterns):
 items=re.findall(r'<button class="faq-question"[^>]*>(.*?)</button>\s*<div class="faq-answer"[^>]*>\s*<p>(.*?)</p>',load(page),re.S)
 title=clean(re.sub(r'<span.*?</span>','',items[index][0],flags=re.S))
 add(id,page,title,clean(items[index][1]),patterns)
def paragraph(page,id,title,prefix,patterns):
 texts=[clean(x) for x in re.findall(r'<p\b[^>]*>(.*?)</p>',load(page),re.S)]
 text=next(x for x in texts if x.startswith(prefix))
 add(id,page,title,text,patterns)
faq('faq',1,'no-obligation',[r'entscheiden',r'verpflicht',r'beauftrag',r'muss.*verkaufen',r'auftrag'])
faq('faq',2,'pricing',[r'angebotspreis',r'preisstrategie',r'preis.*fest',r'preis.*entsteh'])
faq('faq',3,'documents',[r'unterlag',r'dokument',r'papier'])
faq('faq',4,'marketing-start',[r'vermarktung.*start',r'wann.*start',r'vorbereit'])
# Select object-dependent presentation wording instead of blanket portal promises.
faq('verkaufen',2,'marketing',[r'vermarktungsleist',r'präsent',r'prasent',r'portal',r'foto',r'drohne',r'360',r'video',r'exposé',r'expose'])
faq('faq',6,'buyer-matching',[r'interessent.*ansprech',r'sprech.*interessent',r'käufer.*such',r'kaufer.*such',r'vorgemerk',r'datenbank'])
faq('faq',8,'duration',[r'wie lange',r'dauer',r'zeitplan'])
faq('faq',9,'offer-decision',[r'angebot.*pass',r'angebot.*ablehn',r'annahme',r'entscheide.*angebot'])
faq('faq',10,'notary',[r'notar',r'kaufvertrag',r'beurkund'])
faq('faq',11,'contact',[r'kontakt',r'erreich',r'sprechen',r'beratung',r'ansprechpartner',r'telefon',r'email',r'e-mail'])
faq('verkaufen',0,'sales-process',[r'verkauf',r'verkaufen',r'ablauf',r'anfang',r'start',r'erstgespräch',r'erstgesprach'])
faq('immobilienbewertung',1,'online-accuracy',[r'genau',r'online',r'wertrahmen'])
faq('immobilienbewertung',3,'property-types',[r'welche immobil',r'gewerbe',r'grundstück',r'grundstuck',r'mehrfamilien',r'wohnung.*bewert'])
paragraph('immobilienbewertung','valuation','Bewertung vor Ort','Beim Vor-Ort-Termin betrachten',[r'bewert',r'wert',r'vor.ort',r'zustand',r'lage'])
paragraph('immobilienbewertung','comparison','Vergleichswertverfahren','Wir betrachten vergleichbare Immobilien',[r'vergleichswert',r'vergleichsobjekt'])
paragraph('immobilienbewertung','asset-value','Sachwertverfahren','Hier steht die Substanz',[r'sachwert',r'bausubstanz'])
paragraph('immobilienbewertung','income-value','Ertragswertverfahren','Bei ertragsorientierten Immobilien',[r'ertragswert',r'mieteinnahm',r'rendite'])
paragraph('immobilienbewertung','visit','Vor-Ort-Termin','Wir besprechen Ihre Ziele und betrachten',[r'modernisier',r'vor.ort',r'ausstattung'])
paragraph('immobilienbewertung','methods','Auswahl des Bewertungsverfahrens','Wir prüfen die Objektunterlagen',[r'verfahren',r'method'])
paragraph('verkaufen','first-meeting','Das erste Gespräch','Wir lernen uns kennen',[r'erstgespräch',r'erstgesprach',r'erst.*termin'])
paragraph('verkaufen','expose-approval','Freigabe des Exposés','Sie erhalten das Exposé',[r'freigabe',r'exposé',r'expose'])
paragraph('verkaufen','viewings','Besichtigungen','Wir sprechen gezielt passende Käufer an',[r'besichtig',r'einzeltermin'])
paragraph('verkaufen','negotiation','Käuferprüfung und Verhandlung','Wir prüfen Bonitäten',[r'bonität',r'bonitat',r'käuferprüf',r'kauferpruf',r'verhand'])
paragraph('verkaufen','handover','Abschluss und Übergabe','Wir bereiten den Notartermin vor',[r'übergabe',r'ubergabe',r'abschluss'])
paragraph('immobilienmakler-dorsten','dorsten','Immobilienverkauf in Dorsten','Für eine realistische Positionierung',[r'dorsten'])
paragraph('kontakt','personal-advice','Persönliche Beratung','Wir besprechen Ihre Situation',[r'persönlich',r'personlich',r'beratung'])
records.extend(json.loads((ROOT/'data/approved-facts.json').read_text()))
# Source snapshots deliberately contain no fabricated live links or local staff assignments.
(ROOT/'data/knowledge.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
for r in records:
 esc=html.escape
 references=''.join(f'<p><a href="{html.escape(u)}" target="_blank" rel="noopener">Gesetzliche Grundlage öffnen</a></p>' for u in r.get('references',[]))
 description='Vom Auftraggeber im Projektgespräch ausdrücklich bestätigt. Keine Behauptung einer bereits veröffentlichten Website-Seite.' if r.get('sourceType')=='user-confirmation' else 'Originalauszug aus dem vorhandenen Website-Projektstand. Keine Bestätigung einer live veröffentlichten oder fachlich freigegebenen Seite.'
 content=f'''<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>{esc(r['title'])} – SLS Immobilienpartner</title><style>body{{font:18px/1.7 system-ui;max-width:760px;margin:50px auto;padding:24px;color:#10233a}}blockquote{{margin:24px 0;padding:24px;background:#f1f5fa;border-left:4px solid #052d57}}small{{overflow-wrap:anywhere}}a{{color:#052d57}}</style><a href="/">← Fragen Sie Ihren SLS Immobilienpartner</a><h1>{esc(r['title'])}</h1><p>{description}</p><blockquote>{esc(r['text'])}</blockquote><p>Stand der Übernahme: {DATE}<br>Status: {esc(r['reviewStatus'])}<br>Seitenpfad im Website-Projekt: {esc(r['pagePath'])}</p><small>Ursprungsabschnitt: {esc(r['section'])}</small>{references}</html>'''
 (ROOT/'public/quellen'/f"{r['id']}.html").write_text(content)
print(f'{len(records)} belegte Quellenauszüge erstellt')

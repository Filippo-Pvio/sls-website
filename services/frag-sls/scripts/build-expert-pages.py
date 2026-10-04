from pathlib import Path
import json,html
root=Path(__file__).resolve().parent.parent
for s in json.loads((root/'data/expert-facts.json').read_text()):
    assert s['category']=='expert' and s['url']=='/quellen/'+s['id']+'.html'
    links=''.join('<li><a href="'+html.escape(r['url'],quote=True)+'" target="_blank" rel="noopener noreferrer">'+html.escape(r['title'])+'</a></li>' for r in s['references'])
    body='<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+html.escape(s['title'])+' · SIA</title><style>body{margin:0;background:#EAF0F3;color:#345B6E;font:18px/1.65 Arial,sans-serif}main{max-width:760px;margin:40px auto;padding:28px;background:white;border-radius:18px}a{color:#345B6E}small{font-size:14px}h1{font:36px/1.2 Georgia,serif}</style><main><a href="/">SIA · SLS Immobilien Assistenz</a><p>Fachgrundlage</p><h1>'+html.escape(s['title'])+'</h1><p>'+html.escape(s['text'])+'</p><h2>Originalquellen</h2><ul>'+links+'</ul><small>Redaktionelle Zusammenfassung, Quellenabgleich: '+s['snapshotDate']+'. Keine individuelle Rechts-, Steuer- oder Finanzierungsberatung und keine anwaltliche Prüfung. Prüftermin: '+s['reviewAfter']+'. Maßgeblich sind die Originalquellen und die Umstände des Einzelfalls.</small></main></html>'
    (root/'public/quellen'/f"{s['id']}.html").write_text(body)

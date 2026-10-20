import json,re
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path
from html.parser import HTMLParser
root=Path(__file__).resolve().parent.parent
pages=json.loads((root/'content/magazin/generated.json').read_text())
articles=json.loads((root/'content/magazin/articles.json').read_text())
source_articles=articles
today=datetime.now(ZoneInfo('Europe/Berlin')).date().isoformat()
articles=[a for a in articles if a.get('status','published')=='published' and a['datePublished']<=today]
errors=[]
class Check(HTMLParser):
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='h1':self.h1+=1
  for key in ('src','href'):
   u=a.get(key,'').split('#')[0].split('?')[0]
   if u.startswith('/') and not u.startswith('//'):
    p=root/u.lstrip('/')
    if u.endswith('/'):p=p/'index.html'
    if not p.exists():errors.append((self.file,u))
for entry in pages:
 s=(root/entry['path']).read_text();p=Check();p.h1=0;p.file=entry['path'];p.feed(s)
 assert p.h1==1,(p.file,p.h1)
 assert 'href="https://sls.de'+entry['url']+'"' in s,p.file
 for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s):json.loads(block)
assert len(articles)>=65
assert len({a['slug'] for a in source_articles})==len(source_articles)
assert all((root/a['slug']/'index.html').exists() for a in articles)
assert len(json.loads((root/'assets/magazine-search.json').read_text()))==len(articles)
assert not errors,errors
print(f'PASS: {len(pages)} pages, {len(articles)} published article routes, internal links, images, H1, canonical URLs and structured data')
for entry in pages:
 text=(root/entry['path']).read_text()
 assert not re.search(r'\bSLS\b(?! Immobilienpartner)',text),entry['path']
print('PASS: full brand name on all magazine pages')

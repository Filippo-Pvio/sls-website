from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,parse_qs
import json,re
ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self):super().__init__();self.tags=[]
 def handle_starttag(self,t,a):self.tags.append((t,dict(a)))
cities=json.loads((ROOT/'content/marktgebiete/cities.json').read_text())
for city in cities:
 s=(ROOT/city['url'].strip('/')/'index.html').read_text();p=Page();p.feed(s)
 assert sum(t=='h1' for t,a in p.tags)==1,city['city']
 assert s.count('data-city-properties="'+city['city']+'"')==2
 assert 'city-source' not in s and 'city-contact-note' not in s and 'city-back' not in s
 assert 'https://sls.de'+city['url'] in s
 assert len([1 for t,a in p.tags if t=='details'])==6
 if city['city']!='Dorsten':
  for old in ['Dorsten','Dorstener','Lembeck','Rhade','Wulfen','Hervest','Holsterhausen','Feldmark']:assert old not in s,(city['city'],old)
 for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s):json.loads(m)
 ids=[a['id'] for t,a in p.tags if 'id' in a];assert len(ids)==len(set(ids))
 for t,a in p.tags:
  for attr in ['href','src']:
   u=a.get(attr,'');parts=urlsplit(u)
   if not u or parts.netloc or parts.scheme:continue
   if parts.path.startswith('/'):
    f=ROOT/parts.path.lstrip('/');f=f/'index.html' if parts.path.endswith('/') else f
    assert f.exists(),(city['city'],u)
   elif parts.fragment:assert parts.fragment in ids,(city['city'],u)
   if parts.path=='/immobilien/':
    q=parse_qs(parts.query);assert q['city']==[city['city']] and q['marketCity']==['1']
print('24 Stadtseiten: Metadaten, Ortsnamen, Datenzuordnung, FAQ, Links und Assets geprüft.')

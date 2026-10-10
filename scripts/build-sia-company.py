"""Build SIA's company sources from versioned, public website content. No network/secrets."""
import hashlib, html, json, re
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'services/frag-sls/data/website-company.json'
class Text(HTMLParser):
    def __init__(self): super().__init__(); self.skip = 0; self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'svg'): self.skip += 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'svg'): self.skip = max(0, self.skip-1)
    def handle_data(self, value):
        if not self.skip and value.strip(): self.parts.append(value.strip())
def plain(value):
    parser = Text(); parser.feed(value); return ' '.join(parser.parts)
def read(path): return (ROOT/path).read_text()
records=[]
def add(id, title, text, patterns, path, **extra):
    records.append(dict(id=id,title=title,text=text,patterns=patterns,category='company',sourceType='website',sourcePath=path,url='/'+path.removesuffix('index.html'),snapshotDate=str(date.today()),reviewStatus='Inhalte der bestehenden Arbeitswebsite; keine unabhängige Bewertung',sourceSha256=hashlib.sha256(read(path).encode()).hexdigest(),**extra))
about=read('ueber-uns/index.html')
add('company-overview','SLS: Unternehmen und Geschäftsführung',plain(re.search(r'<main.*?</main>',about,re.S)[0]),['\\bsls\\b','immobilienpartner','unternehmen','geschaftsfuhr','inhaber'], 'ueber-uns/index.html')
contact=read('kontakt/index.html')
location=contact[contact.index('Persönlich vor Ort'):]
add('company-offices','Büros und persönlicher Kontakt',plain(location.split('</main>')[0])+' Zentraler Kontakt: 02369 742 80 20, service@sls.de. Die veröffentlichten Büros sind Dorsten und Düsseldorf; Marktgebiete sind keine weiteren Büroadressen.', ['standort','buro','buros','adresse','anschrift','erreich','kontakt','vertreten','offnungszeit'], 'kontakt/index.html')
areas=read('standorte/index.html')
config=json.loads(re.search(r'<script[^>]*id="market-area-search-config"[^>]*>(.*?)</script>',areas,re.S)[1])
# Keep the actual service-area catalogue, not inferred offices or local market figures.
items=config.get('areas',config.get('cities',[])) if isinstance(config,dict) else config
if not items:
    for value in config.values():
        if isinstance(value,list) and value and isinstance(value[0],dict) and 'city' in value[0]: items=value;break
cities=[item['city'] for item in items]
assert cities, 'Missing service-area catalogue'
add('company-regions','Marktgebiete in Nordrhein-Westfalen','SLS Immobilienpartner begleitet Bewertung, Verkauf und Immobiliensuche in Nordrhein-Westfalen: Ruhrgebiet, Münsterland, Rheinland und Niederrhein. Die Standortseite nennt folgende Marktgebiete: '+', '.join(cities)+'. Dies sind betreute Marktgebiete; persönlich besetzte Büros sind daraus nicht abzuleiten. Für eine konkrete Immobilie stimmt das Team den zuständigen Ansprechpartner ab.', ['nordrhein','\\bnrw\\b','ruhrgebiet','rheinland','munsterland','niederrhein','region','marktgebiet','vertreten','tatig','zustandig']+[re.escape(city.lower()) for city in cities], 'standorte/index.html',cities=cities)
team=read('team/index.html')
members=re.findall(r'<a[^>]*class="team-member[^>]*href="([^"]+)"[^>]*>.*?<h3>(.*?)</h3>\s*<p>(.*?)</p>',team,re.S)
assert len(members)==21, len(members)
add('company-team','Das Team von SLS', '; '.join(plain(name)+': '+plain(role) for _,name,role in members)+'. Die Teamseite verlinkt alle persönlichen Profile.', ['team','mitarbeiter','ansprechpartner','geschaftsfuhr'], 'team/index.html')
for url,name,role in members:
    path=url.lstrip('/')+'index.html'; profile=read(path)
    bio=re.search(r'<div class="profile-bio[^>]*>(.*?)<div class="profile-direct',profile,re.S)
    assert bio,path
    name=plain(name)
    add('company-person-'+url.strip('/').split('/')[-1],name+' – '+plain(role),name+': '+plain(role)+'. '+plain(bio[1]),[re.escape(name.lower()),re.escape(name.split()[-1].lower())]+(['misha'] if 'Mischa' in name else []),path)
add('company-reputation','Erfahrungen, Referenzen und Qualifikationen','Auf der Startseite zeigt SLS Google-Kundenbewertungen und verlinkt das Google-Profil. Aktuelle Sterne und die Anzahl der Bewertungen werden von Google geladen; dieser Wissensstand enthält keine feste aktuelle Zahl. Bewertungen sind persönliche Erfahrungsberichte, keine unabhängige Garantie für einen künftigen Verkauf. Die Teamprofile beschreiben Qualifikationen, unter anderem Dennis Sahlmen als Immobilienmakler (IHK) und Mischa Stratmann als ausgebildeten Immobilienkaufmann und Sachverständigen. Referenzimmobilien zeigen eine Auswahl erfolgreich vermittelter Immobilien. So können Interessenten Kundenstimmen, fachlichen Hintergrund und bisherige Arbeit selbst vergleichen.', ['serios','vertrauen','vertrauenswurd','zuverlass','kundenbewert','rezension','google','qualifikation','erfahrung','empfehl','referenz'], 'index.html',relatedPages=['/team/','/referenzen/'],references=['https://share.google/qbk6kf2K0Cemc8Zeq'])
add('company-history','Unternehmensgeschichte: belegte Grenzen','Die Über-uns-Seite nennt SLS als inhabergeführtes Unternehmen mit Dennis Sahlmen, Filippo Livera und Mischa Stratmann als Geschäftsführern. Ein ausdrückliches Gründungsjahr ist dort nicht angegeben. Berufserfahrung einzelner Mitarbeiter oder eine Partnerauszeichnung seit 2024 belegen kein Gründungsjahr von SLS. Ein konkretes Gründungsjahr kann SIA deshalb derzeit nicht verlässlich nennen.', ['grundung','gegrundet','grundungsjahr','seit wann','wie lange.*(?:sls|unternehmen|euch|sie|gibt)','besteh'], 'ueber-uns/index.html')
add('company-sales-total','Verkaufte Immobilien: Auswahl statt Gesamtzahl','Die Referenzseite zeigt erfolgreich vermittelte Immobilien als Auswahl. Eine verifizierte Gesamtzahl aller bisher von SLS verkauften Immobilien ist dort nicht angegeben. Die Zahl der angezeigten Referenzen oder ihrer Seiten darf nicht als Gesamtzahl der Verkäufe ausgegeben werden.', ['wie viele.*(?:verkauft|vermittelt|verkaufe)','anzahl.*(?:verkauf|vermittelt)','verkaufe.*(?:bisher|gesamt)','bereits.*verkauft','schon.*verkauft','referenz'], 'referenzen/index.html')
OUT.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
print(f'{len(records)} SIA website sources, {len(cities)} service areas, {len(members)} people')

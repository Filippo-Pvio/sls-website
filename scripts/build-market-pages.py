"""Generate market pages from the approved Dorsten layout and editorial city data."""
from pathlib import Path
import json,re,html
from urllib.parse import quote
ROOT=Path(__file__).resolve().parents[1]
template=(ROOT/'immobilienmakler-dorsten/index.html').read_text()
data=json.loads((ROOT/'content/marktgebiete/pages.json').read_text())
for city in data:
 name=city['city'];slug=city['url'].strip('/');esc=html.escape
 page=template.replace('immobilienmakler-dorsten',slug).replace('Dorsten',name)
 page=page.replace('id="dorsten"','id="wohnlagen"')
 # Replace the full local section, never inherit Dorsten districts.
 start=page.index('<section class="section" id="wohnlagen"');end=page.index('<section class="section city-white" id="verkauf"',start)
 articles=''.join(f'<article data-city-reveal><h3>{esc(s["heading"])}</h3><p>{esc(s["text"])}</p><p class="city-takeaway">{esc(s["takeaway"])}</p></article>' for s in city['sections'])
 local=f'<section class="section" id="wohnlagen"><div class="wrap"><div class="city-section-head" data-city-reveal><h2>Ihre Immobilie in {esc(name)}.<br>Auf die Details kommt es an.</h2><p>{esc(city["localIntro"])}</p></div><div class="city-locations">{articles}</div></div></section>\n'
 page=page[:start]+local+page[end:]
 page=re.sub(r'<details><summary>Begleiten Sie auch Immobilien in Lembeck.*?</details>',f'<details><summary>Begleiten Sie Immobilien im gesamten Gebiet von {esc(name)}?</summary><p>Ja. SLS Immobilienpartner begleitet Eigentümer in {esc(name)}. Die oben genannten Bereiche sind Beispiele. Im persönlichen Gespräch klären wir die Betreuung Ihrer konkreten Adresse, Ihr Vorhaben und den passenden Zeitplan.</p></details>',page)
 page=page.replace('href="/immobilien/?city='+name+'&amp;marketCity=1"','href="/immobilien/?city='+quote(name)+'&amp;marketCity=1"')
 old='Sie möchten Ihr Haus oder Ihre Wohnung verkaufen? SLS Immobilienpartner begleitet Sie von der Bewertung über die Vermarktung bis zur abgestimmten Übergabe – persönlich und mit Blick auf Ihre Ziele.'
 page=page.replace(old,esc(city['text']))
 (ROOT/slug/'index.html').write_text(page)
print(f'{len(data)} Stadtseiten aktualisiert; Dorsten bleibt Layoutvorlage.')
import runpy
runpy.run_path(str(ROOT/'scripts/market-page-images.py'))['apply_images']()

runpy.run_path(str(ROOT/'scripts/build-market-area-search.py'))['build']()

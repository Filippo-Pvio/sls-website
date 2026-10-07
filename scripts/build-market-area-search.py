"""Embed central regional search data without adding a request while typing."""
from pathlib import Path
import json, re
ROOT = Path(__file__).resolve().parents[1]

def build():
    cities = json.loads((ROOT/'content/marktgebiete/cities.json').read_text())
    config = json.loads((ROOT/'content/marktgebiete/search.json').read_text())
    routes = {item['url']: item for item in config['areas']}
    assert len(routes) == len(cities)
    areas = [{**city, **routes[city['url']]} for city in cities]
    payload = json.dumps(areas, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    tag = '<script type="application/json" id="market-area-search-config">'+payload+'</script>'
    path = ROOT/'standorte/index.html'
    page = path.read_text()
    if 'id="market-area-search-config"' in page:
        page = re.sub(r'<script type="application/json" id="market-area-search-config">.*?</script>', lambda _: tag, page)
    else:
        page = page.replace('<script src="/assets/market-areas.js"', tag+'<script src="/assets/market-areas.js"')
    path.write_text(page)
    print(f'{len(areas)} regional search areas embedded; {sum(len(a["nearby"]) for a in areas)} nearby towns.')

if __name__ == '__main__':
    build()

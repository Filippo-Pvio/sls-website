"""Apply approved, page-specific header scenes without replacing shared originals."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def apply_headers():
    selections = json.loads((ROOT / 'content/header-images.json').read_text())
    changed = []
    for route, scenes in selections.items():
        target = ROOT / (route.strip('/') + '/index.html' if route != '/' else 'index.html')
        old = target.read_text()
        page = old
        first = scenes[0]
        if 'id="network-hero-config"' in page:
            match = re.search(r'(<script[^>]*id="network-hero-config"[^>]*>)(.*?)(</script>)', page, re.S)
            config = json.loads(match[2])
            for item, scene in zip(config['images'], scenes):
                item.update(src=f'/assets/images/{scene["scene"]}-{scene["width"]}.webp',
                            srcset=f'/assets/images/{scene["scene"]}-{scene["mobile_width"]}.webp {scene["mobile_width"]}w, /assets/images/{scene["scene"]}-{scene["width"]}.webp {scene["width"]}w')
                if scene['generated']:
                    item['position'] = '68% 45%'
            page = page[:match.start()] + match[1] + json.dumps(config, ensure_ascii=False) + match[3] + page[match.end():]
        else:
            def section(match):
                tag = re.sub(r'\sdata-hero-(?:scenes|widths|desktop-widths)="[^"]*"', '', match[0])
                attrs = {'scenes': ','.join(s['scene'] for s in scenes),
                         'widths': ','.join(str(s['mobile_width']) for s in scenes),
                         'desktop-widths': ','.join(str(s['width']) for s in scenes)}
                return tag[:-1] + ''.join(f' data-hero-{key}="{value}"' for key, value in attrs.items()) + '>'
            page, count = re.subn(r'<section\b[^>]*class="[^"]*(?:buy-intro|hero-premium|finance-intro)[^"]*"[^>]*>', section, page, count=1)
            if count != 1:
                raise ValueError(f'Header not found: {route}')
            if first['generated']:
                src = f'/assets/images/{first["scene"]}-{first["width"]}.webp'
                def image(match):
                    tag = match[0]
                    replacements = {'src': src,
                                    'srcset': f'/assets/images/{first["scene"]}-{first["mobile_width"]}.webp {first["mobile_width"]}w, {src} {first["width"]}w',
                                    'width': str(first['width']), 'height': str(first['height'])}
                    for attr, value in replacements.items():
                        if re.search(r'\b' + attr + r'="', tag):
                            tag = re.sub(r'\b' + attr + r'="[^"]*"', lambda m: f'{attr}="{value}"', tag)
                        else:
                            tag = tag[:-1] + f' {attr}="{value}">'
                    return tag
                page = re.sub(r'<img\b[^>]*class="[^"]*hero-scene-current[^"]*"[^>]*>', image, page, count=1)
        if first['generated']:
            page = re.sub(r'(<meta property="og:image" content=")[^"]*', lambda m: m[1] + f'https://sls.de/assets/images/{first["scene"]}-{first["width"]}.webp', page)
        if page != old:
            target.write_text(page)
            changed.append(str(target.relative_to(ROOT)))
    return changed


if __name__ == '__main__':
    print('Updated headers:', len(apply_headers()))

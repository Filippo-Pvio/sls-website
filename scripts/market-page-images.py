"""Apply the stable photo selection after generating or editing city pages."""
from pathlib import Path
import json, re, html

ROOT = Path(__file__).resolve().parents[1]

def apply_images():
    selections = json.loads((ROOT / 'content/marktgebiete/images.json').read_text())
    for slug, selection in selections.items():
        target = ROOT / slug / 'index.html'
        page = target.read_text()
        scenes = selection['hero']
        first = '/assets/images/' + scenes[0] + '-1536.webp'
        width, height = selection['heroSize']
        page = re.sub(r'(<section class="buy-intro city-hero")[^>]*>',
                      r'\1 data-hero-scenes="' + ','.join(scenes) + '" data-hero-widths="' + ','.join(map(str, selection['heroWidths'])) + '">', page)
        hero = (f'<img class="hero-scene hero-scene-current is-visible" data-scene="{scenes[0]}" '
                f'src="{first}" srcset="/assets/images/{scenes[0]}-{selection["heroWidths"][0]}.webp {selection["heroWidths"][0]}w, {first} 1536w" '
                f'sizes="100vw" width="{width}" height="{height}" alt="" fetchpriority="high" decoding="async">')
        page = re.sub(r'<img class="hero-scene hero-scene-current[^>]*>', hero, page)
        image = selection['content']
        src = '/assets/images/' + image['scene'] + '-1536.webp'
        width, height = image['size']
        photo = (f'<img src="{src}" srcset="/assets/images/{image["scene"]}-{image["mobileWidth"]}.webp {image["mobileWidth"]}w, {src} 1536w" '
                 f'sizes="(max-width: 850px) 100vw, 50vw" width="{width}" height="{height}" '
                 f'loading="lazy" decoding="async" alt="{html.escape(image["alt"], quote=True)}">')
        page = re.sub(r'(<figure class="city-image"[^>]*>)<img[^>]*>', lambda m: m[1] + photo, page)
        page = re.sub(r'(<meta property="og:image" content=")[^"]*', r'\1https://sls.de' + first, page)
        target.write_text(page)

if __name__ == '__main__':
    apply_images()
    print('Fotoauswahl auf allen 24 Stadtseiten angewendet.')

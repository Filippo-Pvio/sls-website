"""Apply supplied team photos to general pages, preserving profiles and magazine."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def apply_photos():
    mapping=json.loads((ROOT/'content/team-photos.json').read_text())
    excluded={x['path'] for x in json.loads((ROOT/'content/magazin/generated.json').read_text())}
    changed=[]
    for p in ROOT.rglob('*.html'):
        relative=p.relative_to(ROOT)
        if relative.parts[0] in ('team','qa-artifacts','node_modules','.git') or str(relative) in excluded:continue
        old=p.read_text();new=old
        for base,photo in mapping.items():
            for width in (900,1536):
                target=900 if width==900 else 1280
                new=new.replace('/assets/images/'+base+'-'+str(width)+'.webp','/assets/images/'+photo['scene']+'-'+str(target)+'.webp')
        def image(m):
            tag=m[0]
            for photo in mapping.values():
                if '/assets/images/'+photo['scene']+'-' in tag:
                    tag=tag.replace('-1280.webp 1536w','-1280.webp 1280w')
                    tag=re.sub(r'width="\d+"', 'width="1280"',tag)
                    tag=re.sub(r'height="\d+"','height="853"',tag)
                    tag=re.sub(r'alt="[^"]+"','alt="'+photo['alt']+'"',tag)
            return tag
        new=re.sub(r'<img\b[^>]*>',image,new)
        if new!=old:p.write_text(new);changed.append(str(relative))
    css=ROOT/'assets/styles.css';s=css.read_text();s=s.replace('/assets/images/home/marketing-hintergrund.jpeg','/assets/images/team-scenes/vermarktung-1280.webp');css.write_text(s)
    aliases={k:v['scene'] for k,v in mapping.items() if not k.startswith('home/')}
    helper='''// TEAM-PHOTOS:START
// Keep supplied group photos on general pages; individual profiles stay unchanged.
window.slsSceneImage = (url) => {
  if (location.pathname.startsWith('/team/') || document.body.classList.contains('magazine-page')) return url;
  const aliases = '''+json.dumps(aliases,ensure_ascii=False)+''';
  const match = url.match(/^\\/assets\\/images\\/(.+)-(\\d+)\\.webp$/);
  const scene = match && aliases[match[1]];
  return scene ? `/assets/images/${scene}-${Number(match[2]) <= 900 ? 900 : 1280}.webp` : url;
};
// TEAM-PHOTOS:END
'''
    p=ROOT/'assets/site.js';s=p.read_text()
    s=re.sub(r'// TEAM-PHOTOS:START[\s\S]*?// TEAM-PHOTOS:END\n?', '',s)
    p.write_text(helper+s)
    for name in ('hero-scenes','buy-hero','references-hero','search-hero','sell-hero'):
        p=ROOT/('assets/'+name+'.js');s=p.read_text()
        if 'const legacyPath' not in s:
            s=s.replace('const path = (scene) =>','const legacyPath = (scene) =>')
            s=s.replace('  let active = current;','  const path = (scene) => window.slsSceneImage(legacyPath(scene));\n  let active = current;')
            p.write_text(s)
    return changed
if __name__=='__main__':print('Updated general pages:',len(apply_photos()))

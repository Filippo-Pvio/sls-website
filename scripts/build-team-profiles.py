#!/usr/bin/env python3
"""Build the team profiles from editorial data; Filippo's approved pilot stays separate.
Add person-specific heroScenes and videos in content/team/profiles.json, then run this script.
"""
from pathlib import Path
import json,html,re
ROOT=Path(__file__).resolve().parents[1]
e=lambda s:html.escape(str(s),quote=True)
profiles=json.loads((ROOT/'content/team/profiles.json').read_text())
reviews=json.loads((ROOT/'content/team/reviews.json').read_text())
for p in profiles:
 name=e(p['name']);role=e(p['role']);slug=p['slug'];portrait=e(p['portrait']);scenes=p['heroScenes']
 description=e(f"Lernen Sie {p['name']} kennen: {p['role']} bei SLS Immobilienpartner. Hintergrund, Schwerpunkte und direkter Kontakt.")
 if scenes:
  scene=scenes[0];attrs=f'data-hero-scenes="{e(",".join(scenes))}" data-hero-widths="900,900,900"'
  images=f'<img class="hero-scene hero-scene-current is-visible" data-scene="{e(scene)}" src="/assets/images/{scene}-1536.webp" srcset="/assets/images/{scene}-900.webp 900w, /assets/images/{scene}-1536.webp 1536w" sizes="100vw" width="1536" height="1024" alt="" fetchpriority="high"><img class="hero-scene hero-scene-next" alt="" decoding="async">'
 else:
  attrs='';images=f'<img class="profile-hero-backdrop" src="{portrait}" alt="" width="768" height="768"><img class="hero-scene hero-scene-current is-visible" src="{portrait}" width="768" height="768" alt="" fetchpriority="high">'
 media=''
 if p['videos']:
  videoCards=''
  for v in p['videos']:
   vid=e(v['id']);title=e(v['title'])
   videoCards+=f'<article class="profile-video-card reveal"><div class="profile-video-player"><a class="profile-video-play" href="https://www.youtube.com/watch?v={vid}" data-video-id="{vid}" data-video-title="{title}" aria-label="Video mit {name} abspielen"><img src="/api/youtube-thumbnail?video={vid}" alt="Originales YouTube-Vorschaubild: {title}" width="1280" height="720" loading="lazy"><span class="profile-play-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 5 11 7-11 7z"/></svg></span><span class="profile-play-label">Video ansehen</span></a></div><div class="profile-media-copy"><h3>{title}</h3><p class="profile-video-note">Der YouTube-Player wird erst beim Abspielen geladen.</p></div></article>'
  media=f'<section class="section section-white profile-media"><div class="wrap"><div class="profile-section-head reveal"><h2>Einblicke in die Praxis.</h2><p>{name} im Video: Lernen Sie die Arbeit von SLS Immobilienpartner aus einer persönlichen Perspektive kennen.</p></div><div class="profile-video-gallery profile-video-gallery-standalone" data-video-gallery aria-label="Videos mit {name}"><div class="profile-video-track" data-video-track tabindex="0" aria-label="Videogalerie">{videoCards}</div><div class="profile-video-controls" hidden><button type="button" data-video-prev aria-label="Vorheriges Video">‹</button><span data-video-position aria-live="polite"></span><button type="button" data-video-next aria-label="Nächstes Video">›</button></div></div></div></section>'
 bio=''.join(f'<p>{e(t)}</p>' for t in p['bio'])
 focus=''.join(f'<article class="reveal"><h3>{e(h)}</h3><p>{e(t)}</p></article>' for h,t in zip(p['focus'],p['focusCopy']))
 review=reviews.get(slug)
 reviewHidden='' if review else ' hidden'
 articleHidden='' if review else ' hidden'
 text=e(review['excerpt'] + (' …' if review['partial'] else '')) if review else ''
 author=e(review['author']) if review else ''
 url=e(review['googleMapsUri']) if review else ''
 date=e((review.get('publishTime') or '')[:10]) if review else ''
 dateLabel='.'.join(reversed(date.split('-'))) if date else ''
 reviewsSection=f'<section class="section profile-reviews" data-profile-reviews="{slug}" data-profile-name="{name}"{reviewHidden}><div class="wrap profile-review-grid"><div><h2 data-review-heading>Erfahrungen mit<br>{name}.</h2><p class="profile-review-context" data-review-context>Eine ausgewählte Google-Bewertung zur persönlichen Zusammenarbeit.</p></div><div class="profile-review-content"><article class="profile-personal-review" data-personal-review{articleHidden}><span class="profile-google-label">Google-Bewertung · Auszug</span><div class="profile-review-stars" data-review-stars aria-label="5 von 5 Sternen">★★★★★</div><blockquote data-review-text>„{text}“</blockquote><div class="profile-review-author"><a data-review-author href="{url}" target="_blank" rel="noopener noreferrer">{author}</a><time data-review-date datetime="{date}">{dateLabel}</time></div><a class="text-link" data-review-original href="{url}" target="_blank" rel="noopener noreferrer">Vollständige Bewertung auf Google lesen</a></article></div></div></section>'
 service=any(s in p['role'] for s in ['Office','Legal','Relations','Media','Telesales'])
 lead=e(p.get('lead','Persönlich für Sie da. Mit Erfahrung, einem offenen Ohr und einem klaren Blick für Ihr Anliegen.'))
 cta=e(p.get('cta','Sie haben Fragen oder möchten die nächsten Schritte besprechen? Nehmen Sie direkt Kontakt auf.'))
 htmlPage=f'''<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{name} · {role} | SLS Immobilienpartner</title><meta name="description" content="{description}"><link rel="canonical" href="https://sls.de/team/{slug}/"><meta name="theme-color" content="#345b6e"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/buy-page.css"><link rel="stylesheet" href="/assets/profile-page.css"></head>
<body class="buy-page profile-page"><header class="site-header" data-site-header></header><main id="main">
<section class="buy-intro profile-intro{' profile-intro-portrait' if not scenes else ''}" {attrs}><div class="buy-hero-scenes" aria-hidden="true">{images}</div><div class="wrap"><div class="profile-hero-copy"><p class="eyebrow">SLS Immobilienpartner · {role}</p><h1>{name}</h1><p class="lead">{lead}</p></div></div></section>
<section class="section section-white profile-about"><div class="wrap profile-about-grid"><div class="profile-bio reveal"><h2>{e(p['heading'])}</h2>{bio}<div class="profile-direct"><h3>Direkter Kontakt zu {name}</h3><a href="tel:{e(p['phone'])}">{e(p.get('phoneLabel',p['phone']))}</a><a href="mailto:{e(p['email'])}">{e(p['email'])}</a></div></div><figure class="profile-portrait reveal"><img src="{portrait}" alt="{name}, {role} bei SLS Immobilienpartner" width="768" height="768" loading="lazy"><figcaption>{name}<span>{role}</span></figcaption></figure></div></section>
<section class="section profile-focus"><div class="wrap"><div class="profile-section-head reveal"><h2>Was die Arbeit prägt.</h2><p>{e(p.get('focusIntro','Fachlicher Hintergrund, persönliche Arbeitsweise und ein Blick auf die Aufgaben im Team.'))}</p></div><div class="profile-focus-grid">{focus}</div></div></section>
{media}
{reviewsSection}
<section class="section section-dark buy-final profile-final"><div class="wrap reveal"><h2>Ihr Anliegen.<br>Ein persönliches Gespräch.</h2><p class="lead">{cta}</p><a class="button button-light" href="mailto:{e(p['email'])}">{name} schreiben</a></div></section>
</main><footer class="site-footer" data-site-footer></footer><script src="/assets/site.js" defer></script><script src="/assets/sell-hero.js" defer></script><script src="/assets/profile-page.js" defer></script></body></html>
'''
 target=ROOT/'team'/slug/'index.html';target.parent.mkdir(parents=True,exist_ok=True);target.write_text(htmlPage)
print(f'{len(profiles)} Profile gebaut; Filippo-Referenz unverändert.')

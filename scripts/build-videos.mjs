import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {origin,organizationId,escapeHtml as esc,scriptJson,breadcrumb} from '../lib/seo.mjs';
const root=new URL('../',import.meta.url);
const metadata=JSON.parse(await readFile(new URL('content/seo/video-source-metadata.json',root),'utf8'));
const videos=[
 {id:'o0hvSO41MOI',slug:'bewertung-bis-verkauf',person:'Mischa Stratmann',profile:'mischa-stratmann',summary:'Mischa Stratmann im Gespräch über die Begleitung von der Immobilienbewertung bis zum Verkauf. Das Gespräch gehört zu den Einblicken in seine Arbeit bei SLS Immobilienpartner.'},
 {id:'-Pby-CF9f04',slug:'moderne-maklerarbeit',person:'Dennis Sahlmen',profile:'dennis-sahlmen',summary:'Dennis Sahlmen im Gespräch über moderne Maklerarbeit. Das Video ergänzt die Informationen zu seiner Tätigkeit als Geschäftsführer und Immobilienmakler bei SLS Immobilienpartner.'},
 {id:'qip-kPiTPcA',slug:'guter-immobilienmakler',person:'Filippo Livera',profile:'filippo-livera',summary:'Filippo Livera im Gespräch darüber, was einen guten Immobilienmakler ausmacht. Das Gespräch ergänzt die Einblicke in seine Arbeit bei SLS Immobilienpartner.'}
];
const shell=(title,description,body,schema=[])=>`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | SLS Immobilienpartner</title><meta name="description" content="${esc(description)}"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/buy-page.css"><script type="application/ld+json">${scriptJson({'@context':'https://schema.org','@graph':schema})}</script></head><body><header class="site-header" data-site-header></header><main id="main"><section class="section"><div class="wrap">${body}</div></section></main><footer class="site-footer" data-site-footer></footer><script src="/assets/site.js" defer></script></body></html>\n`;
const list=[];
for(const video of videos){
 const source=metadata.find(v=>v.id===video.id);
 if(!source?.uploadDate||!source.title)throw new Error(`Verified video metadata missing: ${video.id}`);
 const title=source.title.replace(/\s*\| SLS Immobilienpartner$/,'');
 const url=`/videos/${video.slug}/`,canonical=origin+url,image=`/assets/images/videos/${video.id}.jpg`;
 const schema={'@type':'VideoObject','@id':canonical+'#video',name:title,description:video.summary,thumbnailUrl:origin+image,uploadDate:source.uploadDate,duration:`PT${Number(source.lengthSeconds)}S`,embedUrl:`https://www.youtube-nocookie.com/embed/${video.id}`,url:canonical,publisher:{'@id':organizationId},about:{'@id':`${origin}/team/${video.profile}/#person`},isAccessibleForFree:true};
 const body=`<nav aria-label="Brotkrumennavigation"><a href="/">Startseite</a> / <a href="/videos/">Videos</a></nav><h1>${esc(title)}</h1><p>${esc(video.summary)}</p><p>Veröffentlicht auf YouTube am <time datetime="${esc(source.uploadDate)}">${esc(source.uploadDate.slice(0,10))}</time> · ${Math.floor(Number(source.lengthSeconds)/60)} Minuten</p><figure><img src="${image}" width="1280" height="720" alt="${esc(title)} – Video mit ${esc(video.person)}" style="max-width:100%;height:auto"></figure><div style="aspect-ratio:16/9;max-width:100%;position:relative"><iframe title="${esc(title)}" src="https://www.youtube-nocookie.com/embed/${video.id}" width="960" height="540" style="width:100%;height:100%;border:0" allowfullscreen></iframe></div><p>Das externe Video wird nach Ihrer Freigabe für Videos und externe Medien geladen. <a href="https://www.youtube.com/watch?v=${video.id}" rel="noopener noreferrer" target="_blank">Video auf YouTube ansehen</a></p><h2>Die Person im Gespräch</h2><p><a href="/team/${video.profile}/">Mehr über ${esc(video.person)}</a> · <a href="/kontakt/">Eigene Fragen besprechen</a></p>`;
 const directory=new URL(url.slice(1),root);await mkdir(directory,{recursive:true});await writeFile(new URL('index.html',directory),shell(title,video.summary,body,[schema,breadcrumb([['Startseite','/'],['Videos','/videos/'],[title,url]])]));
 list.push(`<article><h2><a href="${url}">${esc(title)}</a></h2><p>${esc(video.summary)}</p></article>`);
 const profileFile=new URL(`team/${video.profile}/index.html`,root);let profile=await readFile(profileFile,'utf8');
 if(!profile.includes('data-video-watch-link'))profile=profile.replace('</main>',()=>`<section class="section" data-video-watch-link><div class="wrap"><h2>Das Gespräch als eigene Videoseite</h2><p><a href="${url}">${esc(title)} – mit ${esc(video.person)}</a></p></div></section></main>`);
 await writeFile(profileFile,profile);
}
await mkdir(new URL('videos/',root),{recursive:true});await writeFile(new URL('videos/index.html',root),shell('Gespräche und Videos','Gespräche mit den Geschäftsführern von SLS Immobilienpartner zu Bewertung, Verkauf und Maklerarbeit.',`<h1>Einblicke in die Maklerarbeit.</h1><p>Gespräche mit Menschen bei SLS Immobilienpartner.</p>${list.join('')}`));
console.log('Built three watch pages with verified publisher metadata and local previews.');

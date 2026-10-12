import {readFile,readdir} from 'node:fs/promises';

const interviewIds = new Set(['o0hvSO41MOI','-Pby-CF9f04','qip-kPiTPcA']);
const tourWords = /room\s*tour|hausbesichtigung|wohnungsbesichtigung|immobilienbesichtigung|immobilienpräsentation|rundgang|präsentiert (?:ein|eine)|führt durch|zeigt ein|stellt ein/i;
const plain = value => value.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const attribute = (tag,name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`))?.[1] || '';

export function collectPropertyTours(pages, known = []) {
  const registry = new Map(known.map(video => [video.id,video]));
  const discovered = new Map();
  for (const {html,route,person,profile} of pages) {
    for (const match of html.matchAll(/<(?:div|a|iframe)\b[^>]*(?:data-reel-id|data-video-id|src=|data-consent-src=)[^>]*>/g)) {
      const tag=match[0];
      let id=attribute(tag,'data-reel-id'),provider=id?'instagram':'youtube';
      if (!id) id=attribute(tag,'data-video-id');
      if (!id) {
        try {
          const url=new URL(attribute(tag,'src') || attribute(tag,'data-consent-src'));
          if (url.hostname==='www.instagram.com') { id=url.pathname.match(/^\/reel\/([\w-]{11})(?:\/|$)/)?.[1]; provider='instagram'; }
          else if (['www.youtube.com','www.youtube-nocookie.com'].includes(url.hostname)) id=url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})(?:\/|$)/)?.[1];
        } catch { /* Local images and non-player sources are not video entries. */ }
      }
      if (!/^[\w-]{11}$/.test(id || '') || interviewIds.has(id)) continue;
      const preceding=html.slice(0,match.index),following=html.slice(match.index);
      const articleStart=preceding.lastIndexOf('<article'),figureStart=preceding.lastIndexOf('<figure');
      const articleOpen=articleStart>preceding.lastIndexOf('</article>');
      const figureOpen=figureStart>preceding.lastIndexOf('</figure>');
      const start=articleOpen?articleStart:figureOpen?figureStart:Math.max(0,match.index-1200);
      const end=articleOpen?following.indexOf('</article>'):figureOpen?following.indexOf('</figure>'):-1;
      const context=html.slice(start,end>=0?match.index+end:match.index+1200);
      const title=plain(attribute(tag,'data-video-title') || context.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/)?.[1] || attribute(tag,'title') || context.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)?.[1] || 'Immobilienbesichtigung');
      const description=plain(context.match(/<p\b[^>]*class="[^"]*profile-video-description[^"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1] || title);
      const original=registry.get(id);
      if (!original && !tourWords.test(title+' '+description) && !/data-video-category=["']property-tour["']/.test(context)) continue;
      const candidate=original ? {...original,source:route} : {id,provider,title,description,person:person || 'SLS Immobilienpartner',profile:profile || '',source:route};
      // Prefer the profile's accurate title and attribution over incidental page mentions.
      if (!discovered.has(id) || profile) discovered.set(id,candidate);
    }
  }
  const order=new Map(known.map((video,index)=>[video.id,index]));
  return [...discovered.values()].sort((a,b)=>(order.get(a.id)??known.length)-(order.get(b.id)??known.length)||a.source.localeCompare(b.source)||a.id.localeCompare(b.id));
}

export async function discoverPropertyTours(root, known) {
  const profiles=JSON.parse(await readFile(new URL('content/team/profiles.json',root),'utf8'));
  const people=new Map(profiles.map(profile=>[profile.slug,profile.name]));
  people.set('filippo-livera','Filippo Livera');
  const excluded=new Set(['videos','output','node_modules','qa','qa-artifacts','scripts','services','integrations','docs','test-results','playwright-report','wp-content']);
  const pages=[];
  for (const file of await readdir(root,{recursive:true})) {
    if (!file.endsWith('.html') || file.split('/').some(part=>part.startsWith('.')) || excluded.has(file.split('/')[0])) continue;
    const profile=file.match(/^team\/([^/]+)\/index\.html$/)?.[1];
    pages.push({html:await readFile(new URL(file,root),'utf8'),route:file==='index.html'?'/':'/'+file.replace(/index\.html$/,''),profile,person:people.get(profile)});
  }
  return collectPropertyTours(pages,known);
}

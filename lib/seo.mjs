export const origin = 'https://sls.de';
export const organizationId = `${origin}/#organization`;
export const websiteId = `${origin}/#website`;
export const indexRobots = 'index, follow, max-image-preview:large';
export const noindexRobots = 'noindex, follow';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const scriptJson = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
// Trust the actual host, never x-forwarded-host supplied by a visitor.
export function publicHost(req) {
  return req.headers?.host === 'sls.de';
}
export function robotsFor(req, {status = 200, privatePage = false} = {}) {
  return publicHost(req) && status === 200 && !privatePage ? indexRobots : noindexRobots;
}
export function breadcrumb(items) {
  return {'@type':'BreadcrumbList', itemListElement:items.map(([name,url],i)=>({'@type':'ListItem',position:i+1,name,item:origin+url}))};
}
export function replaceMetadata(html, {title,description,canonical,robots=indexRobots,image,data}) {
  if(data){
    const existing=html.match(/<script\b[^>]*\bid="sls-seo-jsonld"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    const identities=existing?(JSON.parse(existing)['@graph']||[]).filter(node=>['RealEstateAgent','WebSite','Organization'].includes(node['@type'])):[];
    if(identities.length)data={'@context':'https://schema.org','@graph':[...identities,...(data['@graph']||[data])]};
  }
  html = html.replace(/<title>[\s\S]*?<\/title>/i,()=>`<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\b[^>]*\bname=["'](?:description|robots)["'][^>]*>/gi,'')
    .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi,'')
    .replace(/<meta\b[^>]*\bproperty=["']og:[^"']+["'][^>]*>/gi,'')
    .replace(/<script\b[^>]*\bid=["']sls-seo-jsonld["'][^>]*>[\s\S]*?<\/script>/gi,'');
  const tags=`<meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="${escapeHtml(robots)}">${canonical?`<link rel="canonical" href="${escapeHtml(canonical)}">`:''}<meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">${canonical?`<meta property="og:url" content="${escapeHtml(canonical)}">`:''}${image?`<meta property="og:image" content="${escapeHtml(image)}">`:''}${data?`<script id="sls-seo-jsonld" type="application/ld+json">${scriptJson(data)}</script>`:''}`;
  return html.replace('</head>',()=>tags+'</head>');
}

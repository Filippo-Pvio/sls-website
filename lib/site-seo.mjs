import {readFileSync} from 'node:fs';
import {organization,website,offices} from '../config/seo-entity.mjs';
import {origin,organizationId,websiteId,escapeHtml,scriptJson,breadcrumb,indexRobots} from './seo.mjs';

const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const profiles=JSON.parse(read('content/team/profiles.json'));
const cities=[...JSON.parse(read('content/marktgebiete/pages.json')),...JSON.parse(read('content/seo/restored-cities.json')),{city:'Dorsten',url:'/immobilienmakler-dorsten/',regions:['ruhrgebiet']}];
const navigation=JSON.parse(read('config/site-navigation.json'));
const plain=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const personId=slug=>`${origin}/team/${slug}/#person`;
const nodeTypes=node=>[].concat(node?.['@type']||[]);
export function prepareSiteSeo(html,url){
  if(!html.includes('data-site-header'))return html;
  const canonical=origin+url;
  const title=plain(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]);
  const description=html.match(/<meta\b[^>]*name="description"[^>]*content="([^"]*)"/i)?.[1]||'';
  const graph=[];
  html=html.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,(_,json)=>{
    const parsed=JSON.parse(json);graph.push(...(parsed['@graph']||[parsed]));return '';
  });
  // Reuse the same identifiers in every page and existing magazine schema.
  const normalize=node=>{
    if(!node||typeof node!=='object')return;
    if(nodeTypes(node).includes('Organization')&&node.name==='SLS Immobilienpartner GmbH')node['@id']=organizationId;
    if(nodeTypes(node).includes('Organization')&&node.name==='Redaktion von SLS Immobilienpartner')node['@id']=origin+'/blog/redaktion/#organization';
    if(nodeTypes(node).includes('Person')&&node.url?.startsWith(origin+'/team/'))node['@id']=node.url+'#person';
    for(const value of Object.values(node))if(Array.isArray(value))value.forEach(normalize);else normalize(value);
  };
  graph.forEach(normalize);
  const nodes=graph.filter(node=>!nodeTypes(node).includes('RealEstateAgent'));
  nodes.push(organization,website);
  let page=nodes.find(node=>nodeTypes(node).some(type=>['WebPage','CollectionPage','ProfilePage'].includes(type)));
  if(!page){page={'@type':'WebPage','@id':canonical+'#webpage',url:canonical,name:title,description:plain(description)};nodes.push(page);}
  page.isPartOf={'@id':websiteId};page.publisher={'@id':organizationId};page.inLanguage='de-DE';
  const match=/^\/team\/([^/]+)\/$/.exec(url);
  if(match){
    const slug=match[1];
    const profile=profiles.find(p=>p.slug===slug)||{name:plain(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]),role:plain(html.match(/<figcaption>[\s\S]*?<span>([\s\S]*?)<\/span>/)?.[1])};
    const portrait=html.match(/class="profile-portrait[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/)?.[1];
    const person={'@type':'Person','@id':personId(slug),name:profile.name,url:canonical,jobTitle:profile.role,worksFor:{'@id':organizationId},...(portrait?{image:portrait}:{}),...(profile.phone?{telephone:profile.phone}:{}),...(profile.email?{email:profile.email}:{})};
    page['@type']='ProfilePage';page.mainEntity={'@id':person['@id']};nodes.push(person);
  }
  const office=offices[url];if(office){nodes.push(office);page.mainEntity={'@id':office['@id']};}
  const city=cities.find(c=>c.url===url);
  if(city){
    const place={'@type':'City','@id':canonical+'#city',name:city.city};nodes.push(place);page.about={'@id':place['@id']};
    const service={'@type':'Service','@id':canonical+'#service',name:`Immobilienverkauf und Immobilienbewertung in ${city.city}`,provider:{'@id':organizationId},areaServed:{'@id':place['@id']},url:canonical};nodes.push(service);page.mainEntity={'@id':service['@id']};

  }
  if(url==='/standorte/'&&!html.includes('data-restored-markets'))html=html.replace('</main>',()=>`<section class="section" data-restored-markets><div class="wrap"><h2>Weitere Marktgebiete</h2><ul>${cities.filter(c=>c.migrationSource).map(c=>`<li><a href="${c.url}">Immobilien in ${escapeHtml(c.city)}</a></li>`).join('')}</ul></div></section></main>`);
  // The existing WordPress image URLs keep working after the domain switches.
  html=html.replace(/(\b(?:src|srcset)=["'])https:\/\/sls\.de\/wp-content\/uploads\//g,'$1/wp-content/uploads/').replace(/, https:\/\/sls\.de\/wp-content\/uploads\//g,', /wp-content/uploads/');
  const serviceNames={'/verkaufen/':'Immobilienverkauf','/immobilienbewertung/':'Immobilienbewertung','/kaufen/':'Begleitung beim Immobilienkauf','/finanzierung/':'Orientierung zur Immobilienfinanzierung'};
  if(serviceNames[url]){nodes.push({'@type':'Service','@id':canonical+'#service',name:serviceNames[url],url:canonical,provider:{'@id':organizationId},areaServed:organization.areaServed});page.mainEntity={'@id':canonical+'#service'};}
  if(!nodes.some(node=>nodeTypes(node).includes('BreadcrumbList'))&&url!=='/')nodes.push(breadcrumb([['Startseite','/'],...(match?[['Team','/team/']]:[]),[plain(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1])||title,url]]));
  html=html.replace(/<header([^>]*\bdata-site-header[^>]*)>[\s\S]*?<\/header>/i,(_,attrs)=>`<header${attrs}>${navigation.header}</header>`)
    .replace(/<footer([^>]*\bdata-site-footer[^>]*)>[\s\S]*?<\/footer>/i,(_,attrs)=>`<footer${attrs.replace(/class="([^"]*)"/,(_,value)=>`class="${value} footer-unified"`)}>${navigation.footer}</footer>`);
  if(!/<link[^>]*rel="canonical"/.test(html))html=html.replace('</head>',()=>`<link rel="canonical" href="${canonical}"></head>`);
  if(!/<meta[^>]*name="robots"/.test(html))html=html.replace('</head>',()=>`<meta name="robots" content="${indexRobots}"></head>`);
  const og={type:html.includes('magazine-article')?'article':'website',title,description,url:canonical,image:html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/)?.[1]||organization.image,site_name:'SLS Immobilienpartner',locale:'de_DE'};
  for(const [key,value] of Object.entries(og))if(!html.includes(`property="og:${key}"`))html=html.replace('</head>',()=>`<meta property="og:${key}" content="${escapeHtml(value)}"></head>`);
  return html.replace('</head>',()=>`<script id="sls-seo-jsonld" type="application/ld+json">${scriptJson({'@context':'https://schema.org','@graph':nodes})}</script></head>`);
}

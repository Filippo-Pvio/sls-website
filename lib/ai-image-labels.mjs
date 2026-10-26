import {AI_IMAGE_LABEL,isAiImage} from '../assets/ai-image-policy.mjs';
const voidTags=new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const heroClass=/\b(?:buy-intro|hero-premium|finance-intro)\b/;
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1],m[2]??m[3]]));
export function prepareAiImageLabels(input){
 if(!/<head[\s>]/i.test(input)||/data-sls-signage/.test(input))return input;
 let html=input.replace(/<(p|figcaption|span)\b([^>]*)>\s*(KI-generierte Teamszene|KI-generiertes Symbolbild|KI-generierte Darstellung)\s*<\/\1>/g,(all,tag,attributes)=>{
  const a=attrs(attributes),overlay=/editorial-image-credit|ai-image-credit/.test(a.class||'');
  if(/\bai-image-(?:credit|note)\b/.test(a.class||'')&&!/editorial-image-credit/.test(a.class||'')&&all.includes('>KI-generierte Darstellung<'))return all;
  const classes=(a.class||'').split(/\s+/).filter(c=>c&&c!=='editorial-image-credit'&&c!=='ai-image-note'&&c!=='ai-image-credit').concat(overlay?'ai-image-credit':'ai-image-note').join(' ');
  return `<${tag}${attributes.replace(/\sclass=(?:"[^"]*"|'[^']*')/,'')} class="${classes}">${AI_IMAGE_LABEL}</${tag}>`;
 });
 // Keep all original bytes except targeted insertions: the parser skips script,
 // style and comments so JSON and comparison operators cannot affect the stack.
 const nodes=[],stack=[],tokens=/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<\/?[a-zA-Z][\w:-]*\b(?:"[^"]*"|'[^']*'|[^'">])*>/g;
 for(const match of html.matchAll(tokens)){
  const tag=match[0];if(tag.startsWith('<!--')||/^<(?:script|style)\b/i.test(tag))continue;
  const name=tag.match(/^<\/?([\w:-]+)/)[1].toLowerCase();
  if(tag.startsWith('</')){for(let i=stack.length-1;i>=0;i--)if(stack[i].name===name){stack[i].end=match.index;stack.splice(i);break;}continue;}
  const node={name,start:match.index,openEnd:match.index+tag.length,end:match.index+tag.length,tag,a:attrs(tag),parent:stack.at(-1)};
  nodes.push(node);if(!voidTags.has(name)&&!tag.endsWith('/>'))stack.push(node);
 }
 const patches=[],hosts=new Map();
 const claim=(node,kind,visible=true)=>{if(node?.end>node?.openEnd){const prev=hosts.get(node);hosts.set(node,{kind,visible:visible||prev?.visible});}};
 const ancestor=(node,predicate)=>{for(let p=node.parent;p;p=p.parent)if(predicate(p))return p;};
 for(const node of nodes.filter(n=>n.name==='img'&&isAiImage(n.a.src))){
  const hero=ancestor(node,n=>n.name==='section'&&heroClass.test(n.a.class||''));
  if(hero){claim(hero,'hero');continue;}
  const visual=ancestor(node,n=>/\b(?:mag-card-visual|home-magazine-card)\b/.test(n.a.class||''));
  if(visual&&/class="[^"]*\bai-image-note\b/.test(html.slice(visual.openEnd,visual.end)))continue;
  const figure=ancestor(node,n=>n.name==='figure');
  if(figure){claim(figure,'image');continue;}
  const link=ancestor(node,n=>n.name==='a');
  // A pre-existing, accessible magazine note follows some decorative image links.
  if(link&&/home-magazine-image/.test(link.a.class||''))continue;
  if(link&&!link.a['aria-hidden'])claim(link,'image');
  else if(node.parent)claim(node.parent,'image');
 }
 for(const node of nodes.filter(n=>n.name==='section'&&heroClass.test(n.a.class||''))){
  const scenes=(node.a['data-hero-scenes']||'').split(',');
  const network=/network-hero/.test(node.a.class||'')&&/id="network-hero-config"/.test(html)&&/\/assets\/images\/(?:header-unique|netzwerk)\//.test(html);
  if(scenes.some(scene=>isAiImage('/assets/images/'+scene+'-1536.webp'))||network){
   const first=nodes.find(n=>n.name==='img'&&n.start>node.openEnd&&n.start<node.end&&/hero-scene-current/.test(n.a.class||''));
   claim(node,'hero',!!first&&isAiImage(first.a.src));
  }
 }
 for(const [host,{kind,visible}] of hosts){
  if(!host.a['data-ai-label-host'])patches.push({at:host.openEnd-1,text:` data-ai-label-host="${kind}"`});
  const content=html.slice(host.openEnd,host.end);
  if(!/class="[^"]*\bai-image-(?:credit|note)\b/.test(content))patches.push({at:host.end,text:`<span class="ai-image-credit" data-ai-image-label${visible?'':' hidden'}>${AI_IMAGE_LABEL}</span>`});
 }
 for(const patch of patches.sort((a,b)=>b.at-a.at))html=html.slice(0,patch.at)+patch.text+html.slice(patch.at);
 if(!html.includes('href="/assets/ai-image-labels.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/ai-image-labels.css"><script type="module" src="/assets/ai-image-labels.mjs"></script></head>');
 return html;
}

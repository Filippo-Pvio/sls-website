import {AI_IMAGE_LABEL,isAiImage} from './ai-image-policy.mjs';
const heroSelector='section.buy-intro,section.hero-premium,section.finance-intro';
const watched=new WeakSet();
function caption(host){
 let label=host.querySelector('.ai-image-credit');
 if(!label){label=document.createElement('span');label.className='ai-image-credit';label.dataset.aiImageLabel='';label.textContent=AI_IMAGE_LABEL;host.append(label);}
 return label;
}
function updateHero(hero){
 const images=[...hero.querySelectorAll('img')],visible=images.filter(img=>img.classList.contains('is-visible'));
 const label=hero.querySelector('.ai-image-credit');
 const generated=(visible.length?visible:images.filter(img=>img.classList.contains('hero-scene-current'))).some(img=>isAiImage(img.getAttribute('src')||''));
 if(generated||label){hero.dataset.aiLabelHost='hero';caption(hero).hidden=!generated;}
}
function refresh(){
 document.querySelectorAll(heroSelector).forEach(hero=>{
  updateHero(hero);
  if(!watched.has(hero)){watched.add(hero);new MutationObserver(()=>updateHero(hero)).observe(hero,{subtree:true,attributes:true,attributeFilter:['class','src'],childList:true});}
 });
 document.querySelectorAll('.ai-image-note,.mag-image-note,.home-magazine-image-note,.mag-article-visual figcaption,.profile-magazine-slide figcaption').forEach(note=>{
  if(/^KI-generier(?:te Teamszene|tes Symbolbild|te Darstellung)$/.test(note.textContent.trim())){
   if(note.textContent!==AI_IMAGE_LABEL)note.textContent=AI_IMAGE_LABEL;
   note.classList.add('ai-image-note');
  }
 });
 document.querySelectorAll('img').forEach(img=>{
  if(!isAiImage(img.getAttribute('src')||'')||img.closest(heroSelector))return;
  if(img.closest('.mag-card-visual,.home-magazine-card')?.querySelector('.ai-image-note'))return;
  const host=img.closest('figure')||img.closest('a');if(!host)return;
  if(host.matches('.home-magazine-image'))return;
  if(host.querySelector('.ai-image-note'))return;
  host.dataset.aiLabelHost='image';caption(host).hidden=false;
 });
}
let pending=false;
function schedule(){if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;refresh();});}}
refresh();
new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});

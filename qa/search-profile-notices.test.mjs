import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const browseSource=readFileSync(new URL('../assets/propstack-preview.js',import.meta.url),'utf8');
const placeSource=browseSource.slice(browseSource.indexOf('  function placeSearchProfileCta(){'),browseSource.indexOf('  function renderList'));
const profileSource=readFileSync(new URL('../assets/search-profile.js',import.meta.url),'utf8');
function node(card=false){
 const fields=new Map();
 return {card,dataset:{searchProfileSource:'pp-form'},hidden:false,classList:{remove(){},add(){}},
  querySelector(selector){if(!fields.has(selector))fields.set(selector,{textContent:''});return fields.get(selector)},
  cloneNode(){return node()},
  remove(){if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null}},
  insertAdjacentElement(position,other){assert.equal(position,'afterend');other.remove();this.parent.children.splice(this.parent.children.indexOf(this)+1,0,other);other.parent=this.parent}
 };
}
function fixture(){
 const cta=node(),grid={children:[],append(el){el.remove();this.children.push(el);el.parent=this},querySelectorAll(selector){return this.children.filter(el=>selector==='.pp-card-shell'?el.card:el.dataset.searchProfileRepeat)}};
 const context={searchProfileCta:cta,$:()=>grid,favoritesView:false,id:null,demo:false,loadingMore:false,catalogError:false,hasMore:true,all:[]};
 const place=runInNewContext(placeSource+'placeSearchProfileCta;',context);
 const append=count=>{cta.remove();for(let n=0;n<count;n++)grid.append(node(true));context.all=grid.children.filter(el=>el.card);place()};
 const positions=()=>{let count=0;return grid.children.flatMap(el=>el.card?(count++,[]):el.hidden?[]:[count])};
 return {cta,grid,context,place,append,positions};
}

test('infinite scrolling repeats after 9, 18 and 27 properties without counting notices as properties',()=>{
 const f=fixture();f.append(9);assert.deepEqual(f.positions(),[9]);
 f.append(9);assert.deepEqual(f.positions(),[9,18]);
 const repeat=f.grid.children.find(el=>el.dataset.searchProfileRepeat==='18');
 f.append(9);assert.deepEqual(f.positions(),[9,18,27]);
 assert.ok(f.grid.children.includes(repeat),'existing repeated notices are retained');
 f.context.hasMore=false;f.place();assert.deepEqual(f.positions(),[9,18,27],'no duplicate footer at exact multiple');
 assert.equal(f.cta.querySelector('[data-search-profile-open]').textContent,'Suchprofil anlegen');
});

test('short final pages get one ending notice; unfinished map batches wait for nine properties',()=>{
 const f=fixture();f.append(6);assert.deepEqual(f.positions(),[]);
 f.append(6);assert.deepEqual(f.positions(),[9]);
 f.context.hasMore=false;f.place();assert.deepEqual(f.positions(),[9,12]);
 f.place();assert.deepEqual(f.positions(),[9,12],'re-rendering never adds duplicates');
 const short=fixture();short.context.hasMore=false;short.append(4);assert.deepEqual(short.positions(),[4]);
});

test('filter/sort resets remove old notices, and an empty result retains a single useful prompt',()=>{
 const f=fixture();f.append(27);
 f.cta.remove();f.grid.children.forEach(el=>el.parent=null);f.grid.children=[];
 f.context.hasMore=false;f.append(3);assert.deepEqual(f.positions(),[3]);
 f.cta.remove();f.grid.children.forEach(el=>el.parent=null);f.grid.children=[];f.context.all=[];
 f.place();f.place();assert.deepEqual(f.positions(),[0]);
 assert.equal(f.cta.querySelector('strong').textContent,'Aktuell nichts Passendes gefunden?');
});

test('favorites, detail and demo views do not display the repeated search prompts',()=>{
 for(const mode of ['favoritesView','id','demo']){
  const f=fixture();f.append(18);f.context[mode]=true;f.place();assert.deepEqual(f.positions(),[]);
 }
});

test('late-added buttons share one search dialog, use current criteria and display validation at the clicked notice',()=>{
 const root=node(),late=node(),events=new Map(),dialogs=[];
 const source={reportValidity:()=>true,values:{type:'',city:'',price:'',area:'',rooms:''}};
 const parts=new Map();
 const dialog={innerHTML:'',showModal(){this.open=true},close(){this.open=false},addEventListener(){},querySelector(key){
  if(!parts.has(key))parts.set(key,{textContent:'',addEventListener(){}});return parts.get(key)
 }};
 const document={getElementById:()=>source,createElement:()=>dialog,body:{append(el){dialogs.push(el)}},querySelectorAll:()=>[root],addEventListener(type,fn){events.set(type,fn)}};
 const window={};
 runInNewContext(profileSource,{document,window,Intl,FormData:class{constructor(form){this.form=form}get(name){return this.form.values[name]}}});
 window.SLSSearchProfile.mount(late);
 assert.equal(dialogs.length,1,'only one dialog for all copies');
 const click=target=>events.get('click')({target:{closest:()=>({closest:()=>target})}});
 click(late);
 assert.equal(dialog.open,undefined);
 assert.match(late.querySelector('[data-search-profile-note]').textContent,/Suchkriterium/);
 assert.equal(root.querySelector('[data-search-profile-note]').textContent,'');
 source.values.city='Dorsten';source.values.rooms='3';click(late);
 assert.equal(dialog.open,true);
 assert.match(parts.get('[data-profile-criteria]').textContent,/Dorsten.*3 Zimmer/);
 assert.equal(late.querySelector('[data-search-profile-note]').textContent,'');
 dialog.close();source.values.city='Essen';click(root);
 assert.match(parts.get('[data-profile-criteria]').textContent,/Essen/);
});

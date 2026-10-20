import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,access} from 'node:fs/promises';
import {buildSignageContent,mixedProgramme,signageTopics} from '../lib/signage-content.mjs';
const root=new URL('../',import.meta.url),read=async name=>JSON.parse(await readFile(new URL(name,root),'utf8'));
test('all six topics use published evidence, valid local assets and matching QR destinations',async()=>{
 const profiles=await read('content/team/profiles.json'),reviews=await read('content/team/reviews.json'),tours=await read('content/videos/property-tours.generated.json');
 const topics=buildSignageContent(profiles,reviews,tours);assert.deepEqual(Object.keys(topics),Object.keys(signageTopics));
 assert.equal(topics.team.length,profiles.length);assert.equal(topics.videos.length,2);assert.equal(topics.ratgeber.length,6);
 for(const [kind,slides] of Object.entries(topics))for(const s of slides){
  assert.ok(s.title&&s.accent&&s.copy&&s.target);
  if(s.image.startsWith('/assets/'))await access(new URL(s.image.slice(1),root));if(s.portrait)await access(new URL(s.portrait.slice(1),root));
  const url=new URL(s.target,'https://sls.de');assert.ok(['sls.de','www.youtube.com'].includes(url.hostname));
  if(kind==='team')assert.ok(profiles.some(p=>url.pathname==='/team/'+p.slug+'/'));
  if(kind==='kundenstimmen'){const r=Object.values(reviews).find(r=>r.googleMapsUri===s.source);assert.ok(r);assert.ok(s.title.includes(r.excerpt));assert.ok(s.copy.includes('Google'));}
  if(kind==='ratgeber')assert.ok(url.searchParams.get('ratgeber'));
  if(kind==='videos')assert.equal(url.searchParams.get('v'),s.video);
 }
 assert.doesNotMatch(JSON.stringify(topics.kaeuferfinder),/garantiert|\d+ Käufer|\d+ Familien/);
 assert.equal(new Set(mixedProgramme.map(p=>p.path)).size,9);
});
test('frame bridge accepts only its own parent origin and dispatches once per transition',async()=>{
 const handlers={},events=[],parent={location:{origin:'https://sls.de',pathname:'/schaufenster/programm/'},postMessage(){}};const window={parent,addEventListener:(type,fn)=>handlers[type]=fn,dispatchEvent:event=>events.push(event)};
 vm.runInNewContext(await readFile(new URL('assets/schaufenster-bridge.js',root),'utf8'),{window,location:{origin:'https://sls.de'},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail}}});
 assert.equal(window.SLSSignagePaused,true);
 for(const event of [{origin:'https://evil.test',source:parent,data:{type:'sls-signage-active',active:true}},{origin:'https://sls.de',source:{},data:{type:'sls-signage-active',active:true}}])handlers.message(event);
 assert.equal(events.length,0);
 const message=active=>handlers.message({origin:'https://sls.de',source:parent,data:{type:'sls-signage-active',active}});
 message(true);message(true);assert.equal(events.length,1);assert.equal(window.SLSSignagePaused,false);message(false);assert.equal(events.length,2);assert.equal(window.SLSSignagePaused,true);
});
test('embedding in iiSignage or an unrelated same-origin page never pauses standalone playback',async()=>{
 const code=await readFile(new URL('assets/schaufenster-bridge.js',root),'utf8');
 for(const parent of [{get location(){throw Error('cross-origin')}},{location:{origin:'https://sls.de',pathname:'/other-page/'}}]){
  const window={parent,addEventListener(){}};vm.runInNewContext(code,{window,location:{origin:'https://sls.de'}});assert.equal(window.SLSSignagePaused,false);
 }
});
test('mixed programme visits every topic, pauses old frames and reuses them over multiple rounds',async()=>{
 const frames=[],intervals=[],listeners={};let now=100000;const wrapper={appendChild(frame){frames.push(frame);frame.onload()}};const fallback={hidden:false};
 const document={hidden:false,getElementById:id=>id==='programme'?wrapper:fallback,addEventListener:(type,fn)=>listeners[type]=fn,createElement(){return {dataset:{},contentDocument:{documentElement:{hasAttribute:()=>true}},contentWindow:{messages:[],postMessage(message){this.messages.push(message)}}}}};
 class Clock extends Date{static now(){return now}}
 const window={addEventListener:(type,fn)=>listeners[type]=fn};
 vm.runInNewContext(await readFile(new URL('assets/schaufenster-programm.js',root),'utf8'),{window,document,location:{origin:'https://sls.de'},URL,Map,Date:Clock,AbortController,setTimeout:()=>1,clearTimeout(){},setInterval:(fn,ms)=>intervals.push({fn,ms}),fetch:async()=>({ok:true,json:async()=>({programme:mixedProgramme})})});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(frames.length,1);assert.equal(fallback.hidden,true);
 const tick=intervals.find(t=>t.ms===500).fn;
 for(let round=0;round<3;round++)for(const entry of mixedProgramme){
  assert.equal(frames.filter(f=>!f.hidden).length,1);const active=frames.find(f=>!f.hidden);assert.equal(new URL(active.src).pathname,entry.path);
  now+=entry.seconds*1000+1;tick();assert.equal(active.contentWindow.messages.at(-1).active,false);
 }
 assert.equal(frames.length,9);document.hidden=true;const before=frames.find(f=>!f.hidden);now+=999999;tick();assert.equal(frames.find(f=>!f.hidden),before);listeners.visibilitychange();assert.equal(before.contentWindow.messages.at(-1).active,false);
 document.hidden=false;listeners.visibilitychange();assert.equal(before.contentWindow.messages.at(-1).active,true);
});
test('new topic templates have QR, no menu and parent bridge; guide deep links never submit forms',async()=>{
 for(const kind of Object.keys(signageTopics)){
  const html=await readFile(new URL('schaufenster/'+kind+'/index.html',root),'utf8');assert.match(html,/schaufenster-bridge\.js/);assert.match(html,/id="topic-qr-label"/);assert.match(html,/id="spotlight"/);assert.doesNotMatch(html,/data-site-header|<form|privacy-consent\.js/);
 }
 const guides=await readFile(new URL('assets/guides-page.js',root),'utf8');assert.match(guides,/data\.availableGuides\.includes\(requestedGuide\)/);assert.doesNotMatch(guides,/\.submit\(\)|requestSubmit\(/);
});
test('topic renderer rotates real content, keeps canonical QR links and silences/stops video players',async()=>{
 const data=await read('assets/schaufenster-content.json'),code=await readFile(new URL('assets/schaufenster-themen.js',root),'utf8');
 for(const kind of Object.keys(signageTopics)){
  const nodes=new Map(),intervals=[],listeners={},players=[];let now=100000;
  class Element{constructor(){this.attrs={};this.children=[];this.style={};this.classList={add(){},remove(){},toggle(){}};this.hidden=false}set href(v){this.attrs.href=v}getAttribute(k){return this.attrs[k]??null}set innerHTML(v){this.children=[v]}appendChild(n){this.children.push(n)}replaceChildren(...n){this.children=n}}
  const el=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id)};el('valuation-qr').href='https://sls.de'+(kind==='videos'?'/videos/':'/kontakt/');
  class Clock extends Date{static now(){return now}}
  const YT={Player:class{constructor(mount,opts){this.opts=opts;this.muted=false;players.push(this);opts.events.onReady({target:this})}mute(){this.muted=true}playVideo(){this.opts.events.onStateChange({data:1})}destroy(){this.destroyed=true}}};
  const window={SLSSignagePaused:false,YT,addEventListener:(n,f)=>listeners[n]=f};
  vm.runInNewContext(code,{window,YT,location:{origin:'https://preview.example',hostname:'preview.example'},URL,Date:Clock,AbortController,Image:class{set src(v){this.onload?.()}},setTimeout:()=>1,clearTimeout(){},setInterval:(fn,ms)=>intervals.push({fn,ms}),document:{hidden:false,documentElement:{getAttribute:()=>kind},head:{appendChild(){}},getElementById:el,createElement:()=>new Element(),addEventListener:(n,f)=>listeners[n]=f},qrcode:()=>({addData(){},make(){},createSvgTag:()=>'<svg/>'}),fetch:async()=>({ok:true,json:async()=>data})});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(el('valuation-title').textContent,data.topics[kind][0].title);
  const destination=new URL(data.topics[kind][0].target,'https://sls.de').href;assert.equal(el('valuation-qr').getAttribute('href'),destination);assert.doesNotMatch(destination,/preview/);
  window.SLSSignagePaused=true;now+=50000;intervals.find(t=>t.ms===250).fn();assert.equal(el('valuation-title').textContent,data.topics[kind][0].title);
  window.SLSSignagePaused=false;now+=40001;intervals.find(t=>t.ms===250).fn();await new Promise(resolve=>setImmediate(resolve));assert.equal(el('valuation-title').textContent,data.topics[kind][1].title);
  if(kind==='videos'){assert.ok(players.every(p=>p.muted));assert.equal(el('video-stage').hidden,false);listeners['sls-signage-activation']({detail:{active:false}});assert.equal(el('video-stage').hidden,true);assert.ok(players.at(-1).destroyed)}
 }
});

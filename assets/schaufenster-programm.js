(function(){
 'use strict';var programme=[],frames=new Map(),index=-1,started=0,loading=false;
 function fallback(show){document.getElementById('programme-fallback').hidden=!show}
 function activate(frame,active){if(frame?.contentWindow)frame.contentWindow.postMessage({type:'sls-signage-active',active:active},location.origin)}
 function prepare(at){
  var entry=programme[at];if(!entry||frames.has(entry.path))return frames.get(entry?.path);
  var url=new URL(entry.path,location.origin);if(url.origin!==location.origin||!url.pathname.startsWith('/schaufenster/')||url.pathname==='/schaufenster/programm/')return null;
  var frame=document.createElement('iframe');frame.title='SLS Schaufenster · '+entry.path;frame.hidden=true;frame.allow='autoplay';frame.src=url.href;frames.set(entry.path,frame);
  frame.onload=function(){try{frame.dataset.valid=String(Boolean(frame.contentDocument?.documentElement.hasAttribute('data-sls-signage')))}catch(_){frame.dataset.valid='false'}if(programme[index]?.path===entry.path){activate(frame,true);fallback(frame.dataset.valid!=='true')}};
  frame.onerror=function(){frame.dataset.valid='false';if(programme[index]?.path===entry.path)fallback(true)};document.getElementById('programme').appendChild(frame);return frame;
 }
 function show(at){
  if(!programme.length)return;
  if(index>=0){var old=frames.get(programme[index].path);activate(old,false);if(old)old.hidden=true}
  index=at%programme.length;started=Date.now();var frame=prepare(index);fallback(!frame||frame.dataset.valid!=='true');if(frame){frame.hidden=false;activate(frame,!document.hidden)}
 }
 async function load(){if(loading)return;loading=true;try{var controller=new AbortController(),timer=setTimeout(function(){controller.abort()},12000),response=await fetch('/assets/schaufenster-content.json',{signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error('programme unavailable');var data=await response.json();if(!Array.isArray(data.programme)||!data.programme.length)throw Error('empty programme');
   var entries=data.programme.filter(function(p){return typeof p.path==='string'&&Number.isFinite(p.seconds)&&p.seconds>=20&&p.seconds<=180});if(entries.length!==data.programme.length)throw Error('invalid programme');programme=entries;if(index<0)show(0);
  }catch(_){if(index<0)fallback(true)}finally{clearTimeout(timer);loading=false}}
 window.addEventListener('message',function(event){if(event.origin!==location.origin||event.data?.type!=='sls-signage-ready')return;frames.forEach(function(frame,path){if(event.source===frame.contentWindow)activate(frame,programme[index]?.path===path&&!document.hidden)})});
 setInterval(function(){if(index<0||document.hidden)return;var elapsed=Date.now()-started,duration=programme[index].seconds*1000;if(elapsed>=duration){show(index+1);return}if(duration-elapsed<10000)prepare((index+1)%programme.length)},500);
 setInterval(function(){if(index<0)load()},30000);
 document.addEventListener('visibilitychange',function(){if(index<0)return;activate(frames.get(programme[index].path),!document.hidden);if(!document.hidden)started=Date.now()});load();
})();

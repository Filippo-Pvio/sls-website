(function(){
 'use strict';
 var kind=document.documentElement.getAttribute('data-signage-topic'),slides=[],index=0,started=Date.now(),generation=0,front=0,player=null,apiPromise=null,activated=false;
 var duration=kind==='videos'?40000:20000,randomOrder=kind==='team'||kind==='videos';
 function el(id){return document.getElementById(id)}
 function shuffleSlides(previous){
  for(var i=slides.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),temp=slides[i];slides[i]=slides[j];slides[j]=temp}
  if(kind==='team'&&slides.length>1&&slides[0].target===previous){var first=slides[0];slides[0]=slides[1];slides[1]=first}
 }
 function qr(target,label){
  var url=new URL(target,'https://sls.de');
  if(!['sls.de','www.youtube.com',location.hostname].includes(url.hostname)||!['https:','http:'].includes(url.protocol))return;
  var card=el('valuation-qr');
  if(card.getAttribute('href')!==url.href||!el('qr-symbol').children.length){
   try{var code=qrcode(0,'Q');code.addData(url.href,'Byte');code.make();el('qr-symbol').innerHTML=code.createSvgTag({cellSize:4,margin:16,scalable:true});card.href=url.href}catch(_){el('qr-symbol').replaceChildren()}
  }
  el('topic-qr-label').textContent=label||'Mehr erfahren · Jetzt QR-Code scannen';
  el('topic-destination').textContent=url.hostname==='www.youtube.com'?'Roomtour auf YouTube':url.hostname+url.pathname;
 }
 function stopVideo(){if(player){try{player.destroy()}catch(_){}player=null}el('video-stage').hidden=true;el('video-stage').replaceChildren()}
 function youtube(){
  if(window.YT&&window.YT.Player)return Promise.resolve();
  if(apiPromise)return apiPromise;
  apiPromise=new Promise(function(resolve,reject){
   var timer=setTimeout(function(){reject(Error('video unavailable'))},10000);
   window.onYouTubeIframeAPIReady=function(){clearTimeout(timer);resolve()};
   var script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=function(){clearTimeout(timer);reject(Error('video unavailable'))};document.head.appendChild(script);
  }).catch(function(error){apiPromise=null;throw error});return apiPromise;
 }
 function play(slide,token){
  if(!slide.video||window.SLSSignagePaused||document.hidden)return;
  youtube().then(function(){
   if(token!==generation||window.SLSSignagePaused||document.hidden)return;
   var mount=document.createElement('div');mount.id='topic-youtube-player';el('video-stage').appendChild(mount);
   var watchdog=setTimeout(function(){if(token===generation)stopVideo()},12000);
   player=new YT.Player(mount,{host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',videoId:slide.video,
    playerVars:{autoplay:1,controls:0,playsinline:1,cc_load_policy:1,cc_lang_pref:'de',hl:'de',rel:0,origin:location.origin},
    events:{onReady:function(event){if(token!==generation)return;event.target.mute();event.target.playVideo()},
     onStateChange:function(event){if(token!==generation)return;if(event.data===1){clearTimeout(watchdog);el('video-stage').hidden=false}if(event.data===0)stopVideo()},
     onError:function(){clearTimeout(watchdog);if(token===generation)stopVideo()},onAutoplayBlocked:function(){clearTimeout(watchdog);if(token===generation)stopVideo()}}
   });
  }).catch(function(){/* The genuine preview and QR link remain usable. */});
 }
 function show(at){
  if(!slides.length)return;
  if(randomOrder&&at>=slides.length)shuffleSlides(slides[index].target);
  index=(at+slides.length)%slides.length;started=Date.now();var token=++generation,s=slides[index];stopVideo();
  el('display').classList.toggle('team-mode',kind==='team');el('display').classList.toggle('quote-mode',kind==='kundenstimmen');el('display').classList.toggle('video-mode',kind==='videos');
  el('valuation-title').textContent=s.title;el('valuation-accent').textContent=s.accent;el('valuation-copy').textContent=s.copy;
  el('topic-note').textContent=s.note||'';el('counter').textContent=(index+1)+' / '+slides.length;el('progress-fill').style.width='0%';
  el('topic-tags').replaceChildren();(s.tags||[]).forEach(function(text){var tag=document.createElement('span');tag.textContent=text;el('topic-tags').appendChild(tag)});
  qr(s.target,s.qrLabel);
  var portrait=el('spotlight');portrait.hidden=true;portrait.classList.toggle('book',Boolean(s.book));
  if(s.portrait){portrait.onload=function(){if(token===generation)portrait.hidden=false};portrait.onerror=function(){portrait.hidden=true};portrait.alt=s.book?'Ratgeber: '+s.title:s.title;portrait.src=s.portrait}
  if(kind==='videos')['photo-a','photo-b'].forEach(function(id){el(id).style.backgroundImage='none'});
  var image=new Image();image.onload=function(){if(token!==generation)return;front=1-front;var target=el(front?'photo-b':'photo-a'),old=el(front?'photo-a':'photo-b');target.style.backgroundImage='url('+JSON.stringify(s.image)+')';target.classList.add('visible');old.classList.remove('visible')};image.src=s.image;
  play(s,token);
 }
 async function load(){
  var controller=new AbortController(),timer=setTimeout(function(){controller.abort()},12000);
  try{var response=await fetch('/assets/schaufenster-content.json',{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('content unavailable');var data=await response.json();if(!Array.isArray(data.topics?.[kind])||!data.topics[kind].length)throw Error('empty topic');
   var fresh=data.topics[kind].slice();
   if(randomOrder){
    if(!slides.length){slides=fresh;shuffleSlides(null)}
    else{var current=slides[index].target,byTarget=new Map(fresh.map(function(s){return [s.target,s]}));
     slides=slides.filter(function(s){return byTarget.has(s.target)}).map(function(s){var updated=byTarget.get(s.target);byTarget.delete(s.target);return updated}).concat(Array.from(byTarget.values()));
     index=Math.max(0,slides.findIndex(function(s){return s.target===current}));
    }
   }else slides=fresh;
   if(started===0||index>=slides.length)index=0;show(index);
  }catch(_){/* Static first message and its QR target remain available. */}finally{clearTimeout(timer)}
 }
 setInterval(function(){if(window.SLSSignagePaused||document.hidden)return;var elapsed=Date.now()-started;if(elapsed>=duration){show(index+1);return}el('progress-fill').style.width=Math.min(100,elapsed/duration*100)+'%'},250);
 setInterval(load,900000);
 window.addEventListener('sls-signage-activation',function(event){if(event.detail.active){if(activated)show(index+1);else{activated=true;started=Date.now();play(slides[index]||{},generation)}}else stopVideo()});
 document.addEventListener('visibilitychange',function(){if(document.hidden)stopVideo();else if(!window.SLSSignagePaused)show(index)});
 qr(el('valuation-qr').getAttribute('href'));load();
})();

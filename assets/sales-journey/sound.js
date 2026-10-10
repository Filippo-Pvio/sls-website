/* Original score and locally synthesized effects; no microphone or external audio services. */
(() => {
  const journey=document.getElementById('sls-sales-journey');if(!journey)return;
  const assetBase=new URL(journey.dataset.assetsBase||'media/',document.currentScript.src);
  let totalDuration=169,cues=[],context,fxGain,musicGain,noise,musicBuffer,musicSource,decodePromise;
  let voiceBuffers=[],voiceSource=null,voiceEnabled=true,voicePlan=[],voiceOrigin=0,voiceIndex=-1;
  let active=new Set(),enabled=true,running=false,chapter=0,fired=new Set(),count=0,position=0,musicOrigin=0;
  const MUSIC=.16,DUCK=.035,FX=.65;
  const voiceLoads=new Map();
  function ensureMedia(){if(!context||!enabled)return;loadMusic();for(const plan of voicePlan.filter(v=>v.chapter===chapter||v.chapter===chapter+1))loadVoice(plan.file);}
  function loadVoice(file){if(!voiceEnabled||!context)return;if(voiceLoads.has(file))return voiceLoads.get(file);voiceLoads.set(file,fetch(new URL('voice-flow/narration-'+file+'.mp3?v=photos21',assetBase)).then(r=>{if(!r.ok)throw Error('Voice unavailable');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).then(buffer=>{voiceBuffers[file-1]=buffer;startVoice();status();}).catch(()=>{voiceLoads.delete(file);}));return voiceLoads.get(file);}
  function musicLevel(){return voiceSource ? .024 : MUSIC;}
  function stopVoice(){voiceIndex=-1;if(voiceSource){try{voiceSource.stop();}catch{}voiceSource=null;}}
  function scheduledVoice(){return voicePlan.findLastIndex(v=>v.chapter===chapter&&position>=v.start);}
  function startVoice(){if(voiceSource||!voiceEnabled||!enabled||!running||!context||document.hidden)return;const index=scheduledVoice();if(index<0)return;const plan=voicePlan[index],buffer=voiceBuffers[plan.file-1],offset=position-plan.start;if(offset<0)return;if(!buffer||offset>=buffer.duration)return;const source=context.createBufferSource();source.buffer=buffer;const gain=context.createGain();gain.gain.value=.9;source.connect(gain);gain.connect(context.destination);voiceSource=source;voiceIndex=index;voiceOrigin=context.currentTime-position;source.onended=()=>{if(voiceSource===source){voiceSource=null;if(musicGain)musicGain.gain.setTargetAtTime(MUSIC,context.currentTime,.2);}};source.start(0,offset);if(musicGain)musicGain.gain.setTargetAtTime(.024,context.currentTime,.04);}

  function loadMusic(){if(decodePromise)return decodePromise;decodePromise=fetch(new URL('sls-service-score.m4a?v=audio22',assetBase)).then(r=>{if(!r.ok)throw Error('Score unavailable');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b)).then(buffer=>{musicBuffer=buffer;startMusic();status();}).catch(()=>{decodePromise=null;status();});return decodePromise;}
  function status(){const b=journey.querySelector('#sound-toggle');if(!b)return;b.dataset.audioState=context?.state||'not-started';b.dataset.soundCount=String(count);b.dataset.enabled=String(enabled);b.dataset.musicState=musicSource?'playing':musicBuffer?'ready':'loading';b.dataset.musicGain=String(MUSIC);b.dataset.effectGain=String(FX);b.dataset.musicPosition=position.toFixed(2);b.dataset.voiceState=voiceSource?'playing':'idle';b.dataset.voiceChapter=String(chapter+1);b.dataset.voiceSegment=String(voicePlan[voiceIndex]?.file||0);}
  function stopMusic(){if(musicSource){try{musicSource.stop();}catch{}musicSource=null;}status();}
  function startMusic(){
    if(musicSource||!musicBuffer||!context||context.state!=='running'||!enabled||!running||document.hidden||position>=totalDuration)return;
    const source=context.createBufferSource();source.buffer=musicBuffer;source.connect(musicGain);musicSource=source;musicOrigin=context.currentTime-position;
    musicGain.gain.cancelScheduledValues(context.currentTime);musicGain.gain.setValueAtTime(0,context.currentTime);musicGain.gain.linearRampToValueAtTime(musicLevel(),context.currentTime+.12);
    source.onended=()=>{if(musicSource===source){musicSource=null;status();}};source.start(0,Math.max(0,position));status();
  }
  let mediaUnlock;
  function unlockMedia(){if(navigator.audioSession||!/iP(hone|ad|od)/.test(navigator.userAgent)&&!(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))return;if(!mediaUnlock){mediaUnlock=new window.Audio(new URL('unlock.wav',assetBase).href);mediaUnlock.loop=true;mediaUnlock.setAttribute('playsinline','');}if(mediaUnlock.paused)mediaUnlock.play().catch(()=>{});}
  async function activate(){
    try{
      // Declare intentional media playback so supported iPhones do not silence it.
      try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch{}
      unlockMedia();
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){enabled=false;status();return false;}
      if(!context){
        context=new Audio();fxGain=context.createGain();fxGain.gain.value=FX;musicGain=context.createGain();musicGain.gain.value=0;
        const limiter=context.createDynamicsCompressor();limiter.threshold.value=-6;limiter.knee.value=6;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.12;
        fxGain.connect(limiter);musicGain.connect(limiter);limiter.connect(context.destination);
        noise=context.createBuffer(1,Math.floor(context.sampleRate*.55),context.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
        context.addEventListener('statechange',status);
      }
      if(context.state!=='running')await context.resume();ensureMedia();startVoice();startMusic();status();return context.state==='running';
    }catch{enabled=false;status();return false;}
  }
  function track(source){active.add(source);source.onended=()=>active.delete(source);}
  function tone(freq,delay,length,level=.16,type='sine',endFreq){
    const now=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,now+length);g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(level,now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+length);o.connect(g);g.connect(fxGain);track(o);o.start(now);o.stop(now+length+.03);
  }
  function rustle(delay,length,level,frequency=2200,type='bandpass'){
    const now=context.currentTime+delay,src=context.createBufferSource(),f=context.createBiquadFilter(),g=context.createGain();src.buffer=noise;f.type=type;f.frequency.value=frequency;f.Q.value=.8;g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(level,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+length);src.connect(f);f.connect(g);g.connect(fxGain);track(src);src.start(now);src.stop(now+length+.02);
  }
  function play(kind){
    if(!enabled||!running||!context||context.state!=='running'||document.hidden)return;
    const now=context.currentTime;
    // Effects sit in front of the score. Longer accents get a longer quiet window.
    musicGain.gain.cancelScheduledValues(now);musicGain.gain.setValueAtTime(musicGain.gain.value,now);musicGain.gain.linearRampToValueAtTime(DUCK,now+.015);musicGain.gain.setValueAtTime(DUCK,now+(kind==='success'?1.05:.22));musicGain.gain.linearRampToValueAtTime(musicLevel(),now+(kind==='success'?1.4:.5));
    if(kind==='transition'){tone(210,0,.22,.045,'sine',300);}
    else if(kind==='paper'){rustle(0,.17,.25,3400);rustle(.05,.12,.14,5000);rustle(.11,.15,.09,2300);}
    else if(kind==='camera'){rustle(0,.035,.33,1600,'highpass');tone(185,0,.055,.2,'triangle',80);rustle(.065,.04,.22,2400,'highpass');}
    else if(kind==='scan'){tone(440,0,.4,.025,'sine',740);}
    else if(kind==='pulse'){tone(587.33,0,.16,.07);tone(880,.03,.21,.032);}
    else if(kind==='confirm'){tone(587.33,0,.27,.09);tone(739.99,.07,.34,.07);}
    else if(kind==='shimmer'){[880,1174.66,1479.98].forEach((f,i)=>tone(f,i*.08,.3,.055));}
    else if(kind==='key'){[1700,2600,2100].forEach((f,i)=>tone(f,i*.055,.22,.08));rustle(0,.12,.09,4200,'highpass');}
    else if(kind==='success'){[293.66,369.99,440,587.33].forEach((f,i)=>tone(f,i*.065,1.05,.07));}
    count++;const b=journey.querySelector('#sound-toggle');if(b){b.dataset.lastEffect=kind;b.dataset.lastCuePosition=position.toFixed(2);}status();
  }
  function stop(){mediaUnlock?.pause();stopVoice();stopMusic();for(const node of active){try{node.stop();}catch{}}active.clear();}
  journey.SlsSound={
    ready(){return Promise.all([loadMusic(),loadVoice(1)]);},
    configure(value,duration,plan){cues=value;totalDuration=duration;voicePlan=plan;},activate,
    setRunning(value,elapsed=position){position=elapsed;running=Boolean(value);if(!running)stop();else {if(enabled)unlockMedia();startVoice();startMusic();}status();},
    setEnabled(value){enabled=Boolean(value);if(!enabled)stop();else {if(enabled)unlockMedia();startVoice();startMusic();}status();},
    enabled(){return enabled;},
    setVoiceEnabled(value){voiceEnabled=Boolean(value);if(!voiceEnabled)stopVoice();else {ensureMedia();startVoice();}if(musicGain&&context)musicGain.gain.setTargetAtTime(musicLevel(),context.currentTime,.1);},
    enter(i,elapsed=position){for(const node of active){try{node.stop();}catch{}}active.clear();stopVoice();chapter=i;fired.clear();ensureMedia();if(Math.abs(elapsed-position)>.1){position=elapsed;stopMusic();}startVoice();startMusic();},
    tick(local,elapsed){position=elapsed;if(voiceSource&&voiceIndex!==scheduledVoice())stopVoice();if(voiceSource&&Math.abs(context.currentTime-voiceOrigin-position)>.15)stopVoice();startVoice();if(musicSource&&Math.abs(context.currentTime-musicOrigin-position)>.15){stopMusic();}startMusic();for(const [i,[time,kind]] of (cues[chapter]||[]).entries()){if(local>=time&&!fired.has(i)){fired.add(i);if(local-time<.18)play(kind);}}status();},
    refresh:status
  };
  journey.querySelector('#voice-toggle')?.addEventListener('click',()=>{voiceEnabled=!voiceEnabled;const b=journey.querySelector('#voice-toggle');b.setAttribute('aria-pressed',String(voiceEnabled));b.textContent=voiceEnabled?'Stimme an':'Stimme aus';journey.SlsSound.setVoiceEnabled(voiceEnabled);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('pagehide',()=>{stop();mediaUnlock?.pause();});
})();

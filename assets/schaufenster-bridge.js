(function(){
 'use strict';
 var controlled=false;
 try{controlled=window.parent!==window&&window.parent.location.origin===location.origin&&/^\/schaufenster\/programm(?:\/|$)/.test(window.parent.location.pathname)}catch(_){/* iiSignage may embed this page from another origin. */}
 window.SLSSignagePaused=controlled;
 window.addEventListener('message',function(event){
  if(!controlled||event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='sls-signage-active'||typeof event.data.active!=='boolean')return;
  if(window.SLSSignagePaused===!event.data.active)return;
  window.SLSSignagePaused=!event.data.active;
  window.dispatchEvent(new CustomEvent('sls-signage-activation',{detail:{active:event.data.active}}));
 });
 if(controlled)window.parent.postMessage({type:'sls-signage-ready'},location.origin);
})();

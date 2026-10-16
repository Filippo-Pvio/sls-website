// SLS Phase 1: privacy-gated conversion bridge. No personal data or form contents.
(() => {
  'use strict';
  const events = new Set(['contact_request_success','buyerfinder_request_success','guide_request_success']);
  const queue = [];
  const id = document.querySelector('meta[name="sls-ga4-id"]')?.content || '';
  const metaId = document.querySelector('meta[name="sls-meta-pixel-id"]')?.content || '';
  let analyticsStarted = false, marketingStarted = false;
  const permitted = category => window.SLSConsent?.allowed(category) === true;
  const inject = src => { const s=document.createElement('script');s.async=true;s.src=src;document.head.append(s); };
  function sync() {
    if (permitted('analytics') && !analyticsStarted && /^G-[A-Z0-9]+$/.test(id)) {
      analyticsStarted=true;
      window.dataLayer=window.dataLayer||[];
      window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
      window.gtag('js',new Date());
      window.gtag('config',id,{send_page_view:true});
      inject('https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id));
    }
    if (permitted('marketing') && !marketingStarted && /^[0-9]{8,25}$/.test(metaId)) {
      marketingStarted=true;
      const f=window.fbq=function(){f.callMethod?f.callMethod.apply(f,arguments):f.queue.push(arguments);};
      f.queue=[];f.loaded=true;f.version='2.0';
      inject('https://connect.facebook.net/en_US/fbevents.js');
      f('init',metaId);f('track','PageView');
    }
    if (!analyticsStarted && !marketingStarted) return;
    while(queue.length) {
      const e=queue.shift();
      if(permitted('analytics') && analyticsStarted) window.gtag('event',e.event,{event_category:'lead',...e.parameters});
      if(permitted('marketing') && marketingStarted) window.fbq('trackCustom',e.event,e.parameters);
    }
  }
  window.addEventListener('sls:consent-change',sync);
  window.addEventListener('sls:conversion',event=>{
    const detail=event.detail||{};
    if(!events.has(detail.event))return;
    const parameters={};
    if(detail.event==='contact_request_success')parameters.topic=String(detail.topic||'').slice(0,60);
    if(detail.event==='guide_request_success')parameters.guide=String(detail.guide||'').slice(0,40);
    queue.push({event:detail.event,parameters});
    sync();
  });
  document.addEventListener('DOMContentLoaded',sync,{once:true});
  sync();
})();

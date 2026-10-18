// Basic Consent Mode v2. Exact relaunch hosts; sls.de is prepared on this branch only.
(() => {
  'use strict';
  if (window.SLSTracking) return;
  const container = 'GTM-PSH7R4R8';
  const previewHost = 'sls-website-git-feat-consent-tracking-phas-a6ca65-info-91172609.vercel.app';
  const productionHost = 'sls-website-eight.vercel.app';
  const cutoverPreviewHost = 'sls-website-git-feat-domain-cutover-20261018-info-91172609.vercel.app';
  const canonicalHost = 'sls.de';
  const enabled = [previewHost, productionHost, cutoverPreviewHost, canonicalHost].includes(location.hostname);
  const events = new Set(['contact_request_success', 'buyerfinder_request_success',
    'guide_request_success', 'search_profile_success', 'property_inquiry_success',
    'sales_report_success']);
  let started = false;
  const permitted = () => window.SLSConsent?.allowed('analytics') === true;
  window.dataLayer = window.dataLayer || [];
  const gtag = function () { window.dataLayer.push(arguments); };
  const consent = granted => ({analytics_storage: granted ? 'granted' : 'denied',
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    personalization_storage: 'denied'});
  gtag('consent', 'default', consent(false));
  gtag('set', 'ads_data_redaction', true);
  gtag('set', 'url_passthrough', false);
  const safePage = () => location.origin + location.pathname;
  function clearCookies() {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0];
      if (!/^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name)) continue;
      for (const domain of ['', location.hostname, '.' + location.hostname]) {
        document.cookie = name + '=; Max-Age=0; Path=/' +
          (domain ? '; Domain=' + domain : '') + '; SameSite=Lax; Secure';
      }
    }
  }
  function sync() {
    if (!enabled) return;
    const granted = permitted();
    if (!granted) {
      if (started) {
        window.SLSTracking.disabled = true;
        gtag('consent', 'update', consent(false));
        clearCookies();
      }
      return;
    }
    if (started) return;
    started = true;
    gtag('consent', 'update', consent(true));
    window.dataLayer.push({event: 'sls_analytics_ready', sls_page_location: safePage(),
      sls_page_referrer: '', sls_page_title: 'SLS Website Relaunch'});
    window.dataLayer.push({'gtm.start': Date.now(), event: 'gtm.js'});
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + container;
    document.head.append(script);
  }
  window.SLSTracking = {enabled, container, disabled: false};
  window.addEventListener('sls:consent-change', sync);
  window.addEventListener('sls:conversion', ({detail = {}}) => {
    // Drop events without current permission. No form fields or identifiers.
    if (!enabled || !permitted() || !started || window.SLSTracking.disabled || !events.has(detail.event)) return;
    window.dataLayer.push({event: detail.event, sls_page_location: safePage(),
      sls_page_referrer: '', sls_page_title: 'SLS Website Relaunch'});
  });
  sync();
})();

// One agency container, released only by the visitor's current consent.
(() => {
  'use strict';
  if (window.SLSTracking) return;
  const container = 'GTM-W3LWF7C6';
  const previewHosts = [];
  const hosts = new Set(['sls.de', 'sls-website-eight.vercel.app', ...previewHosts]);
  const enabled = hosts.has(location.hostname);
  const events = new Set(['contact_request_success', 'buyerfinder_request_success',
    'guide_request_success', 'search_profile_success', 'property_inquiry_success',
    'sales_report_success']);
  const released = new Set();
  let started = false, disabled = false, previous = null;
  const allowed = category => window.SLSConsent?.allowed(category) === true;
  const permissions = () => ({analytics: allowed('analytics'), clarity: allowed('clarity'), marketing: allowed('marketing')});
  const consent = p => ({analytics_storage: p.analytics ? 'granted' : 'denied',
    ad_storage: p.marketing ? 'granted' : 'denied', ad_user_data: p.marketing ? 'granted' : 'denied',
    ad_personalization: p.marketing ? 'granted' : 'denied',
    personalization_storage: 'denied'});
  window.dataLayer = window.dataLayer || [];
  const gtag = function () { window.dataLayer.push(arguments); };
  gtag('consent', 'default', consent({}));
  gtag('set', 'ads_data_redaction', true);
  gtag('set', 'url_passthrough', false);
  // Retain attribution, never arbitrary query strings, form values or URL fragments.
  const campaignKeys = new Set(['utm_source','utm_medium','utm_campaign','utm_id',
    'utm_term','utm_content','utm_source_platform','utm_creative_format','utm_marketing_tactic']);
  const clickKeys = new Set(['gclid','gbraid','wbraid','fbclid']);
  function safePage() {
    const query = new URLSearchParams();
    for (const [key,value] of new URLSearchParams(location.search)) {
      if (query.has(key)) continue;
      if (clickKeys.has(key) && /^[A-Za-z0-9_-]{1,512}$/.test(value)) query.set(key,value);
      if (campaignKeys.has(key) && /^[\p{L}\p{N} ._~:/+\-]{1,200}$/u.test(value)) query.set(key,value);
    }
    return location.origin + location.pathname + (query.size ? '?' + query : '');
  }
  function safeReferrer() {
    try {
      const ref = new URL(document.referrer);
      if (!['https:','http:'].includes(ref.protocol)) return '';
      // External origin identifies search/referral sources without exposing their queries.
      return ref.origin + (ref.origin === location.origin ? ref.pathname : '/');
    } catch { return ''; }
  }
  const payload = event => ({event, sls_page_location: safePage(),
    sls_page_referrer: safeReferrer(), sls_page_title: String(document.title || 'SLS Website').slice(0,300)});
  function clearCookies(categories) {
    const patterns = [];
    if (categories.analytics) patterns.push(/^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/);
    if (categories.clarity) patterns.push(/^_clck$|^_clsk$/);
    if (categories.marketing) patterns.push(/^_gcl_|^_fbp$|^_fbc$/);
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0];
      if (!patterns.some(pattern => pattern.test(name))) continue;
      for (const domain of ['', location.hostname, '.' + location.hostname]) {
        document.cookie = name + '=; Max-Age=0; Path=/' +
          (domain ? '; Domain=' + domain : '') + '; SameSite=Lax; Secure';
      }
    }
  }
  function sync() {
    if (!enabled || disabled) return;
    const current = permissions();
    const revoked = Object.fromEntries(Object.keys(current).map(key => [key, Boolean(previous?.[key] && !current[key])]));
    if (Object.values(revoked).some(Boolean)) {
      // The consent manager reloads immediately after this event, terminating loaded SDKs.
      disabled = true;
      window.SLSTracking.disabled = true;
      gtag('consent', 'update', consent(current));
      if (typeof window.fbq === 'function' && revoked.marketing) window.fbq('consent', 'revoke');
      if (typeof window.clarity === 'function' && revoked.clarity) window.clarity('consentv2', {ad_Storage:'denied', analytics_Storage:'denied'});
      clearCookies(revoked);
      return;
    }
    previous = current;
    if (!Object.values(current).some(Boolean)) return;
    window.dataLayer.push({sls_tracking_bridge:'sls-agency-v1', sls_clarity_allowed:current.clarity});
    gtag('consent', 'update', consent(current));
    // Queue Clarity's own consent before its GTM template can load the SDK.
    if (current.clarity && !released.has('clarity')) {
      window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
      window.clarity('consentv2', {ad_Storage:'denied', analytics_Storage:'granted'});
    }
    for (const category of Object.keys(current)) {
      if (!current[category] || released.has(category)) continue;
      released.add(category);
      window.dataLayer.push(payload('sls_' + category + '_ready'));
    }
    if (started) return;
    started = true;
    window.dataLayer.push({'gtm.start': Date.now(), event:'gtm.js'});
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + container;
    document.head.append(script);
  }
  window.SLSTracking = {enabled, container, disabled:false};
  window.addEventListener('sls:consent-change', sync);
  window.addEventListener('sls:conversion', ({detail = {}}) => {
    if (!enabled || disabled || !events.has(detail.event)) return;
    // Each destination has its own consent gate. No pre-consent outcomes are replayed.
    if (allowed('analytics') && released.has('analytics')) window.dataLayer.push(payload(detail.event));
    if (allowed('marketing') && released.has('marketing')) {
      window.dataLayer.push({...payload('sls_marketing_conversion'), sls_conversion_name:detail.event});
    }
  });
  sync();
})();

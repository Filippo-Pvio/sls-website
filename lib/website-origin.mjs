const workingHost = 'sls-website-eight.vercel.app';
const publicHosts = new Set(['sls.de', 'www.sls.de']);

export function guideHostAllowed(host, env = process.env) {
  if (env.VERCEL_ENV === 'production') {
    return host === workingHost || (env.SLS_PUBLIC_DOMAIN_ACTIVE === 'true' && publicHosts.has(host));
  }
  return (env.VERCEL_ENV === 'preview' && /^[a-z0-9-]+\.vercel\.app$/.test(host))
    || (env.NODE_ENV !== 'production' && /^localhost(?::\d+)?$/.test(host));
}

// Use only known hosts, never forwarded headers or an arbitrary supplied Origin.
export function privacyPolicyUrl(req, env = process.env) {
  const host = String(req?.headers?.host || '').toLowerCase();
  if (host === workingHost || publicHosts.has(host)
    || (env.VERCEL_ENV === 'preview' && /^[a-z0-9-]+\.vercel\.app$/.test(host))) {
    return `https://${host}/datenschutz/`;
  }
  if (env.NODE_ENV !== 'production' && /^localhost(?::\d+)?$/.test(host)) {
    return `http://${host}/datenschutz/`;
  }
  return `https://${workingHost}/datenschutz/`;
}

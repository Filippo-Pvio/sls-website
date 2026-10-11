// Read-only checks: no forms, consent changes, emails or CRM writes.
import {performance} from 'node:perf_hooks';

const base = new URL(process.argv[2] || 'https://sls-website-eight.vercel.app');
if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash
  || base.pathname !== '/' || !['sls-website-eight.vercel.app', 'sls.de'].includes(base.hostname)) {
  throw new Error('Use the exact working origin or https://sls.de, without credentials or parameters.');
}
const staged = base.hostname !== 'sls.de';
const results = [];
async function check(path, inspect) {
  const start = performance.now();
  try {
    const response = await fetch(new URL(path, base), {redirect:'manual', signal:AbortSignal.timeout(20000)});
    const body = await response.text();
    const findings = inspect(response, body);
    results.push({path, status:response.status, milliseconds:Math.round(performance.now()-start),
      ok:findings.length === 0, findings});
  } catch {
    results.push({path, ok:false, findings:['Request failed or timed out.']});
  }
}
const page = (path, privatePage=false) => check(path, (r, body) => {
  const findings=[];
  if(r.status!==200) findings.push('Expected HTTP 200.');
  if(!body.includes('<h1')) findings.push('Missing first-level heading.');
  if(!body.includes('https://sls.de'+path)) findings.push('Expected canonical not found.');
  const noindex = /noindex/i.test(r.headers.get('x-robots-tag') || '') || /name="robots"[^>]*content="[^"]*noindex/i.test(body);
  if((staged || privatePage) && !noindex) findings.push('Expected noindex protection.');
  if(!staged && !privatePage && noindex) findings.push('Public page is still noindex.');
  if(path==='/datenschutz/' &&  /<a\b[^>]*href="https:\/\/sls\.de\/datenschutz\/"/i.test(body)) findings.push('Privacy page contains old self-reference.');
  if(path==='/datenschutz/' && !body.includes('Datenschutzbeauftragten')) findings.push('Data protection officer contact missing.');
  return findings;
});
await Promise.all([
  page('/'),page('/kontakt/'),page('/downloads/'),page('/datenschutz/',true),
  page('/immobilien/'),page('/referenzen/'),page('/newsletter/',true),
  check('/api/newsletter/',(r,b)=>{try{return r.status===200&&typeof JSON.parse(b).securityToken==='string'?[]:['Newsletter endpoint unavailable.'];}catch{return ['Newsletter endpoint is not valid JSON.'];}}),
  check('/robots.txt',(r,b)=>r.status===200 && b.includes('https://sls.de/sitemap.xml') ? []:['Robots/sitemap declaration missing.']),
  check('/sitemap.xml',(r,b)=>r.status===200 && b.includes('<sitemapindex') ? []:['Sitemap index unavailable.']),
  check('/api/propstack-guide-request/',(r,b)=>{
    if(r.status!==200) return ['Guide readiness endpoint unavailable.'];
    try {const d=JSON.parse(b);return d.deliveryReady===true && d.availableGuides?.length===6 ? []:['Not all six guides are ready.'];}
    catch{return ['Readiness is not valid JSON.'];}
  }),
  check('/api/propstack-contact-request/',(r,b)=>{
    if(r.status!==200) return ['Contact readiness endpoint unavailable.'];
    try {const d=JSON.parse(b);return d.availableTopics?.length===5 && d.callbackAvailable===true ? []:['Contact topics or callback missing.'];}
    catch{return ['Readiness is not valid JSON.'];}
  }),
  check('/docs/security-operations.md',(r)=>[403,404].includes(r.status) ? []:['Internal documentation is publicly exposed.']),
  check('/config/seo-entity.mjs',(r)=>[403,404].includes(r.status) ? []:['Internal configuration is publicly exposed.']),
  check('/sls-readiness-missing-page/',(r)=>r.status===404 ? []:['Missing page should return 404.'])
]);
results.sort((a,b)=>a.path.localeCompare(b.path));
console.log(JSON.stringify({checkedAt:new Date().toISOString(),origin:base.origin,mode:staged?'prelaunch':'public',
  note:'HTTP timings are single requests, not Core Web Vitals. No writes or delivery tests.',
  passed:results.filter(r=>r.ok).length,total:results.length,results},null,2));
if(results.some(r=>!r.ok))process.exitCode=1;

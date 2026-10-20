import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {prepareConsentHtml} from '../lib/consent-html.mjs';
import {LANDING_PAGES} from '../lib/contact-request.mjs';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
test('campaign pages keep a native consent-independent form, canonical URL and noindex policy',async()=>{
 for(const [kind,path] of Object.entries(LANDING_PAGES)){
  const html=await read(path.slice(1)+'index.html'),prepared=prepareConsentHtml(html);
  assert.match(html,/<meta name="robots" content="noindex,follow">/);
  assert.ok(html.includes('href="https://sls.de'+path+'"'));assert.match(html,new RegExp('data-landing="'+kind+'"'));
  assert.equal((html.match(/<h1>/g)||[]).length,1);assert.equal((html.match(/data-step="[012]"/g)||[]).length,3);
  assert.match(html,/name="privacy" type="checkbox" required/);assert.doesNotMatch(html,/<iframe|data-site-header|data-site-footer|gtag\(|fbq\(/);
  assert.match(prepared,/privacy-consent\.js/);assert.match(prepared,/sls-tracking\.js/);
  for(const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g))await access(new URL(match[1].slice(1),root));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 }
});
test('campaign ad drafts stay unactivated, match actual offers and respect text limits',async()=>{
 const drafts=JSON.parse(await read('config/owner-campaign-drafts.json'));
 assert.equal(drafts.status,'draft-not-activated');assert.equal(drafts.region,null);assert.equal(drafts.monthlyBudget,null);
 for(const campaign of drafts.campaigns){
  assert.equal(campaign.urlExpansion,false);assert.ok(Object.values(LANDING_PAGES).some(path=>campaign.finalUrl==='https://sls.de'+path));
  for(const title of campaign.headlines)assert.ok(title.length<=30,title+' ('+title.length+')');
  for(const description of campaign.descriptions)assert.ok(description.length<=90,description+' ('+description.length+')');
  assert.doesNotMatch(JSON.stringify(campaign),/garantiert|höchstpreis|sofortiger Immobilienwert/i);
 }
});

test('online valuation campaign reuses the existing gated provider without a parallel enquiry or false conversion',async()=>{
 const html=await read('lp/immobilienwert-online/index.html');
 assert.match(html,/<meta name="robots" content="noindex,follow">/);
 assert.match(html,/https:\/\/sls.de\/lp\/immobilienwert-online\//);
 assert.match(html,/<iframe id="fisher-widget"[^>]*><\/iframe>/);
 assert.doesNotMatch(html,/<iframe[^>]*\ssrc=|owner-form|owner-landing\.js/);
 assert.match(html,/src="\/assets\/pricehubble-widget.js"/);
 assert.match(html,/href="\/lp\/immobilienbewertung\/"/);
 const loader=await read('assets/pricehubble-widget.js');
 assert.match(loader,/SLSConsent\?\.mount\('tools'/);assert.match(loader,/consentGranted: false/);
 assert.doesNotMatch(await read('assets/online-valuation-landing.js'),/contact_request_success|postMessage|dataLayer/);
 const prepared=prepareConsentHtml(html);assert.match(prepared,/privacy-consent\.js/);
 for(const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g))await access(new URL(match[1].slice(1),root));
});

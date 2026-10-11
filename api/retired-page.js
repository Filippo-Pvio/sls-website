import {prepareConsentHtml} from '../lib/consent-html.mjs';
import {prepareSiteSeo} from '../lib/site-seo.mjs';
export default function handler(req,res){
 res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, follow');
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return res.status(405).end();}
 const html='<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Frühere Seite nicht mehr veröffentlicht | SLS Immobilienpartner</title><meta name="robots" content="noindex,follow"><meta name="description" content="Diese frühere Seite wird nicht mehr veröffentlicht. Entdecken Sie aktuelle Immobilien und öffentliche Referenzen von SLS Immobilienpartner."><link rel="stylesheet" href="/assets/styles.css"></head><body><header class="site-header" data-site-header></header><main id="main"><section class="section"><div class="wrap"><h1>Diese frühere Seite wird nicht mehr veröffentlicht.</h1><p>Hier finden Sie unsere <a href="/immobilien/">aktuellen Immobilien</a> und <a href="/referenzen/">öffentlichen Referenzen</a>. Bei Fragen zu einem früheren Angebot <a href="/kontakt/">sprechen Sie uns gerne an</a>.</p></div></section></main><footer class="site-footer" data-site-footer></footer><script src="/assets/site.js" defer></script></body></html>';
 return res.status(410).end(req.method==='HEAD'?'':prepareConsentHtml(prepareSiteSeo(html,'/')).replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi,''));
}

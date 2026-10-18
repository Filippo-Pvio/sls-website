import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {prepareConsentHtml} from '../lib/consent-html.mjs';

test('HTML cannot start external iframe/thumbnail requests before the manager executes',()=>{
 const raw='<html><head><title>Test</title></head><body><iframe src="https://www.instagram.com/reel/example/embed/"></iframe><iframe data-external-src="https://calculator.justhome.com/"></iframe><img src="https://i.ytimg.com/vi/example/hqdefault.jpg"><img src="/assets/photo.webp"></body></html>';
 const html=prepareConsentHtml(raw);
 assert.ok(html.indexOf('/assets/privacy-consent.js')<html.indexOf('<title>'));
 assert.match(html,/data-consent-src="https:\/\/www.instagram.com/);
 assert.match(html,/data-external-src="https:\/\/calculator.justhome.com/);
 assert.match(html,/data-consent-image="https:\/\/i.ytimg.com/);
 assert.doesNotMatch(html,/<iframe[^>]*\ssrc=/);
 assert.match(html,/<img src="\/assets\/photo.webp">/);
 assert.equal(prepareConsentHtml(html),html);
});

test('every public HTML page has the manager and no parser-active external frames',async()=>{
 const output=new URL('../.site-output/',import.meta.url);
 const pages=(await readdir(output,{recursive:true})).filter(name=>name.endsWith('.html'));assert.ok(pages.length>100);
 for(const page of pages){const html=await readFile(new URL(page,output),'utf8');assert.match(html,/src="\/assets\/privacy-consent.js"/,page);assert.doesNotMatch(html,/<iframe\b[^>]*\ssrc=["']https?:/i,page);assert.doesNotMatch(html,/<img\b[^>]*\ssrc=["']https?:\/\/i\.ytimg\.com/i,page);}
});

test('all optional tab-storage callers use the consent-controlled facade',async()=>{
 for(const name of ['home-magazine.js','home-references.js','profile-magazine.js','city-properties.js','sia-widget.js']){
  const src=await readFile(new URL('../assets/'+name,import.meta.url),'utf8');assert.doesNotMatch(src,/\bsessionStorage\.(getItem|setItem)/,name);
 }
});

test('legal pages remain readable on a first visit while optional services stay denied',async()=>{
 const {default:vm}=await import('node:vm');
 const code=await readFile(new URL('../assets/privacy-consent.js',import.meta.url),'utf8');
 for(const pathname of ['/datenschutz/','/datenschutz','/impressum/','/karriere/datenschutz/','/kontakt/']){
  let opens=0;const listeners={};
  const control={addEventListener(){},focus(){},getClientRects(){return []}};
  const dialog={setAttribute(){},querySelector(){return control},addEventListener(){},showModal(){opens++;this.open=true}};
  const document={readyState:'loading',activeElement:null,createElement:()=>dialog,querySelectorAll:()=>[],body:{append(){},classList:{add(){},remove(){}}},addEventListener:(name,fn)=>{listeners[name]=fn}};
  const window={addEventListener(){}};
  vm.runInNewContext(code,{window,document,location:{pathname},localStorage:{getItem:()=>null,removeItem(){}},MutationObserver:class{observe(){}},Date,URL});
  listeners.DOMContentLoaded();
  assert.equal(opens,pathname==='/kontakt/'?1:0,pathname);
  for(const category of ['analytics','media','maps','tools','comfort'])assert.equal(window.SLSConsent.allowed(category),false,pathname+':'+category);
 }
});

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

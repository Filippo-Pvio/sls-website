import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareAiImageLabels} from '../lib/ai-image-labels.mjs';
import {isAiImage} from '../assets/ai-image-policy.mjs';
const page=body=>`<!doctype html><html><head><title>Bildprüfung</title></head><body>${body}</body></html>`;
test('known generated collections are labelled; supplied photos, real listings, logos and portraits are not',()=>{
 for(const src of ['/assets/images/header-unique/008-test-1536.webp','/assets/images/team-local-20261026/heiden-hero-900.webp','/assets/images/guides-hero/beratung-1536.webp','/assets/images/tanja-hero/tanja-1-1536.webp','/assets/images/magazin/articles/test-600.jpg'])assert.ok(isAiImage(src),src);
 for(const src of ['/assets/images/team-scenes/anfragen-1280.webp','/assets/imported/Dennis-Sahlmen-768x768.jpg','/assets/images/immowelt-platin.svg','https://images.propstack.de/house.jpg','/assets/images/videos/video.jpg']){
  assert.ok(!isAiImage(src),src);
  assert.ok(!prepareAiImageLabels(page(`<figure><img src="${src}"></figure>`)).includes('data-ai-label-host='),src);
 }
});
test('new and old city hero/content images receive the same note, once, including without JavaScript',()=>{
 for(const dir of ['header-unique','team-local-20261026','guides-hero']){
  const html=prepareAiImageLabels(page(`<section class="buy-intro"><div><img class="hero-scene-current is-visible" src="/assets/images/${dir}/bild-1536.webp"></div></section><figure class="city-image"><img src="/assets/images/${dir}/beratung-1536.webp"></figure>`));
  assert.equal((html.match(/>KI-generierte Darstellung</g)||[]).length,2);
  assert.ok(html.includes('data-ai-label-host="hero"'));
  assert.ok(html.includes('data-ai-label-host="image"'));
  assert.equal(prepareAiImageLabels(html),html);
 }
});
test('mixed slideshows start without an AI note on a supplied photo and provide a hook for later generated slides',()=>{
 const html=prepareAiImageLabels(page('<section class="hero hero-premium" data-hero-scenes="team-scenes/anfragen,header-unique/second"><img class="hero-scene-current is-visible" src="/assets/images/team-scenes/anfragen-1280.webp"><img class="hero-scene-next"></section>'));
 assert.ok(html.includes('data-ai-label-host="hero"'));
 assert.ok(html.includes('data-ai-image-label hidden>KI-generierte Darstellung'));
});
test('existing magazine and team notes are unified without duplicate captions or changed JSON',()=>{
 const html=prepareAiImageLabels(page('<script type="application/json">{"text":"<section> >"}</script><figure><img src="/assets/images/magazin/articles/test.jpg"><figcaption>KI-generiertes Symbolbild</figcaption></figure><section class="buy-intro"><img class="hero-scene-current" src="/assets/images/team-local-20261026/test.webp"><p class="editorial-image-credit">KI-generierte Teamszene</p></section>'));
 assert.equal((html.match(/>KI-generierte Darstellung</g)||[]).length,2);
 assert.ok(!html.includes('Symbolbild'));assert.ok(!html.includes('Teamszene'));
 assert.ok(html.includes('{"text":"<section> >"}'));
 assert.equal(prepareAiImageLabels(html),html);
});

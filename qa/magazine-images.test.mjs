import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const articles=JSON.parse(fs.readFileSync('content/magazin/articles.json','utf8'));
const index=JSON.parse(fs.readFileSync('assets/magazine-search.json','utf8'));
test('each article has unique optimized photos shared with search and article metadata',()=>{
 assert.equal(articles.length,65);assert.equal(new Set(articles.map(a=>a.image.src)).size,65);
 for(const a of articles){
  for(const [url,width] of [[a.image.src,1200],[a.image.thumbnail,600]]){
   const b=fs.readFileSync('.'+url);assert.ok(b.length<500000,url+' exceeds image budget');assert.equal(b.readUInt16BE(0),0xffd8);
   let i=2,dimensions;while(i<b.length){assert.equal(b[i],255);const marker=b[i+1],size=b.readUInt16BE(i+2);if([0xc0,0xc1,0xc2].includes(marker)){dimensions=[b.readUInt16BE(i+7),b.readUInt16BE(i+5)];break;}i+=2+size;}
   assert.deepEqual(dimensions,[width,width*2/3]);
  }
  const html=fs.readFileSync(a.slug+'/index.html','utf8');assert.ok(html.includes('<figure class="mag-article-visual'));assert.ok(html.includes(a.image.src));assert.ok(html.includes('KI-generiertes Symbolbild'));
  const entry=index.find(x=>x.url==='/'+a.slug+'/');assert.equal(entry.image,a.image.thumbnail);assert.equal(entry.imageLarge,a.image.src);assert.equal(entry.imageNote,'KI-generiertes Symbolbild');
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chooseArticleIds } from '../assets/home-magazine.js';

const root = path.resolve(import.meta.dirname, '..');
test('random choices always include latest, stay unique and allow every recent article', () => {
  const pool = ['latest', 'a', 'b', 'c', 'd', 'e'];
  const choices = new Set(), orders = new Set();
  let seed = 2026;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 100; i++) {
    const chosen = chooseArticleIds(pool, random);
    assert.equal(chosen.length, 3);
    assert.equal(new Set(chosen).size, 3);
    assert(chosen.includes('latest'));
    chosen.forEach(id => { assert(pool.includes(id)); choices.add(id); });
    orders.add(chosen.join(','));
  }
  assert.equal(choices.size, 6);
  assert(orders.size > 10);
  assert.deepEqual(pool, ['latest', 'a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(chooseArticleIds([]), []);
  assert.deepEqual(chooseArticleIds(['only']), ['only']);
});

test('publishing one article updates both magazine and home; draft and future articles stay out', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sls-home-magazine-'));
  try {
    for (const file of ['scripts/build-magazine.mjs', 'index.html', 'sitemap.xml', 'content/magazin/articles.json', 'content/magazin/sources.json','team/filippo-livera/index.html','team/mischa-stratmann/index.html','team/dennis-sahlmen/index.html']) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.copyFileSync(path.join(root, file), path.join(dir, file));
    }
    const data = JSON.parse(fs.readFileSync(path.join(dir, 'content/magazin/articles.json')));
    const today = new Date().toISOString().slice(0, 10);
    data.push({ ...data[0], id: 999, slug: 'qa-neuer-beitrag', title: 'QA neuer Beitrag', datePublished: today, status: 'published', category: 'energie' });
    data.push({ ...data[0], id: 1000, slug: 'qa-entwurf', datePublished: today, status: 'draft' });
    data.push({ ...data[0], id: 1001, slug: 'qa-zukunft', datePublished: '2099-01-01' });
    fs.writeFileSync(path.join(dir, 'content/magazin/articles.json'), JSON.stringify(data));
    const build = spawnSync(process.execPath, [path.join(dir, 'scripts/build-magazine.mjs')], { encoding: 'utf8' });
    assert.equal(build.status, 0, build.stderr);
    const home = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    const ids = [...home.matchAll(/data-magazine-id="([^"]+)"/g)].map(m => m[1]);
    assert.equal(ids.length, 6);
    assert.equal(ids[0], 'qa-neuer-beitrag');
    const expected = data.filter(a => (!a.status || a.status === 'published') && a.datePublished <= today).sort((a,b) => b.datePublished.localeCompare(a.datePublished) || a.id - b.id).slice(0,6).map(a => a.slug);
    assert.deepEqual(ids, expected);
    const blog = fs.readFileSync(path.join(dir, 'blog/index.html'), 'utf8');
    assert(blog.includes('QA neuer Beitrag'));
    const profile=fs.readFileSync(path.join(dir,'team/filippo-livera/index.html'),'utf8');
    const section=profile.match(/<!-- PROFILE-MAGAZINE:START -->[\s\S]*?<!-- PROFILE-MAGAZINE:END -->/)[0];
    assert(section.includes('qa-neuer-beitrag'));
    assert(!section.includes('qa-entwurf'));
    assert(!section.includes('qa-zukunft'));
    const expectedOwn=data.filter(a=>a.editorialAuthor==='Filippo Livera' && (!a.status||a.status==='published')&&a.datePublished<=today).sort((a,b)=>b.datePublished.localeCompare(a.datePublished)||a.id-b.id).slice(0,6).map(a=>a.slug);
    assert.deepEqual([...section.matchAll(/data-magazine-id="([^"]+)"/g)].map(m=>m[1]),expectedOwn);
    assert(!home.includes('qa-entwurf'));
    assert(!home.includes('qa-zukunft'));
    assert(!blog.includes('/qa-entwurf/'));
    assert(!blog.includes('/qa-zukunft/'));
    assert(!fs.existsSync(path.join(dir, 'qa-entwurf/index.html')));
    const unchanged = spawnSync(process.execPath, [path.join(dir, 'scripts/build-magazine.mjs')]);
    assert.equal(unchanged.status, 0);
    assert.equal(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), home);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

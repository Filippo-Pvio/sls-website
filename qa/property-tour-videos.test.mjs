import test from 'node:test';
import assert from 'node:assert/strict';
import {collectPropertyTours} from '../lib/property-tour-videos.mjs';
const page=(html,route='/neue-seite/',profile)=>({html,route,profile,person:profile?'Neue Kollegin':undefined});
test('new Instagram and YouTube roomtours appear from pages outside team profiles',()=>{
 const list=collectPropertyTours([page('<figure><iframe src="https://www.instagram.com/reel/abcdefghijk/embed/" title="Roomtour: Ein Zuhause im Grünen"></iframe></figure>'),page('<iframe src="https://www.youtube-nocookie.com/embed/12345678901" title="Rundgang durch eine Wohnung"></iframe>','/magazin/neuer-artikel/')]);
 assert.deepEqual(list.map(x=>x.provider).sort(),['instagram','youtube']);assert.equal(list.length,2);
});
test('duplicate videos are attributed to the profile and appear once',()=>{
 const html='<article><div data-reel-id="abcdefghijk"></div><h3>Roomtour: Gartenhaus</h3></article>';
 const list=collectPropertyTours([page(html),page(html,'/team/neue-kollegin/','neue-kollegin')]);assert.equal(list.length,1);assert.equal(list[0].person,'Neue Kollegin');
});
test('interviews and unrelated videos do not enter the property carousel',()=>{
 const list=collectPropertyTours([page('<a data-video-id="o0hvSO41MOI" data-video-title="Roomtour"></a><iframe src="https://www.youtube.com/embed/abcdefghijk" title="Persönliche Vorstellung"></iframe>')]);assert.equal(list.length,0);
});
test('explicit property-tour classification supports titles without roomtour keywords',()=>{
 const list=collectPropertyTours([page('<article data-video-category="property-tour"><div data-reel-id="abcdefghijk"></div><h3>Ein neuer Blick</h3></article>')]);assert.equal(list.length,1);assert.equal(list[0].title,'Ein neuer Blick');
});
test('removed videos disappear even when earlier editorial metadata exists',()=>{
 assert.deepEqual(collectPropertyTours([page('<h1>Neue Seite ohne Video</h1>')],[{id:'abcdefghijk',provider:'instagram',title:'Altes Video'}]),[]);
});

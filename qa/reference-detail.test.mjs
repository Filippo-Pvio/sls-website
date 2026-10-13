import test from 'node:test';
import assert from 'node:assert/strict';
import {projectReferenceDetail,loadReferenceDetail,referenceSummary} from '../lib/reference-detail.mjs';
import {referenceDetailMain} from '../lib/reference-detail-page.mjs';
const item={id:'42',title:'Ein Haus mit Charakter',city:'Marl',image:'https://example.org/hero.jpg'};
const unit={id:42,status:{name:'Verkauft'},marketing_type:'BUY',rs_type:'HOUSE',living_space:120,price:999999,street:'PRIVATE ADDRESS',description_note:'Ein helles Haus mit Garten. Vereinbaren Sie jetzt einen Termin. Zwei Etagen bieten viel Platz.',internal_note:'PRIVATE NOTE',images:[{is_private:false,big_url:item.image},{is_private:true,big_url:'https://example.org/PRIVATE.jpg'},{big_url:'https://example.org/UNKNOWN.jpg'},{is_private:false,is_floorplan:true,url:'https://example.org/plan.jpg'}],floorplans:[{url:'https://example.org/PRIVATE.pdf',is_private:true,on_landing_page:true},{url:'https://example.org/UNKNOWN.pdf'},{url:'https://example.org/plan.pdf',on_landing_page:true}],links:[{title:'360 Rundgang',url:'https://my.matterport.com/show/?m=public',on_landing_page:true},{title:'Video',url:'https://example.org/PRIVATE-video',is_private:true,on_landing_page:true}],custom_fields:{verkaufsmakler:{value:1},einkaufsmakler:{value:2}}};
test('projection exposes only published media and facts, and resolves both roles with general reviews',()=>{
 const p=projectReferenceDetail(unit,item,[{id:1,name:'Dennis Sahlmen'},{id:2,name:'Nico Hryn'}]);
 const json=JSON.stringify(p);assert.doesNotMatch(json,/PRIVATE|UNKNOWN|999999/);
 assert.equal(p.images.length,1);assert.equal(p.floorplans.length,2);assert.equal(p.media.length,1);
 assert.deepEqual(p.people.map(x=>[x.slug,x.roles]),[['dennis-sahlmen',['sale']],['nico-hryn',['acquisition']]]);
 const html=referenceDetailMain(p);assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.match(html,/Eine persönliche Google-Bewertung zur Zusammenarbeit/);assert.match(html,/Einkaufsbegleitung/);
 assert.match(html,/data-consent-src=/);assert.doesNotMatch(html,/<iframe src=/);
 assert.match(html,/href="\/immobilienbewertung\/"/);assert.doesNotMatch(html,/PRIVATE|UNKNOWN|999999/);
});
test('historical summaries remove stale solicitations and keep complete short sentences',()=>{assert.equal(referenceSummary(unit.description_note),'Ein helles Haus mit Garten. Zwei Etagen bieten viel Platz.');assert.equal(referenceSummary('Eins zwei. Drei vier fünf.',3),'Eins zwei.');});
test('detail rechecks sold status and ID and makes only GET requests',async()=>{
 let calls=0;
 const request=async(url,options)=>{calls++;assert.equal(options.method,undefined);return {ok:true,json:async()=>url.includes('/brokers')?[]:unit}};
 assert.ok(await loadReferenceDetail(item,'fixture',{request}));assert.equal(calls,2);
 for(const changed of [{...unit,status:{name:'Vermarktung'}},{...unit,id:43},{...unit,marketing_type:'RENT'}])assert.equal(await loadReferenceDetail(item,'fixture',{request:async()=>({ok:true,json:async()=>changed})}),null);
});

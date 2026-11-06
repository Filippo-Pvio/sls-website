import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {prepareAttributionContainer,completionNames} from '../scripts/prepare-attribution-container.mjs';
const templates=JSON.parse(readFileSync(new URL('../docs/tracking/gtm-relaunch-cutover.json',import.meta.url))).containerVersion.tag;
function baseline(){
 const config=structuredClone(templates.find(t=>t.type==='googtag'));
 const event=structuredClone(templates.find(t=>t.type==='gaawe'));
 const names=['Google tag (existing Analytics)','Confirmed requests (existing Analytics)','pageview_immobilienbewertung','pageview_verkaufen'];
 return {containerVersion:{container:{publicId:'GTM-W3LWF7C6'},accountId:'1',containerId:'2',
  tag:names.map((n,i)=>({...structuredClone(i?event:config),tagId:String(i+1),name:'SLS Relaunch | '+n})).concat([{tagId:'9',name:'Other agency tag',type:'html',parameter:[]}]),
  variable:[{variableId:'1',name:'SLS Relaunch | Bridge',type:'v'}],trigger:[{triggerId:'1',name:'Unchanged trigger'}],customTemplate:[{templateId:'1',name:'Unchanged template'}]}};
}
test('attribution merge changes only four existing Google tags and adds scoped Meta Lead objects',()=>{
 const input=baseline(),before=structuredClone(input),out=prepareAttributionContainer(input).containerVersion;
 assert.deepEqual(input,before);assert.deepEqual(out.tag.find(t=>t.tagId==='9'),before.containerVersion.tag.find(t=>t.tagId==='9'));
 assert.deepEqual(out.trigger[0],before.containerVersion.trigger[0]);assert.deepEqual(out.customTemplate,before.containerVersion.customTemplate);
 assert.equal(out.tag.length,6);assert.equal(out.variable.length,4);assert.equal(out.trigger.length,2);
 for(const t of out.tag.slice(0,4)){
  assert.match(JSON.stringify(t),/\{\{SLS Relaunch \| Page Referrer\}\}/);assert.match(JSON.stringify(t),/\{\{SLS Relaunch \| Page Title\}\}/);
  assert.doesNotMatch(JSON.stringify(t),/SLS Website Relaunch/);
 }
 const lead=out.tag.at(-1),trigger=out.trigger.at(-1);
 assert.equal(lead.consentSettings.consentStatus,'NEEDED');assert.doesNotMatch(JSON.stringify(lead.consentSettings),/analytics_storage/);
 assert.match(JSON.stringify(trigger),/sls-agency-v1/);for(const n of completionNames)assert.ok(JSON.stringify(trigger).includes(n));
});
test('Meta sends one targeted Lead with only the fixed completion name',()=>{
 const tag=prepareAttributionContainer(baseline()).containerVersion.tag.at(-1);
 const html=tag.parameter.find(p=>p.key==='html').value;
 for(const name of completionNames){
  const calls=[];vm.runInNewContext(html.replace(/^<script>\n|\n<\/script>$/g,'').replace('{{SLS Relaunch | Conversion Name}}',name),{fbq:(...args)=>calls.push(args)});
  assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(0,3),['trackSingle','1640129720298425','Lead']);assert.equal(calls[0][3].content_name,name);
  assert.doesNotMatch(JSON.stringify(calls),/email|phone|address|propertyId/);
 }
});
test('wrong container, unexpected templates and repeated migration stop for review',()=>{
 const b=baseline();b.containerVersion.container.publicId='GTM-WRONG';assert.throws(()=>prepareAttributionContainer(b));
 const c=baseline();c.containerVersion.tag.shift();assert.throws(()=>prepareAttributionContainer(c));
 assert.throws(()=>prepareAttributionContainer(prepareAttributionContainer(baseline())));
});

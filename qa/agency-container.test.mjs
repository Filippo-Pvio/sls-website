import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareAgencyContainer} from '../scripts/prepare-agency-container.mjs';
import {prepareTrackingScript} from '../lib/tracking-release.mjs';
const relaunch=JSON.parse(readFileSync(new URL('../docs/tracking/gtm-relaunch-cutover.json',import.meta.url),'utf8'));
const param=(key,value)=>({type:'TEMPLATE',key,value});
function original(){return {exportFormatVersion:2,containerVersion:{accountId:'123',containerId:'456',container:{publicId:'GTM-W3LWF7C6'},tag:[
 {tagId:'26',name:'Agency linker',type:'gclidw',firingTriggerId:['1']},
 {tagId:'53',name:'Agency Google',type:'googtag',parameter:[param('tagId','G-5CDDRCTXCM')],firingTriggerId:['2']},
 {tagId:'55',name:'Agency Clarity',type:'cvt_agency_template',parameter:[param('projectId','t3vffd89eo')],firingTriggerId:['3']},
 {tagId:'56',name:'Agency Meta',type:'html',parameter:[param('html','existing fbq init 1640129720298425')],firingTriggerId:['4']},
 ...['pageview_immobilienbewertung','pageview_verkaufen'].map((e,i)=>({tagId:String(58+i),name:e,type:'gaawe',parameter:[param('eventName',e)],firingTriggerId:['5']})),
 {tagId:'65',name:'Other existing tag',type:'html',parameter:[param('html','doNotChangeThis')],firingTriggerId:['5'],blockingTriggerId:['6']}
 ],trigger:[{triggerId:'1',name:'Old Borlabs',type:'CUSTOM_EVENT'}],variable:[{variableId:'20',name:'Other variable',type:'c',parameter:[param('value','preserve')]}],customTemplate:[{templateId:'1',name:'Existing Clarity template',templateData:'preserve'}]}};}
test('existing tags, triggers, templates and variables are preserved for other websites',()=>{
 const input=original(),snapshot=structuredClone(input),out=prepareAgencyContainer(input,relaunch).containerVersion;
 assert.deepEqual(input,snapshot);
 assert.deepEqual(out.trigger[0],snapshot.containerVersion.trigger[0]);assert.deepEqual(out.variable[0],snapshot.containerVersion.variable[0]);assert.deepEqual(out.customTemplate,snapshot.containerVersion.customTemplate);
 const block=out.trigger.find(t=>t.name.includes('Block legacy'));
 for(const old of snapshot.containerVersion.tag){const tag=out.tag.find(t=>t.tagId===old.tagId);const restored={...tag};if(old.blockingTriggerId)restored.blockingTriggerId=old.blockingTriggerId;else delete restored.blockingTriggerId;assert.deepEqual(restored,old);assert.ok(tag.blockingTriggerId.includes(block.triggerId));}
 assert.equal(block.filter[0].parameter[1].value,'sls-agency-v1');
});
test('new tags use only old asset IDs and separate consent; completions are retained',()=>{
 const out=prepareAgencyContainer(original(),relaunch).containerVersion;const tags=out.tag.filter(t=>t.name.startsWith('SLS Relaunch | '));
 assert.equal(tags.length,7);assert.doesNotMatch(JSON.stringify(tags),/G-CPX5L89D4H|GTM-PSH7R4R8/);
 const ga=tags.find(t=>t.type==='googtag');assert.ok(JSON.stringify(ga).includes('G-5CDDRCTXCM'));
 const clarity=tags.find(t=>t.type==='cvt_agency_template');assert.equal(clarity.parameter[0].value,'t3vffd89eo');assert.equal(clarity.consentSettings.consentStatus,'NOT_NEEDED');const ct=out.trigger.find(t=>t.triggerId===clarity.firingTriggerId[0]);assert.match(JSON.stringify(ct),/Clarity Consent/);assert.match(JSON.stringify(ct),/sls_clarity_ready/);
 for(const t of tags.filter(t=>t!==clarity))assert.equal(t.consentSettings.consentStatus,'NEEDED');
 const complete=out.trigger.find(t=>t.name.includes('Confirmed request'));assert.match(JSON.stringify(complete),/sales_report_success/);assert.match(JSON.stringify(complete),/contact_request_success/);
 const eventTag=tags.find(t=>t.name.includes('Confirmed requests'));assert.equal(eventTag.parameter.find(p=>p.key==='eventName').value,'{{Event}}');
 for(const kind of ['tag','trigger','variable']){const ids=out[kind].map(x=>x[kind+'Id']);assert.equal(new Set(ids).size,ids.length);}
});
test('wrong container, changed tag set and repeated imports stop rather than overwrite',()=>{
 const wrong=original();wrong.containerVersion.container.publicId='GTM-OTHER';assert.throws(()=>prepareAgencyContainer(wrong,relaunch));
 const changed=original();changed.containerVersion.tag.shift();assert.throws(()=>prepareAgencyContainer(changed,relaunch));
 const imported=prepareAgencyContainer(original(),relaunch);assert.throws(()=>prepareAgencyContainer(imported,relaunch));
});
test('a localized existing Event variable is referenced without creating a conflicting alias',()=>{
 const input=original();input.containerVersion.builtInVariable=[{name:'Ereignis',type:'EVENT'}];const out=prepareAgencyContainer(input,relaunch).containerVersion;
 const tag=out.tag.find(t=>t.name.includes('Confirmed requests'));
 assert.equal(tag.parameter.find(p=>p.key==='eventName').value,'{{Ereignis}}');assert.equal(out.builtInVariable.length,1);
});
test('preview permissions are injected only for this reviewed branch and valid project hosts',()=>{
 const source='const previewHosts = [];';const branch='fix/restore-agency-tracking-20261103';
 const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:branch,VERCEL_BRANCH_URL:'sls-website-branch-test.vercel.app',VERCEL_URL:'evil.example'};
 assert.equal(prepareTrackingScript(source,env),'const previewHosts = ["sls-website-branch-test.vercel.app"];');
 for(const patch of [{VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'other'}])assert.equal(prepareTrackingScript(source,{...env,...patch}),source);
});

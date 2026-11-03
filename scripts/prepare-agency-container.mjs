// Merge into an exported agency container. Never publish or call Google from this script.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const text=(key,value)=>({type:'TEMPLATE',key,value});
const condition=(type,left,right)=>({type,parameter:[text('arg0',left),text('arg1',right)]});
const list=values=>({type:'LIST',list:values.map(value=>({type:'TEMPLATE',value}))});
const consent=keys=>({consentStatus:'NEEDED',consentType:list(keys)});
const eventNames=['contact_request_success','buyerfinder_request_success','guide_request_success','search_profile_success','property_inquiry_success','sales_report_success'];
export function prepareAgencyContainer(original,relaunch) {
  const result=structuredClone(original),cv=result.containerVersion;
  if(cv?.container?.publicId!=='GTM-W3LWF7C6')throw new Error('Expected agency container GTM-W3LWF7C6.');
  if((cv.tag||[]).some(t=>t.name.startsWith('SLS Relaunch | ')))throw new Error('Migration is already present. Export/review the current workspace instead of importing twice.');
  const ga=(cv.tag||[]).find(t=>t.type==='googtag'&&t.parameter?.some(p=>p.key==='tagId'&&p.value==='G-5CDDRCTXCM'));
  const linker=(cv.tag||[]).find(t=>t.type==='gclidw');
  const meta=(cv.tag||[]).find(t=>t.type==='html'&&t.parameter?.some(p=>p.key==='html'&&p.value?.includes('1640129720298425')));
  const clarity=(cv.tag||[]).find(t=>t.parameter?.some(p=>p.key==='projectId'&&p.value==='t3vffd89eo'));
  const pageTags=(cv.tag||[]).filter(t=>t.type==='gaawe'&&t.parameter?.some(p=>p.key==='eventName'&&['pageview_immobilienbewertung','pageview_verkaufen'].includes(p.value)));
  if(!ga||!linker||!meta||!clarity||pageTags.length!==2)throw new Error('Published agency tag set changed; inspect the export before continuing.');
  const generated=(kind)=>{
    const collection=cv[kind]||=[];
    let next=Math.max(0,...collection.map(item=>Number(item[kind+'Id'])||0));
    return item=>{const value={...item,accountId:cv.accountId,containerId:cv.containerId,[kind+'Id']:String(++next)};collection.push(value);return value;};
  };
  const addVariable=generated('variable'),addTrigger=generated('trigger'),addTag=generated('tag');
  const bridge='SLS Relaunch | Bridge',page='SLS Relaunch | Page Location';
  const eventVariable=(cv.builtInVariable||[]).find(v=>v.type==='EVENT')?.name||'Event';
  if(!(cv.builtInVariable||[]).some(v=>v.type==='EVENT')){
    (cv.builtInVariable||=[]).push({accountId:cv.accountId,containerId:cv.containerId,name:eventVariable,type:'EVENT'});
  }
  for(const [name,key] of [[bridge,'sls_tracking_bridge'],[page,'sls_page_location'],['SLS Relaunch | Clarity Consent','sls_clarity_allowed']]){
    if(cv.variable.some(v=>v.name===name))throw new Error('Variable name collision: '+name);
    addVariable({name,type:'v',parameter:[text('name',key),{type:'INTEGER',key:'dataLayerVersion',value:'2'}]});
  }
  const bridgeFilter=()=>condition('EQUALS','{{'+bridge+'}}','sls-agency-v1');
  function trigger(name,event,filters=[]){return addTrigger({name:'SLS Relaunch | '+name,type:'CUSTOM_EVENT',customEventFilter:[condition('MATCH_REGEX','{{_event}}',event)],filter:[bridgeFilter(),...filters]});}
  const block=trigger('Block legacy tags only on the new website','.*');
  // Preserve original tags and their old/Borlabs triggers for other existing websites.
  const legacyTags=[...cv.tag];
  for(const tag of legacyTags)tag.blockingTriggerId=[...new Set([...(tag.blockingTriggerId||[]),block.triggerId])];
  const analytics=trigger('Statistics granted','^sls_analytics_ready$');
  const marketing=trigger('Marketing granted','^sls_marketing_ready$');
  const googleReady=trigger('Google consent granted','^sls_(analytics|marketing)_ready$');
  const clarityReady=trigger('Clarity granted','^sls_clarity_ready$',[condition('EQUALS','{{SLS Relaunch | Clarity Consent}}','true')]);
  const complete=trigger('Confirmed request','^('+eventNames.join('|')+')$');
  const copy=(tag,name,ready,needed)=>{
    const clone=structuredClone(tag);
    for(const key of ['tagId','fingerprint','path','tagManagerUrl','blockingTriggerId','setupTag','teardownTag','monitoringMetadata','monitoringMetadataTagNameKey'])delete clone[key];
    clone.name='SLS Relaunch | '+name;clone.firingTriggerId=[ready.triggerId];clone.consentSettings=needed.length?consent(needed):{consentStatus:'NOT_NEEDED'};
    return addTag(clone);
  };
  // The new configuration/event tag templates already implement safe page parameters.
  const base=relaunch.containerVersion.tag.find(t=>t.type==='googtag');
  const request=relaunch.containerVersion.tag.find(t=>t.type==='gaawe');
  if(!base||!request)throw new Error('Missing native relaunch Google tag templates.');
  const remap=tag=>JSON.parse(JSON.stringify(tag).replaceAll('G-CPX5L89D4H','G-5CDDRCTXCM').replaceAll('{{SLS Page Location}}','{{'+page+'}}').replaceAll('{{Event}}','{{'+eventVariable+'}}'));
  const config=copy(remap(base),'Google tag (existing Analytics)',googleReady,[]);
  // Its pre-existing Google tag also routes to Ads. Google's built-in consent checks
  // honor the separately chosen storage/data/personalization states; a Google opt-in
  // is required before this once-per-load tag can fire.
  const settings=config.parameter.find(p=>p.key==='configSettingsTable');
  settings.list=settings.list.filter(row=>!row.map?.some(p=>p.key==='parameter'&&p.value==='allow_ad_personalization_signals'));
  config.priority={type:'INTEGER',value:'10'};
  const completions=copy(remap(request),'Confirmed requests (existing Analytics)',complete,['analytics_storage']);
  // Built-in Event variable is available in every container; no obsolete event alias is retained.
  const eventParam=completions.parameter.find(p=>p.key==='eventName');eventParam.value='{{'+eventVariable+'}}';
  for(const old of pageTags){
    const event=old.parameter.find(p=>p.key==='eventName').value;
    const part=event==='pageview_verkaufen'?'verkaufen':'immobilienbewertung';
    const ready=trigger(event,'^sls_analytics_ready$',[condition('MATCH_REGEX','{{'+page+'}}','^https://[^/]+/'+part+'/?$')]);
    const tag=copy(remap(request),event,ready,['analytics_storage']);tag.parameter.find(p=>p.key==='eventName').value=event;
  }
  copy(linker,'Google Ads conversion linker',marketing,['ad_storage','ad_user_data','ad_personalization']);
  copy(meta,'Meta pixel (existing pixel)',marketing,['ad_storage','ad_user_data','ad_personalization']);
  // Clarity uses its own separately gated consentv2 state, independent of Google analytics_storage.
  copy(clarity,'Microsoft Clarity (existing project)',clarityReady,[]);
  // No global container settings, existing variables, templates, IDs or non-SLS triggers changed.
  delete cv.fingerprint;delete cv.path;delete cv.tagManagerUrl;
  result.exportTime=new Date().toISOString();
  return result;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  const [input,output]=process.argv.slice(2);
  if(!input||!output)throw new Error('Usage: node scripts/prepare-agency-container.mjs <agency-export.json> <merged-import.json>');
  const original=JSON.parse(await readFile(input,'utf8'));
  const relaunch=JSON.parse(await readFile(path.join(root,'docs/tracking/gtm-relaunch-cutover.json'),'utf8'));
  await writeFile(output,JSON.stringify(prepareAgencyContainer(original,relaunch),null,2)+'\n');
  console.log('Prepared merged agency import; no account or live configuration was changed.');
}

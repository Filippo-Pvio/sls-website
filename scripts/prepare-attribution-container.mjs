// Merge only reviewed attribution/Meta changes into a fresh agency export.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const text=(key,value)=>({type:'TEMPLATE',key,value});
const condition=(type,left,right)=>({type,parameter:[text('arg0',left),text('arg1',right)]});
export const completionNames=['contact_request_success','buyerfinder_request_success','guide_request_success','search_profile_success','property_inquiry_success','sales_report_success'];
export function prepareAttributionContainer(original){
 const result=structuredClone(original),cv=result.containerVersion;
 if(cv?.container?.publicId!=='GTM-W3LWF7C6')throw new Error('Wrong container.');
 const expected=['Google tag (existing Analytics)','Confirmed requests (existing Analytics)','pageview_immobilienbewertung','pageview_verkaufen'];
 const tags=expected.map(name=>cv.tag.find(t=>t.name==='SLS Relaunch | '+name));
 if(tags.some(t=>!t)||!cv.variable.some(v=>v.name==='SLS Relaunch | Bridge'))throw new Error('Expected reviewed relaunch configuration.');
 if(cv.tag.some(t=>t.name==='SLS Relaunch | Meta Lead (confirmed request)'))throw new Error('Already migrated; review current workspace.');
 const add=kind=>{
  let id=Math.max(0,...cv[kind].map(v=>Number(v[kind+'Id'])||0));
  return value=>{const item={...value,accountId:cv.accountId,containerId:cv.containerId,[kind+'Id']:String(++id)};cv[kind].push(item);return item;};
 };
 const addVariable=add('variable'),addTrigger=add('trigger'),addTag=add('tag');
 for(const [name,key] of [['Page Referrer','sls_page_referrer'],['Page Title','sls_page_title'],['Conversion Name','sls_conversion_name']]){
  if(cv.variable.some(v=>v.name==='SLS Relaunch | '+name))throw new Error('Variable collision.');
  addVariable({name:'SLS Relaunch | '+name,type:'v',parameter:[text('name',key),{type:'INTEGER',key:'dataLayerVersion',value:'2'}]});
 }
 for(const tag of tags){
  const table=tag.parameter.find(p=>['configSettingsTable','eventSettingsTable','eventParameters'].includes(p.key)&&p.type==='LIST');
  if(!table)throw new Error('Missing settings table: '+tag.name);
  for(const [key,variable] of [['page_referrer','Page Referrer'],['page_title','Page Title']]){
   const row=table.list.find(r=>r.map.some(p=>p.value===key&&['parameter','name'].includes(p.key)));
   if(!row)throw new Error('Missing '+key+' on '+tag.name);
   const value=row.map.find(p=>['parameterValue','value'].includes(p.key));
   if(!value)throw new Error('Missing parameter value.');
   value.value='{{SLS Relaunch | '+variable+'}}';
  }
 }
 const trigger=addTrigger({name:'SLS Relaunch | Marketing confirmed request',type:'CUSTOM_EVENT',
  customEventFilter:[condition('MATCH_REGEX','{{_event}}','^sls_marketing_conversion$')],
  filter:[condition('EQUALS','{{SLS Relaunch | Bridge}}','sls-agency-v1'),
   condition('MATCH_REGEX','{{SLS Relaunch | Conversion Name}}','^('+completionNames.join('|')+')$')]});
 addTag({name:'SLS Relaunch | Meta Lead (confirmed request)',type:'html',
  parameter:[text('html',`<script>\nif(typeof fbq === 'function'){\n fbq('trackSingle','1640129720298425','Lead',{content_name:'{{SLS Relaunch | Conversion Name}}'});\n}\n</script>`),{type:'BOOLEAN',key:'supportDocumentWrite',value:'false'}],
  firingTriggerId:[trigger.triggerId],tagFiringOption:'ONCE_PER_EVENT',
  consentSettings:{consentStatus:'NEEDED',consentType:{type:'LIST',list:['ad_storage','ad_user_data','ad_personalization'].map(value=>({type:'TEMPLATE',value}))}}});
 delete cv.fingerprint;delete cv.path;delete cv.tagManagerUrl;
 result.exportTime=new Date().toISOString();return result;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw new Error('Usage: node scripts/prepare-attribution-container.mjs <fresh-export> <merge-file>');
 await writeFile(output,JSON.stringify(prepareAttributionContainer(JSON.parse(await readFile(input,'utf8'))),null,2)+'\n');
 console.log('Prepared attribution merge; nothing published.');
}

import {readFile,writeFile,access} from 'node:fs/promises';
import {objectPath} from '../assets/property-seo.mjs';
import {referencePath} from '../assets/reference-seo.mjs';
const root=new URL('../',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const config=await read('vercel.json');
const legacy=await read('content/seo/legacy-urls.json');
const mapping=await read('content/seo/legacy-property-mapping.json');
const retired=await read('content/seo/legacy-properties-review.json');
const decisions=await read('content/seo/relaunch-decisions.json');
const retiredSources=new Set(retired.map(row=>new URL(row.url).pathname));
const profiles=await read('content/team/profiles.json');
const cities=[...await read('content/marktgebiete/cities.json'),...await read('content/seo/restored-cities.json')];
const destinations=new Map([
 ['/service/','/verkaufen/'],['/unsere-werte/','/werte/'],['/wohntraum-finder/','/suchprofil/'],['/wissensportal/','/faq/'],['/immobilienwissen/','/faq/'],
 ['/immobilie-bewerten-lassen/','/immobilienbewertung/'],['/immobilienwert-sofortcheck/','/immobilienbewertung/'],['/auswahl-immobilienbewertung/','/immobilienbewertung/'],
 ['/standorte-2/','/standorte/'],['/mitarbeiter/','/team/'],['/immobilie/','/immobilien/'],['/immobilienmakler-duesseldorf/','/immobilienmakler-dusseldorf/'],
 ['/telefonische-beratung/','/kontakt/'],['/objektaufnahme/','/kontakt/'],['/feedback/','/kontakt/'],
 ['/category/blog/','/blog/'],['/category/uncategorized/','/blog/'],['/category/presse/','/presse/'],['/category/ratgeber/','/downloads/'],
 ['/privater-immobilienverkauf/','/immobilienverkauf-checkliste-fehler-vermeiden/'],['/immobilienverkauf-leicht-gemacht/','/verkaufen/'],
 ['/immobilie-geerbt/','/erbimmobilie-verkaufen-2026/'],['/immobilie-in-der-scheidung/','/scheidung-und-immobilie-was-eigentuemer-2026-wissen-muessen/'],
 ['/moderne-immobilienvermarktung-mit-persoenlichem-touch/','/verkaufen/'],['/sls-immobilienpartner-startet-soziales-engagement-in-dorsten/','/presse/']
]);
for(const profile of [...profiles,{slug:'filippo-livera'}]){
 destinations.set(`/${profile.slug}/`,`/team/${profile.slug}/`);
 destinations.set(`/immobilie_agent/${profile.slug}/`,`/team/${profile.slug}/`);
}
for(const row of mapping)destinations.set(new URL(row.source).pathname,row.kind==='active'?objectPath(row):referencePath(row));
// Explicit, reviewed relaunch decisions take precedence over historical snapshots.
for(const row of decisions.decisions){
 if(row.state==='redirect')destinations.set(row.source,row.destination);
 else if(row.state==='retired'){destinations.delete(row.source);retiredSources.add(row.source);}
 else throw new Error('Unsupported migration decision');
}
const taxonomyNames={duesseldorf:'Düsseldorf',moenchengladbach:'Mönchengladbach',juechen:'Jüchen','juechen-holz':'Jüchen-Holz',wuelfrath:'Wülfrath',ruethen:'Rüthen',luedenscheid:'Lüdenscheid',sprockhoevel:'Sprockhövel',toenisvorst:'Tönisvorst',luenen:'Lünen','froendenberg-ruhr':'Fröndenberg/Ruhr',kuerten:'Kürten',roesrath:'Rösrath',boenen:'Bönen'};
const report=[];
for(const absolute of legacy.urls){
 const source=new URL(absolute).pathname;
 if(source.startsWith('/immobilienmakler-dortmund/')&&source!=='/immobilienmakler-dortmund/')destinations.set(source,'/immobilienmakler-dortmund/');
 const location=/^\/immobilie_location\/([^/]+)\/$/.exec(source)?.[1];
 if(location&&!/^\d+$/.test(location)){
  const known=cities.find(c=>c.url===`/immobilienmakler-${location}/`||location==='duesseldorf'&&c.city==='Düsseldorf');
  const city=known?.city||taxonomyNames[location]||location.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join('-');
  // Archive filters used to list objects; preserve that intent rather than inventing a city page.
  destinations.set(source,'/immobilien/?city='+encodeURIComponent(city)+'&marketCity=1');
 }
 let state='retained',destination=destinations.get(source);
 if(retiredSources.has(source)){state='retired';}
 else if(destination){state='redirect';}
 else{
  const file=source==='/'?'index.html':source.slice(1)+'index.html';
  try{await access(new URL(file,root));}
  catch{state=retiredSources.has(source)||/^\/immobilie_location\/\d+\/$/.test(source)||['/danke/','/danke-termin/'].includes(source)?'retired':'review';}
 }
 report.push({source,state,...(destination?{destination}:{})});
}
const generated=[...destinations].filter(([source,destination])=>source!==destination).map(([source,destination])=>({source,destination,permanent:true}));
const removedSources=new Set(report.filter(row=>row.state==='retired').flatMap(row=>percentVariants(row.source)));
// Update existing rules in place, including all percent-case aliases, so stale
// aliases cannot retain a former target and repeated generation stays stable.
function mergeRules(existing,updates,removed=new Set()){
 const replacements=new Map(updates.flatMap(rule=>percentVariants(rule.source).map(source=>[source,{...rule,source}])));
 const seen=new Set(),result=[];
 for(const rule of existing)for(const source of percentVariants(rule.source)){
  if(seen.has(source)||removed.has(source))continue;
  seen.add(source);result.push(replacements.get(source)||{...rule,source});
 }
 for(const [source,rule] of replacements)if(!seen.has(source)&&!removed.has(source)){seen.add(source);result.push(rule);}
 return result;
}
config.redirects=mergeRules(config.redirects,generated,removedSources);
config.rewrites=mergeRules(config.rewrites,report.filter(row=>row.state==='retired').map(row=>({source:row.source,destination:'/api/retired-page'})));
// Vercel evaluates rewrites in order. Specific retired URLs must precede the
// generic property slug route, including newly retired entries appended above.
config.rewrites=[...config.rewrites.filter(rule=>rule.destination==='/api/retired-page'),...config.rewrites.filter(rule=>rule.destination!=='/api/retired-page')];
// Percent escapes are equivalent regardless of hex letter casing, while Vercel
// matches route sources literally. Preserve crawler/browser variants as aliases.
function percentVariants(source){
 let variants=[source];
 for(const match of source.matchAll(/%[0-9a-fA-F]{2}/g))for(let i=1;i<=2;i++)if(/[a-fA-F]/.test(match[0][i])){
  const index=match.index+i;
  variants=variants.flatMap(value=>[value.slice(0,index)+value[index].toLowerCase()+value.slice(index+1),value.slice(0,index)+value[index].toUpperCase()+value.slice(index+1)]);
 }
 return [...new Set(variants)];
}
await writeFile(new URL('vercel.json',root),JSON.stringify(config,null,2)+'\n');
await writeFile(new URL('content/seo/migration-status.json',root),JSON.stringify({sourceDate:legacy.retrievedAt,urls:report},null,2)+'\n');
console.log(`Migration classified ${report.length} legacy URLs: ${JSON.stringify(Object.groupBy(report,r=>r.state),(_,value)=>Array.isArray(value)?value.length:value)}`);

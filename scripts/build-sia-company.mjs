/** Build public company knowledge from the same checkout as the website release.
 * No network, model calls or secrets. Structural errors fail the build rather than
 * shipping a stale snapshot. The team directory is authoritative for membership.
 */
import {readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const defaultRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fail=message=>{throw new Error(`SIA company build: ${message}`);};
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',hellip:'…',bdquo:'„',ldquo:'“',rdquo:'”',lsquo:'‘',rsquo:'’',auml:'ä',ouml:'ö',uuml:'ü',Auml:'Ä',Ouml:'Ö',Uuml:'Ü',szlig:'ß'};
export const decode=value=>String(value).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(raw,key)=>{
 if(key.startsWith('#')){const code=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);return code>0&&code<=0x10ffff?String.fromCodePoint(code):raw;}
 return entities[key]??raw;
});
export const plain=value=>decode(String(value).replace(/<!--[^]*?-->/g,' ').replace(/<(script|style|svg)\b[^>]*>[^]*?<\/\1\s*>/gi,' ').replace(/<br\s*\/?\s*>|<\/(?:p|div|h[1-6]|section|article|a)>/gi,' ').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const attr=(tag,name)=>decode(tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,'i'))?.slice(1).find(value=>value!==undefined)??'');
const hasClass=(tag,name)=>attr(tag,'class').split(/\s+/).includes(name);
const blocks=(html,tag)=>[...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>([^]*?)<\\/${tag}\\s*>`,'gi'))].map(match=>({attrs:match[1],html:match[2]}));
const main=html=>{const match=html.match(/<main\b[^>]*>([^]*?)<\/main\s*>/i);if(!match)fail('missing main content');return match[1];};
const heading=(html,tag)=>plain(blocks(html,tag)[0]?.html??'');
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const patterns={overview:['\\bsls\\b','immobilienpartner','unternehmen','geschaftsfuhr','inhaber'],offices:['standort','buro','buros','adresse','anschrift','erreich','kontakt','vertreten','offnungszeit'],regions:['nordrhein','\\bnrw\\b','ruhrgebiet','rheinland','munsterland','niederrhein','region','marktgebiet','vertreten','tatig','zustandig'],team:['team','mitarbeiter','ansprechpartner','geschaftsfuhr'],reputation:['serios','vertrauen','vertrauenswurd','zuverlass','kundenbewert','rezension','google','qualifikation','erfahrung','empfehl','referenz'],history:['grundung','gegrundet','grundungsjahr','seit wann','wie lange.*(?:sls|unternehmen|euch|sie|gibt)','besteh'],sales:['wie viele.*(?:verkauft|vermittelt|verkaufe)','anzahl.*(?:verkauf|vermittelt)','verkaufe.*(?:bisher|gesamt)','bereits.*verkauft','schon.*verkauft','referenz']};
export async function buildCompanyKnowledge({root=defaultRoot,now=new Date(),write=true,releaseSha=process.env.VERCEL_GIT_COMMIT_SHA??null}={}){
 const records=[],files=new Map();
 const read=async path=>{if(!files.has(path))files.set(path,await readFile(resolve(root,path),'utf8'));return files.get(path);};
 const add=(id,title,text,matchPatterns,path,extra={})=>{
  if(!text.trim())fail(`empty source ${id}`);
  records.push({id,title,text,patterns:matchPatterns,category:'company',sourceType:'website',sourcePath:path,url:'/'+path.replace(/index\.html$/,''),snapshotDate:now.toISOString().slice(0,10),releaseSha,reviewStatus:'Inhalte der bestehenden Arbeitswebsite; keine unabhängige Bewertung',sourceSha256:createHash('sha256').update(files.get(path)).digest('hex'),...extra});
 };
 const about=main(await read('ueber-uns/index.html'));
 add('company-overview','SLS: Unternehmen und Geschäftsführung',plain(about),patterns.overview,'ueber-uns/index.html');
 const contact=main(await read('kontakt/index.html'));
 const offices=blocks(contact,'article').filter(block=>hasClass(block.attrs,'contact-office')).map(block=>{
  const label=blocks(block.html,'a').find(link=>hasClass(link.attrs,'contact-kicker'));
  const address=plain(blocks(block.html,'p')[0]?.html??'');
  if(!label||!address)fail('incomplete office card');
  return {name:plain(label.html),address};
 });
 if(!offices.length)fail('no office cards in contact page');
 const links=blocks(contact,'a');
 const phoneLink=links.find(link=>attr(link.attrs,'href').startsWith('tel:'));
 const emailLink=links.find(link=>attr(link.attrs,'href').startsWith('mailto:'));
 if(!phoneLink||!emailLink)fail('central contact missing');
 const central=`Zentral erreichen Sie SLS Immobilienpartner unter ${plain(phoneLink.html)} oder ${attr(emailLink.attrs,'href').slice(7)}.`;
 add('central-contact','Zentraler Kontakt zu SLS Immobilienpartner',central,['kontakt','erreich','telefon','anruf','e-mail','email','mailadresse'],'kontakt/index.html');
 // Source appointment conditions verbatim instead of inventing opening hours.
 const locationStart=contact.search(/<section\b[^>]*class=["'][^"']*\bcontact-locations\b/i);
 if(locationStart<0)fail('contact location section missing');
 const locationHtml=contact.slice(locationStart).split(/<\/section\s*>/i)[0];
 const appointment=blocks(locationHtml,'p')[0];
 const officeText=offices.map(office=>`${office.name}: ${office.address}.`).join(' ')+' '+plain(appointment?.html??'')+' '+central+' Marktgebiete sind keine weiteren Büroadressen.';
 add('company-offices','Büros und persönlicher Kontakt',officeText,patterns.offices,'kontakt/index.html',{offices});
 const areasHtml=await read('standorte/index.html');
 const areaScript=blocks(areasHtml,'script').find(block=>attr(block.attrs,'id')==='market-area-search-config');
 if(!areaScript)fail('service-area catalogue missing');
 const config=JSON.parse(areaScript.html);
 let areas=Array.isArray(config)?config:config.areas??config.cities;
 if(!areas)areas=Object.values(config).find(value=>Array.isArray(value)&&value[0]?.city);
 if(!Array.isArray(areas)||!areas.length||areas.some(area=>!area.city))fail('invalid service-area catalogue');
 const cities=[...new Set(areas.map(area=>area.city))];
 const lead=blocks(main(areasHtml),'p').find(block=>hasClass(block.attrs,'lead'));
 if(!lead)fail('service-area description missing');
 const regionText=plain(lead.html)+' Die Standortseite nennt folgende Marktgebiete: '+cities.join(', ')+'. Dies sind betreute Marktgebiete; daraus entstehen keine zusätzlichen Büroadressen. Für eine konkrete Immobilie stimmt das Team den zuständigen Ansprechpartner ab.';
 add('company-regions','Marktgebiete in Nordrhein-Westfalen',regionText,[...patterns.regions,...cities.map(city=>escape(city.toLowerCase()))],'standorte/index.html',{cities});
 const teamHtml=main(await read('team/index.html'));
 const members=blocks(teamHtml,'a').filter(block=>hasClass(block.attrs,'team-member')).map(block=>({url:attr(block.attrs,'href'),name:heading(block.html,'h3'),role:plain(blocks(block.html,'p')[0]?.html??'')}));
 if(!members.length)fail('empty team directory');
 if(new Set(members.map(member=>member.url)).size!==members.length)fail('duplicate team profile');
 for(const member of members)if(!/^\/team\/[a-z0-9-]+\/$/.test(member.url)||!member.name||!member.role)fail('invalid team card');
 add('company-team','Das Team von SLS',members.map(member=>`${member.name}: ${member.role}`).join('; ')+'. Die Teamseite verlinkt alle persönlichen Profile.',patterns.team,'team/index.html',{members});
 for(const member of members){
  const path=member.url.slice(1)+'index.html';const profile=main(await read(path));
  const bioStart=[...profile.matchAll(/<div\b([^>]*)>/gi)].find(match=>hasClass(match[1],'profile-bio'));
  if(!bioStart)fail(`profile biography missing: ${path}`);
  const bio=profile.slice(bioStart.index+bioStart[0].length);
  const directStart=[...bio.matchAll(/<div\b([^>]*)>/gi)].find(match=>hasClass(match[1],'profile-direct'));
  if(!directStart)fail(`profile contact boundary missing: ${path}`);
  // Match the full name and surname, without assuming the current team size.
  add('company-person-'+member.url.split('/').filter(Boolean).at(-1),member.name+' – '+member.role,member.name+': '+member.role+'. '+plain(bio.slice(0,directStart.index)),[escape(member.name.toLowerCase()),escape(member.name.split(/\s+/).at(-1).toLowerCase()),...(/\bMischa\b/.test(member.name)?['misha']:[])],path);
 }
 const home=main(await read('index.html'));
 const googleAvailable=/data-google-review-slider\b/.test(home);
 // Links and qualifications derive from current public pages, not named staff copies.
 const qualifications=members.filter(member=>/IHK|Sachverstandig|Sachverständig|Immobilienkaufmann|Immobilienkauffrau/.test(member.role)).map(member=>member.name+': '+member.role);
 const googleLink=blocks(home,'a').map(link=>attr(link.attrs,'href')).find(href=>/^https:\/\/(?:share\.google|www\.google\.com)\//.test(href));
 const references=main(await read('referenzen/index.html'));
 const referenceIntro=blocks(references,'p')[0];
 const reputation=(googleAvailable?'Auf der Startseite zeigt SLS Google-Kundenbewertungen. Aktuelle Sterne und die Anzahl der Bewertungen werden von Google geladen; dieser Wissensstand enthält keine feste aktuelle Zahl. Bewertungen sind persönliche Erfahrungsberichte, keine Garantie für einen künftigen Verkauf. ':'')+'Die aktuellen Teamprofile beschreiben den fachlichen Hintergrund und die Qualifikationen.'+(qualifications.length?' Im Team genannt: '+qualifications.join('; ')+'.':'')+' Auf der Referenzseite steht: '+plain(referenceIntro?.html??'');
 add('company-reputation','Erfahrungen, Referenzen und Qualifikationen',reputation,patterns.reputation,'index.html',{relatedPages:['/team/','/referenzen/'],references:googleLink?[googleLink]:[],dependencies:['team/index.html','referenzen/index.html']});
 // Accept only explicit company founding assertions; never employee experience or badges.
 const aboutText=plain(about);
 const founding=aboutText.match(/(?:SLS(?: Immobilienpartner)?(?: GmbH)?\s+(?:wurde|ist)\s+(?:im Jahr\s+)?\d{4}[^.!?]{0,90}gegründet|Gründungsjahr\s*:\s*\d{4})[^.!?]*/i)?.[0];
 const historyText=founding?`Auf der Über-uns-Seite steht zur Gründung: ${founding}.`: 'Ein verlässlich belegtes Gründungsjahr kann ich derzeit nicht nennen: Die Über-uns-Seite nennt dafür kein Datum. Berufserfahrung einzelner Teammitglieder oder das Datum einer Auszeichnung ist damit nicht gleichzusetzen. Die aktuellen Unternehmensinformationen finden Sie unter Über uns.';
 add('company-history','Unternehmensgeschichte',historyText,patterns.history,'ueber-uns/index.html');
 const referenceText=plain(references);
 const total=referenceText.match(/SLS(?: Immobilienpartner)?(?: GmbH)?\s+hat\s+(?:insgesamt|bisher insgesamt)\s+[\d.]+\s+Immobilien\s+(?:verkauft|vermittelt)[^.!?]*/i)?.[0];
 const salesText=total?`Auf der Referenzseite steht zur Gesamtzahl: ${total}.`: 'Die Referenzseite zeigt erfolgreich vermittelte Immobilien als Auswahl, keine verifizierte Gesamtzahl aller Verkäufe. Eine belastbare Gesamtzahl kann ich deshalb derzeit nicht nennen. Die Zahl angezeigter Referenzen oder ihrer Seiten darf nicht als Gesamtzahl der Verkäufe ausgegeben werden.';
 add('company-sales-total','Verkaufte Immobilien: belegte Angaben',salesText,patterns.sales,'referenzen/index.html');
 for(const record of records)record.sourceHashes=Object.fromEntries([record.sourcePath,...(record.dependencies??[])].map(path=>[path,createHash('sha256').update(files.get(path)).digest('hex')]));
 if(new Set(records.map(record=>record.id)).size!==records.length)fail('duplicate source ids');
 if(write){const out=resolve(root,'services/frag-sls/data/website-company.json');const temporary=out+'.tmp';await writeFile(temporary,JSON.stringify(records,null,2)+'\n');await rename(temporary,out);}
 return records;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const records=await buildCompanyKnowledge();
 console.log(`SIA company knowledge rebuilt: ${records.length} sources, ${records.find(source=>source.id==='company-team').members.length} current team members, ${records.find(source=>source.id==='company-regions').cities.length} service areas.`);
}

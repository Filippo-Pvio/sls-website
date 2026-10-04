// No secrets are written. Reports contain only the fixed test questions and their answers.
const fs=require('node:fs');
const path=require('node:path');
const {answerQuestion,VERSION}=require('../lib/answer');
const cases=require('../eval/cases.json');
async function main(){
 const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
 const base=value('--base-url'),selected=value('--case');
 if(base){const u=new URL(base);if(!((u.protocol==='https:'&&u.hostname==='frag-sls.vercel.app')||(['localhost','127.0.0.1'].includes(u.hostname)&&['http:','https:'].includes(u.protocol))))throw Error('Nur frag-sls oder localhost sind als Testziel erlaubt.');
  const html=await (await fetch(base,{signal:AbortSignal.timeout(15000)})).text();if(!html.includes('Prototyp · '+VERSION))throw Error('Deployment hat nicht Version '+VERSION+'; keine Testfragen gesendet.');
 }else if(!process.env.OPENAI_API_KEY?.trim())throw Error('Kein lokaler API-Key. Nach dem Hochladen --base-url https://frag-sls.vercel.app verwenden.');
 const targets=selected?cases.filter(c=>c.id===selected):cases;if(!targets.length)throw Error('Unbekannte Testfall-ID.');
 const results=[];
 for(const c of targets){
  const start=Date.now();let r;
  try{if(base){const response=await fetch(new URL('/api/ask',base),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:c.question}),signal:AbortSignal.timeout(55000)});if(!response.ok)throw Error('HTTP '+response.status);r=await response.json();}else r=await answerQuestion(c.question);
   const warnings=[];if(r.version!==VERSION)warnings.push('Falsche API-Version');
   if(r.mode!=='ai'||r.verification?.status!=='passed')warnings.push('Keine erfolgreich geprüfte echte KI-Antwort; Fallback ist kein Qualitätserfolg.');
   if(/Zur Klärung:|keine bestätigten Informationen von SLS|freigegebene Quellen/i.test(r.answer||''))warnings.push('Interne Floskel');
   for(const term of c.mustMention)if(!(r.answer||'').toLowerCase().includes(term.toLowerCase()))warnings.push('Erwartetes Thema fehlt: '+term);
   for(const id of c.expectedSources)if(!(r.sources||[]).some(s=>s.id===id))warnings.push('Erwartete Quelle fehlt: '+id);
   results.push({...c,seconds:(Date.now()-start)/1000,mode:r.mode,provider:r.provider,reason:r.reason,verification:r.verification,answer:r.answer,sources:r.sources,automatedSignals:warnings,manualReview:'PENDING'});
   console.log(c.id+': '+(warnings.length?'PRÜFEN':'technische Signale OK')+'; fachliche Sichtprüfung offen');
  }catch{results.push({...c,error:'Anfrage fehlgeschlagen',manualReview:'PENDING'});console.log(c.id+': Anfrage fehlgeschlagen');}
 }
 const folder=path.resolve(__dirname,'../eval-results');fs.mkdirSync(folder,{recursive:true});
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 fs.writeFileSync(path.join(folder,stamp+'.json'),JSON.stringify({version:VERSION,executedAt:new Date().toISOString(),target:base||'local',results},null,2));
 fs.writeFileSync(path.join(folder,stamp+'.md'),'# Echte Modelltests SIA '+VERSION+'\n\nAutomatische Signale sind kein fachlicher Qualitätsnachweis. Jeden Fall anhand seiner Kriterien manuell prüfen.\n\n'+results.map(c=>'## '+c.id+'\n\n'+c.question+'\n\n'+(c.answer||c.error)+'\n\nPrüfkriterien: '+c.criteria+'\n\nStatus: manuelle Prüfung offen.\n').join('\n'));
 if(results.some(c=>c.error||c.automatedSignals?.length))process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1});

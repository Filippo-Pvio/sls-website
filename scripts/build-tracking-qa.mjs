// Build an isolated browser fixture only for the explicitly authorised tracking PR.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {prepareConsentHtml} from '../lib/consent-html.mjs';
export async function buildTrackingQa({root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'.site-output'),env=process.env}={}) {
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!=='feat/consent-tracking-phase1-20261016')return false;
 const pages={contact:'kontakt/index.html',buyer:'kaeuferfinder/index.html',guide:'downloads/index.html',search:'suchprofil/index.html',property:'immobilien/preview.html',report:'verkaufscheck/index.html'};
 const links=Object.keys(pages).map(name=>`<a href="/tracking-qa/${name}/${name==='property'?'?objekt=17':''}">${name}</a>`).join(' · ');
 for(const [name,source] of Object.entries(pages)){
  let html=await readFile(path.join(root,source),'utf8');
  html=html.replace(/<head\b[^>]*>/i,'$&<meta name="robots" content="noindex,nofollow">');
  html=html.replace(/<body\b[^>]*>/i,`$&<aside style="position:relative;z-index:1000;padding:16px;background:#fff1c9;color:#26353c"><strong>Tracking-QA · Simulation, keine echten Anfragen oder E-Mails</strong><nav>${links}</nav><p><a href="?qa=success${name==='property'?'&objekt=17':''}">Erfolg</a> · <a href="?qa=error${name==='property'?'&objekt=17':''}">Fehler</a> · <a href="?qa=review">Prüffall</a> · <a href="?qa=duplicate">Duplikat</a></p><output id="tracking-qa-result">QA wird geladen.</output></aside>`);
  // Exercise the unmodified delegated report submit handler without completing the whole tool.
  if(name==='report'){
   const script=await readFile(path.join(root,'assets/verkaufscheck.js'),'utf8');
   const form=script.match(/html\+='(<div class="sales-report-request">[^\n]+)';/)[1];
   html=html.replace(/(<[^>]+data-sales-wizard[^>]*>)/,'$1'+form);
  }
  html=prepareConsentHtml(html).replace(/<head\b[^>]*>/i,'$&<script src="/assets/tracking-qa-fixture.js"></script>');
  const folder=path.join(output,'tracking-qa',name);await mkdir(folder,{recursive:true});await writeFile(path.join(folder,'index.html'),html);
 }
 await copyFile(path.join(root,'qa/tracking-qa-fixture.js'),path.join(output,'assets/tracking-qa-fixture.js'));
 console.log('Built isolated tracking-QA fixtures for this preview branch only.');return true;
}

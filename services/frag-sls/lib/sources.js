const company=require('../data/approved-facts.json');
const expert=require('../data/expert-facts.json');
const {companySources}=require('./company-knowledge');
const {retrieve}=require('./knowledge');
const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function sourceContext(question,now=new Date()) {
 const requested=new Set(retrieve(question).map(s=>s.id));
 const q=normalize(question);
 const fresh=expert.filter(s=>Number.isFinite(Date.parse(s.reviewAfter))&&now.getTime()<Date.parse(s.reviewAfter+'T00:00:00Z'));
 const matched=fresh.filter(s=>s.patterns.some(p=>new RegExp(p,'i').test(q)));
 const all=[...company.map(s=>({...s,category:'company',required:requested.has(s.id)})),...companySources(question).map(s=>({...s,required:true})),...fresh.map(s=>({...s,required:matched.some(m=>m.id===s.id)}))];
 // Fallbacks retain confirmed service facts and versioned public company sources.
 const fallback=all.filter(s=>s.required);
 return {all,fallback};
}
function publicSource(s,i){const {id,title,text,url,snapshotDate,reviewStatus,category,references,relatedPages,sourceType}=s;return {id,title,text,url,snapshotDate,reviewStatus,category,references,relatedPages,sourceType,number:i+1};}
module.exports={sourceContext,publicSource};

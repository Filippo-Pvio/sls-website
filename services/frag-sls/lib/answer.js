const {isFollowUp}=require('./no-follow-up');
const {personalNextStep}=require('./personal-next-step');
const {limitations}=require('./knowledge');
const {sourceContext,publicSource}=require('./sources');
const {fault,requestJSON}=require('./model');
const {reviewAnswer}=require('./review');
const DEFAULT_MODEL='gpt-4.1-mini';
const VERSION='1.4.3';
const NOTICES={
 missing_api_key:'OpenAI ist nicht eingerichtet. Die Antwort stammt aus der Wissensbasis von SLS Immobilienpartner.',
 authentication:'OpenAI konnte nicht authentifiziert werden. Ersatzantwort aus der Wissensbasis von SLS Immobilienpartner.',
 rate_limit:'OpenAI ist wegen eines Kontingent- oder Anfragelimits nicht verfügbar. Ersatzantwort aus der Wissensbasis von SLS Immobilienpartner.',
 configuration:'Die OpenAI-Anfrage oder Modellkonfiguration wurde abgelehnt. Ersatzantwort aus der Wissensbasis von SLS Immobilienpartner.',
 upstream_error:'OpenAI ist derzeit nicht verfügbar. Ersatzantwort aus der Wissensbasis von SLS Immobilienpartner.',
 timeout:'OpenAI hat nicht rechtzeitig geantwortet. Ersatzantwort aus der Wissensbasis von SLS Immobilienpartner.',
 invalid_response:'Die KI-Antwort konnte nicht zuverlässig verarbeitet werden. Ersatzantwort aus der Wissensbasis von SLS Immobilienpartner.',
 invalid_sources:'Die KI-Antwort hatte keine gültigen Quellenbelege. Ersatzantwort aus der Wissensbasis von SLS Immobilienpartner.',
 verification_failed:'SIA konnte keine verlässliche KI-Antwort erstellen. Sie sehen stattdessen Informationen aus der Wissensbasis.',
 refusal:'OpenAI hat keine Antwort bereitgestellt. Ersatzantwort aus der Wissensbasis von SLS Immobilienpartner.'
};
function fallback(sources,reason,attempted){
 const numbered=sources.map(publicSource);
 return {mode:attempted?'fallback':'knowledge',provider:'Wissensbasis von SLS Immobilienpartner',reason,notice:NOTICES[reason],
  answer:numbered.length?numbered.map(s=>`${s.text} [${s.number}]`).join('\n\n'):'Diese Frage kann ich gerade nicht zuverlässig beantworten. Bitte versuchen Sie es noch einmal.',sources:numbered,
  verification:{status:'not_published',method:'source_fallback'}};
}
function answerSchema(sources){return {type:'object',additionalProperties:false,required:['paragraphs'],properties:{paragraphs:{type:'array',items:{type:'object',additionalProperties:false,required:['kind','text','source_ids'],properties:{
 kind:{type:'string',enum:['company','expert','general','clarification']},text:{type:'string'},source_ids:{type:'array',items:{type:'string',enum:sources.map(s=>s.id)}}
}}}}};}
function parseDraft(result,sources){
 if(!result||Object.keys(result).some(k=>k!=='paragraphs')||!Array.isArray(result.paragraphs)||!result.paragraphs.length||result.paragraphs.length>6)throw fault('invalid_sources');
 const allowed=new Map(sources.map(s=>[s.id,s]));
 // Drop only uncited follow-up paragraphs before review; never silently edit cited claims.
 result.paragraphs=result.paragraphs.filter(p=>{
  if(!p||typeof p.text!=='string'||!isFollowUp(p.text))return true;
  if(['general','clarification'].includes(p.kind)&&Array.isArray(p.source_ids)&&p.source_ids.length===0)return false;
  throw fault('verification_failed');
 });
 if(!result.paragraphs.length)throw fault('verification_failed');
 const paragraphs=result.paragraphs.map(p=>{
  if(!p||Object.keys(p).some(k=>!['kind','text','source_ids'].includes(k))||!['company','expert','general','clarification'].includes(p.kind)||typeof p.text!=='string'||!p.text.trim()||p.text.length>2200||/\[\d+\]|https?:\/\/|<[^>]+>/.test(p.text)||!Array.isArray(p.source_ids))throw fault('invalid_sources');
  const grounded=['company','expert'].includes(p.kind);
  if(grounded?!p.source_ids.length:p.source_ids.length)throw fault('invalid_sources');
  if(p.source_ids.some(id=>!allowed.has(id)||allowed.get(id).category!==p.kind))throw fault('invalid_sources');
  if(/zur klärung:|freigegebene[nr]? (?:quellen|informationen)|keine bestätigten informationen|nicht dokumentiert|in dieser version/i.test(p.text))throw fault('verification_failed');
  // Hard boundary: financial/legal assertions must not be laundered as practical tips.
  if(p.kind==='general'&&/notarander|anderkonto|steuer|gesetz|\b§|kredit|finanzier|darlehen|bankzusage|fällig|faellig|zahlungspflicht|provision|courtage|\d\s*(?:%|Euro|€)/i.test(p.text))throw fault('invalid_sources');
  return {kind:p.kind,text:p.text.trim().replace(/^(?:Allgemeiner Hinweis\s*:\s*)+/i,''),source_ids:[...new Set(p.source_ids)]};
 });
 if(paragraphs.map(p=>p.text).join(' ').split(/\s+/).length>320)throw fault('verification_failed');
 return paragraphs;
}
function render(paragraphs,sources){
 const selected=new Map(),allowed=new Map(sources.map(s=>[s.id,s]));
 for(const p of paragraphs)for(const id of p.source_ids)if(!selected.has(id))selected.set(id,publicSource(allowed.get(id),selected.size));
 return {paragraphs,answer:paragraphs.map(p=>p.text+p.source_ids.map(id=>` [${selected.get(id).number}]`).join('')).join('\n\n'),sources:[...selected.values()]};
}
async function answerQuestion(question,{env=process.env,fetchImpl=globalThis.fetch,timeoutMs=38000,logger=console,now=new Date()}={}){
 const context=sourceContext(question,now),gaps=limitations(question);
 const finish=result=>({...result,answer:result.answer+'\n\n'+personalNextStep(question),personalNextStep:personalNextStep(question),version:VERSION,limitations:gaps,knowledgeStatus:'Bestätigte Unternehmensinformationen und datierte Fachgrundlagen. Keine Live-Marktdaten.'});
 const key=(env.OPENAI_API_KEY||'').trim();
 if(!key)return finish(fallback(context.fallback,'missing_api_key',false));
 const model=(env.OPENAI_MODEL||'').trim()||DEFAULT_MODEL;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 const options={fetchImpl,key,model,signal:controller.signal};
 const sources=context.all.map(({id,title,text,category,required})=>({id,title,text,category,required}));
 try{
  const draft=await requestJSON({...options,instructions:require('./prompt'),input:{question,limitations:gaps,sources},schema:answerSchema(sources),name:'grounded_answer'});
  const paragraphs=parseDraft(draft,sources);
  await reviewAnswer({...options,question,paragraphs,sources,limitations:gaps});
  return finish({mode:'ai',provider:'OpenAI',reason:null,notice:'Mit KI formuliert und automatisch mit den angegebenen Grundlagen abgeglichen. Quellenbelege stehen bei den zugehörigen Unternehmens- und Fachinformationen.',verification:{status:'passed',method:'model_source_review'},...render(paragraphs,context.all)});
 }catch(err){
  const reason=controller.signal.aborted?'timeout':NOTICES[err.reason]?err.reason:'upstream_error';
  logger.warn(JSON.stringify({event:'frag_sls_fallback',reason,...(err.status?{status:err.status}:{})}));
  return finish(fallback(context.fallback,reason,true));
 }finally{clearTimeout(timer);}
}
module.exports={answerQuestion,DEFAULT_MODEL,VERSION};

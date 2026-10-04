function fault(reason, status) { return Object.assign(new Error(reason), { reason, status }); }
function jsonFromResponse(data) {
  if (!data || data.status !== 'completed' || !Array.isArray(data.output)) throw fault('invalid_response');
  const content=data.output.filter(x=>x.type==='message'&&x.role==='assistant').flatMap(x=>Array.isArray(x.content)?x.content:[]);
  if(content.some(x=>x.type==='refusal'))throw fault('refusal');
  try{return JSON.parse(content.filter(x=>x.type==='output_text'&&typeof x.text==='string').map(x=>x.text).join(''));}
  catch{throw fault('invalid_response');}
}
async function requestJSON({fetchImpl,key,model,signal,instructions,input,schema,name,maxTokens=1800}) {
  const response=await fetchImpl('https://api.openai.com/v1/responses',{
    method:'POST',signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
    body:JSON.stringify({model,store:false,max_output_tokens:maxTokens,instructions,input:JSON.stringify(input),
      text:{format:{type:'json_schema',name,strict:true,schema}}})
  });
  if(!response.ok){const s=response.status;throw fault(s===401||s===403?'authentication':s===429?'rate_limit':s===400||s===404||s===422?'configuration':'upstream_error',s);}
  let data;try{data=await response.json();}catch{throw fault('invalid_response');}
  return jsonFromResponse(data);
}
module.exports={fault,requestJSON};

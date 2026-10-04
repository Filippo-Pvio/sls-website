const envelope=value=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const passReview=body=>envelope({complete:true,concise:true,paragraphs:JSON.parse(body.input).paragraphs.map((_,index)=>({index,supported:true}))});
const scripted=data=>async(url,options)=>({ok:true,json:async()=>JSON.parse(options.body).text.format.name==='answer_review'?passReview(JSON.parse(options.body)):data});
module.exports={envelope,passReview,scripted};

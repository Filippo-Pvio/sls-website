const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const handler = require('../server');
const api = require('../api/ask');
test('local HTTP flow and routing match API contract',async()=>{
  delete process.env.OPENAI_API_KEY;
  const server=http.createServer(handler);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    const home=await fetch(base); assert.equal(home.status,200);
    const html=await home.text(); assert.match(html,/answerOrigin/); assert.ok(!html.includes('OPENAI_API_KEY'));
    const ask=await fetch(base+'/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Haus in Dorsten verkaufen'})});
    assert.equal(ask.status,200); assert.equal(ask.headers.get('cache-control'),'no-store');
    assert.equal((await ask.json()).provider,'Wissensbasis von SLS Immobilienpartner');
    const source=await fetch(base+'/quellen/dorsten.html'); assert.equal(source.status,200); assert.match(await source.text(),/Originalauszug/);
    assert.equal((await fetch(base+'/quellen/not-real.html')).status,404);
    const get=await fetch(base+'/api/ask'); assert.equal(get.status,200); assert.deepEqual(await get.json(),{version:'frag-dialogue-1',dialogueEnabled:false});
    for(const [body,status] of [['{',400],[JSON.stringify({question:123}),400],[JSON.stringify({question:'x'.repeat(1201)}),400],['x'.repeat(9000),413]]){
      const r=await fetch(base+'/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body}); assert.equal(r.status,status);
    }
    assert.equal((await fetch(base+'/api/ask',{method:'POST',body:'hi'})).status,415);
    for(const p of ['/server.js','/.env.local','/lib/answer.js','/not-found']) assert.equal((await fetch(base+p)).status,404);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
test('Vercel pre-parsed body reaches the same handler',async()=>{
  delete process.env.OPENAI_API_KEY;
  let json;
  const res={setHeader(){},end(value){json=JSON.parse(value)}};
  await api({method:'POST',headers:{'content-type':'application/json'},body:{question:'Haus in Dorsten verkaufen'}},res);
  assert.equal(res.statusCode,200); assert.equal(json.reason,'missing_api_key');
});

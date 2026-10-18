import {Agent,request as httpsRequest} from 'node:https';

export const LEGACY_HOST='sls.de';
export const LEGACY_IP='185.175.196.36';
export const MAX_MEDIA_BYTES=3_500_000;
const prefix='/wp-content/uploads/';
const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif',gif:'image/gif',ico:'image/x-icon',pdf:'application/pdf'};

// Resolve the old origin independently of public DNS after cutover. TLS still
// validates sls.de with the standard CA and hostname checks; never disable it.
export function legacyLookup(hostname,options,callback){
 if(hostname!==LEGACY_HOST)return callback(new Error('Unexpected legacy host'));
 if(options?.all)return callback(null,[{address:LEGACY_IP,family:4}]);
 return callback(null,LEGACY_IP,4);
}
const agent=new Agent({keepAlive:true,maxSockets:8,lookup:legacyLookup,family:4});

export function canonicalMediaPath(value){
 if(typeof value!=='string'||value.length>2048)return null;
 let path;try{path=decodeURIComponent(value);}catch{return null;}
 if(!path.startsWith(prefix)||/[\\\x00-\x1f\x7f?#]/.test(path))return null;
 const segments=path.slice(prefix.length).split('/');
 if(segments.some(part=>!part||part==='.'||part==='..'))return null;
 return types[path.split('.').pop().toLowerCase()]?path:null;
}

export function fetchLegacyMedia(path,{request=httpsRequest}={}){
 return new Promise((resolve,reject)=>{
  let settled=false,deadline;
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(deadline);error?reject(error):resolve(value);};
  const upstream=request({hostname:LEGACY_HOST,servername:LEGACY_HOST,port:443,family:4,lookup:legacyLookup,agent,rejectUnauthorized:true,method:'GET',
   path:path.split('/').map(encodeURIComponent).join('/'),
   headers:{'User-Agent':'SLS-Legacy-Media/1.0','Accept-Encoding':'identity'}},response=>{
   // No redirects: even a new Location on the old origin must not turn this
   // fixed-origin reader into an arbitrary URL fetcher or a recursive proxy.
   if(response.statusCode!==200){response.destroy();return finish(null,{status:response.statusCode===404?404:502});}
   const length=Number(response.headers['content-length']);
   if(length>MAX_MEDIA_BYTES){response.destroy();return finish(new Error('Media limit'));}
   const expected=types[path.split('.').pop().toLowerCase()];
   const actual=String(response.headers['content-type']||'').split(';')[0].trim().toLowerCase();
   if(actual!==expected&&actual!=='application/octet-stream'&&!(expected==='image/jpeg'&&actual==='image/jpg')){
    response.destroy();return finish(new Error('Unexpected media type'));
   }
   let size=0;const chunks=[];
   response.on('data',chunk=>{
    size+=chunk.length;
    if(size>MAX_MEDIA_BYTES){response.destroy();upstream.destroy();return finish(new Error('Media limit'));}
    chunks.push(chunk);
   });
   response.on('end',()=>finish(null,{status:200,type:expected,body:Buffer.concat(chunks)}));
   response.on('error',error=>finish(error));
   response.on('aborted',()=>finish(new Error('Media interrupted')));
  });
  upstream.on('error',error=>finish(error));
  deadline=setTimeout(()=>{finish(new Error('Media timeout'));upstream.destroy();},10_000);
  upstream.end();
 });
}

export function createLegacyMediaHandler(paths,{fetchMedia=fetchLegacyMedia}={}){
 const allowed=new Set(paths);
 return async function legacyMedia(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return res.status(405).end();}
  const raw=String(req.url||'').split('?')[0];
  const candidate=raw.startsWith(prefix)?raw:typeof req.query?.path==='string'?prefix+req.query.path:null;
  const path=canonicalMediaPath(candidate);
  if(!path||!allowed.has(path))return res.status(404).end();
  try{
   const result=await fetchMedia(path);
   if(result.status!==200){if(result.status!==404)res.setHeader('Retry-After','60');return res.status(result.status===404?404:502).end();}
   if(!Buffer.isBuffer(result.body)||!result.body.length||result.body.length>MAX_MEDIA_BYTES)throw new Error('Invalid media body');
   res.setHeader('Content-Type',result.type);
   res.setHeader('Content-Length',result.body.length);
   res.setHeader('Cache-Control','public, max-age=3600, s-maxage=86400');
   return res.status(200).end(req.method==='HEAD'?'':result.body);
  }catch{res.setHeader('Retry-After','60');return res.status(502).end();}
 };
}

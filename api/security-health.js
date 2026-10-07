import {timingSafeEqual} from 'node:crypto';
import {securityStore} from './lib/form-security.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method!=='GET')return res.status(405).json({error:'Methode nicht erlaubt.'});
 const secret=process.env.SIA_SERVICE_SECRET,provided=Buffer.from(req.headers?.authorization||''),expected=Buffer.from(secret?`Bearer ${secret}`:'');
 if(!secret||provided.length!==expected.length||!timingSafeEqual(provided,expected))return res.status(401).json({error:'Anfrage nicht erlaubt.'});
 try{const result=await securityStore().command(['PING']);if(result!=='PONG')throw Error();return res.status(200).json({ok:true,forms:'central-store-ready',sia:'service-auth-configured'});}
 catch{return res.status(503).json({ok:false,forms:'central-store-unavailable'});}
}

const tokens=new Map();
export async function formFetch(endpoint,options={}) {
 if(String(options.method||'GET').toUpperCase()!=='POST')return fetch(endpoint,options);
 const path=new URL(endpoint,location.origin).pathname.replace(/\/$/,'');
 let entry=tokens.get(path);
 if(!entry||entry.until<Date.now()){
  const response=await fetch(path+'/?formSecurity=1',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(15000)}),data=await response.json();
  if(!response.ok||!data.securityToken)throw new Error(data.error||'Der sichere Versand ist gerade nicht verfügbar.');
  entry={token:data.securityToken,until:Date.now()+25*60*1000};tokens.set(path,entry);
 }
 const body=JSON.parse(options.body||'{}');
 const response=await fetch(path+'/',{...options,credentials:'same-origin',body:JSON.stringify({...body,securityToken:entry.token})});
 if(response.ok||response.status===400)tokens.delete(path);
 return response;
}

const previewBranches=new Set(['fix/restore-agency-tracking-20261103','fix/tracking-attribution-20261106']);
export function prepareTrackingScript(source,env={}) {
  const hosts=[];
  if(env.VERCEL_ENV==='preview'&&previewBranches.has(env.VERCEL_GIT_COMMIT_REF)){
    for(const host of [env.VERCEL_BRANCH_URL,env.VERCEL_URL]){
      if(typeof host==='string'&&/^sls-website-[a-z0-9-]+\.vercel\.app$/.test(host)&&!hosts.includes(host))hosts.push(host);
    }
  }
  return source.replace('const previewHosts = [];','const previewHosts = '+JSON.stringify(hosts)+';');
}

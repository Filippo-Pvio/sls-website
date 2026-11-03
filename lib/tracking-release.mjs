const restoreBranch='fix/restore-agency-tracking-20261103';
export function prepareTrackingScript(source,env={}) {
  const hosts=[];
  if(env.VERCEL_ENV==='preview'&&env.VERCEL_GIT_COMMIT_REF===restoreBranch){
    for(const host of [env.VERCEL_BRANCH_URL,env.VERCEL_URL]){
      if(typeof host==='string'&&/^sls-website-[a-z0-9-]+\.vercel\.app$/.test(host)&&!hosts.includes(host))hosts.push(host);
    }
  }
  return source.replace('const previewHosts = [];','const previewHosts = '+JSON.stringify(hosts)+';');
}

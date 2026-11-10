/**
 * Read-only Workers Builds authority probe.
 * Caller must first verify a dedicated, active user-scoped Cloudflare token.
 * No token material, request body or provider error text is returned or logged.
 */
const REQUIRED = ['bip', 'sekret-backend'];
const OPTIONAL = 'sekret-backend-alpha';
const failure = (code) => ({ok:false,code,checkedWorkers:0});

export async function verifyWorkersBuildsRead({rows,accountId,request}={}) {
  if (!Array.isArray(rows) || typeof accountId!=='string' || !/^[0-9a-f]{32}$/i.test(accountId) || typeof request!=='function') {
    return failure('scripts-response-invalid');
  }
  const targets=[];
  for(const name of [...REQUIRED,OPTIONAL]){
    const matches=rows.filter(row=>row?.id===name);
    if(matches.length>1 || (REQUIRED.includes(name) && matches.length!==1)){
      return failure('required-worker-tag-missing');
    }
    if(matches.length===0) continue;
    const tag=matches[0]?.tag;
    if(typeof tag!=='string' || !tag.trim()) return failure('required-worker-tag-missing');
    targets.push({name,tag:tag.trim()});
  }
  for(const worker of targets){
    const root=`/accounts/${encodeURIComponent(accountId)}/builds/workers/${encodeURIComponent(worker.tag)}`;
    const endpoints=worker.name===OPTIONAL?[`${root}/triggers`]:[`${root}/triggers`,`${root}/builds?per_page=50`];
    for(const endpoint of endpoints){
      let response;
      try{response=await request(endpoint);}catch{return failure('builds-read-unavailable');}
      if(!response?.response?.ok || response.body?.success!==true || !Array.isArray(response.body?.result)) {
        return failure('builds-read-unavailable');
      }
    }
  }
  return {ok:true,code:'builds-read-verified',checkedWorkers:targets.length};
}

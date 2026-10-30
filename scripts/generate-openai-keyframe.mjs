/**
 * Optional OpenAI cinematic keyframe adapter for Se'kret Bip (Node 22+).
 * No paid call without --execute AND per-shot approval; output is never canon-approved.
 * /makevideo remains the ONLY approved-media MP4 assembly stage.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,open,rm} from 'node:fs/promises';
import {basename,dirname,extname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const MODEL='gpt-image-2.5-sunburst';
const SCHEMA='sekret-bip-openai-keyframe@v1';
const API='https://api.openai.com/v1/images/';
const MIME={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
const PNG=Buffer.from([137,80,78,71,13,10,26,10]);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const deny=code=>{throw new Error(code);};
function isImage(bytes,mime){
  if(mime==='image/png') return bytes.length>24&&bytes.subarray(0,8).equals(PNG)&&bytes.toString('ascii',12,16)==='IHDR'&&bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(20)>0;
  if(mime==='image/jpeg') return bytes.length>4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(mime==='image/webp') return bytes.length>=16&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  return false;
}
export async function planOpenAIKeyframe(spec,registry){
  if(spec?.schema!==SCHEMA) deny('invalid_shot_schema');
  if(!Number.isInteger(spec.shot)||spec.shot<1) deny('invalid_shot_number');
  if(typeof spec.prompt!=='string'||!spec.prompt.trim()||spec.prompt.length>12000) deny('invalid_prompt');
  if(!['world-only','character-edit'].includes(spec.mode)) deny('invalid_shot_mode');
  if(!['1024x1024','1536x1024','1024x1536'].includes(spec.size)) deny('invalid_shot_size');
  if(!['low','medium','high','xhigh','max'].includes(spec.quality)) deny('invalid_shot_quality');
  if(!Array.isArray(spec.cast)||new Set(spec.cast).size!==spec.cast.length) deny('invalid_cast');
  if(spec.references!==undefined&&!Array.isArray(spec.references)) deny('invalid_references');
  const refs=spec.references||[],files=[];
  if(spec.mode==='world-only'){
    if(spec.cast.length||refs.length) deny('world_only_must_have_no_identifiable_cast');
  }else{
    if(!spec.cast.length||refs.length!==spec.cast.length) deny('character_reference_required');
    for(const key of spec.cast){
      const character=(registry?.characters||[]).find(c=>c.key===key);
      if(!character||character.status!=='approved'||!character.higgsfield_element_id) deny('unapproved_character');
      const matched=refs.filter(ref=>ref.key===key);
      if(matched.length!==1) deny('character_reference_required');
      const ref=matched[0];
      if(ref.authority!=='character-authority'||ref.approved!==true) deny('character_authority_not_approved');
      if(!/^[a-f0-9]{64}$/i.test(ref.sha256||'')) deny('reference_sha256_required');
      if(typeof ref.path!=='string'||!ref.path.trim()) deny('reference_path_required');
      const path=resolve(ref.path),mime=MIME[extname(path).toLowerCase()];
      if(!mime) deny('reference_file_type_invalid');
      let bytes;
      let handle;
      try{
        // Inspect and read the same opened file, not a pathname that could change.
        handle=await open(path,'r');
        const info=await handle.stat();
        if(!info.isFile()||info.size>20*1024*1024) deny('reference_file_invalid');
        bytes=await handle.readFile();
        if(bytes.length>20*1024*1024) deny('reference_file_invalid');
      }catch(error){if(error.message==='reference_file_invalid') throw error;deny('reference_file_missing');}
      finally{if(handle) await handle.close();}
      if(sha(bytes)!==ref.sha256.toLowerCase()) deny('reference_sha256_mismatch');
      if(!isImage(bytes,mime)) deny('reference_file_invalid_format');
      files.push({key,filename:basename(path),sha256:ref.sha256.toLowerCase(),mime,bytes});
    }
  }
  const plan={kind:'PREFLIGHT_ONLY',schema:SCHEMA,shot:spec.shot,mode:spec.mode,model:MODEL,endpoint:spec.mode==='world-only'?'/v1/images/generations':'/v1/images/edits',cast:[...spec.cast],size:spec.size,quality:spec.quality,approvedForGeneration:spec.approvedForGeneration===true,references:files.map(f=>({key:f.key,sha256:f.sha256})),videoEligible:false,finalApprovalEligible:false};
  Object.defineProperty(plan,'_files',{value:files,enumerable:false});
  return plan;
}
export async function createOpenAIKeyframe(spec,registry,{apiKey,fetchImpl=fetch,outputPath,receiptPath}={}){
  const plan=await planOpenAIKeyframe(spec,registry);
  if(!plan.approvedForGeneration) deny('generation_approval_required');
  if(typeof apiKey!=='string'||!apiKey.trim()) deny('openai_key_not_configured');
  if(!outputPath||extname(outputPath).toLowerCase()!=='.png') deny('output_must_be_png');
  const headers={Authorization:'Bearer '+apiKey};
  const prompt=spec.prompt+'\n\n'+(plan.mode==='world-only'?'WORLD AUTHORITY ONLY: no named characters, mascots, identifiable people, baked text or logos.':'Preserve exact attached approved character identity and cast. No new people, substitute faces, clothing drift, or baked text.');
  let body;
  if(plan.mode==='world-only'){
    headers['content-type']='application/json';
    body=JSON.stringify({model:MODEL,prompt,n:1,size:plan.size,quality:plan.quality,output_format:'png'});
  }else{
    const form=new FormData();
    for(const [k,v] of Object.entries({model:MODEL,prompt,n:'1',size:plan.size,quality:plan.quality,output_format:'png'})) form.set(k,v);
    for(const ref of plan._files) form.append('image[]',new Blob([ref.bytes],{type:ref.mime}),ref.filename);
    body=form;
  }
  // Reserve all destinations atomically before any billable provider request.
  // This prevents both output and receipt collisions from discarding paid results.
  const targets=[resolve(outputPath),...(receiptPath?[resolve(receiptPath)]:[])];
  const reserved=[];
  let completed=false;
  try{
    for(const target of targets){
      await mkdir(dirname(target),{recursive:true});
      reserved.push({target,handle:await open(target,'wx',0o600)});
    }
  let response;
  try{response=await fetchImpl(API+(plan.mode==='world-only'?'generations':'edits'),{method:'POST',headers,body,redirect:'error',signal:AbortSignal.timeout(120000)});}
  catch{deny('openai_request_failed');}
  if(!response.ok) deny('openai_http_'+Number(response.status||0));
  let result;
  try{result=await response.json();}catch{deny('openai_response_invalid');}
  const b64=result?.data?.[0]?.b64_json;
  if(typeof b64!=='string'||!b64.length||!/^[A-Za-z0-9+/=]+$/.test(b64)) deny('openai_image_missing');
  const image=Buffer.from(b64,'base64');
  if(!image.length||image.length>30*1024*1024) deny('openai_image_invalid_size');
  if(!isImage(image,'image/png')) deny('openai_image_invalid_format');
  await reserved[0].handle.writeFile(image);
  const receipt={schema:'sekret-bip-openai-keyframe-receipt@v1',kind:'GENERATED_REVIEW_REQUIRED',shot:plan.shot,mode:plan.mode,model:MODEL,cast:plan.cast,inputReferenceSha256:plan.references,outputSha256:sha(image),outputBytes:image.length,sourceApprovalVerified:false,characterIdentityReviewed:false,videoEligible:false,finalApprovalEligible:false,neededNextGate:'approved-still-then-image-to-video-then-/makevideo'};
  if(receiptPath) await reserved[1].handle.writeFile(JSON.stringify(receipt,null,2)+'\n');
  completed=true;
  return receipt;
  }finally{
    for(const entry of reserved){
      await entry.handle.close();
      if(!completed) await rm(entry.target,{force:true});
    }
  }
}
function flag(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const specPath=flag('--spec'),registryPath=flag('--registry');
    if(!specPath||!registryPath) deny('usage_requires_spec_and_registry');
    const spec=JSON.parse(await readFile(specPath,'utf8'));
    const registry=JSON.parse(await readFile(registryPath,'utf8'));
    const outcome=process.argv.includes('--execute')
      ?await createOpenAIKeyframe(spec,registry,{apiKey:process.env.OPENAI_API_KEY,outputPath:flag('--out'),receiptPath:flag('--receipt')})
      :await planOpenAIKeyframe(spec,registry);
    if (!process.argv.includes('--execute') && flag('--plan-out')) {
      const planPath=resolve(flag('--plan-out'));
      await mkdir(dirname(planPath),{recursive:true});
      await writeFile(planPath,JSON.stringify(outcome,null,2),{flag:'wx'});
    }
    if (process.argv.includes('--execute')) console.log('BIP_OPENAI_STILL_CREATED_REVIEW_REQUIRED');
    else console.log('BIP_OPENAI_PREFLIGHT_OK');
  }catch(error){
    console.error('BIP_OPENAI_KEYFRAME_BLOCKED');
    process.exitCode=1;
  }
}

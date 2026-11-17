import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile,mkdir,open,rename} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {planOpenAIKeyframe,createOpenAIKeyframe} from '../scripts/generate-openai-keyframe.mjs';

const registry={characters:[{key:'cloud',status:'approved',higgsfield_element_id:'45cc0133-5ad3-4182-90a5-4dca0d5b58fa'}]};
const base={schema:'sekret-bip-openai-keyframe@v1',shot:1,prompt:'Cinematic empty violet courtyard.',size:'1024x1536',quality:'medium',mode:'world-only',cast:[],approvedForGeneration:false};
const tinyPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlQEX4AAAAASUVORK5CYII=','base64');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

async function interceptReferenceStat(t,path,afterStat){
  const probe=await open(path,'r'),prototype=Object.getPrototypeOf(probe),original=prototype.stat;
  await probe.close();
  const observed={calls:0,handle:null,readCalls:0,readBytes:0},originalRead=prototype.read;
  t.mock.method(prototype,'read',async function(...args){
    const result=await originalRead.apply(this,args);
    observed.readCalls++;observed.readBytes+=result.bytesRead;
    return result;
  });
  t.mock.method(prototype,'stat',async function(...args){
    const info=await original.apply(this,args);
    observed.calls++;observed.handle=this;
    await afterStat();
    return info;
  });
  return observed;
}
const referenceSpec=(path,bytes=tinyPng)=>({...base,mode:'character-edit',cast:['cloud'],references:[
  {key:'cloud',path,sha256:sha(bytes),authority:'character-authority',approved:true},
]});

test('reference validation rejects directories and files above the byte limit',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'bip-reference-'));
  try{
    const directory=join(dir,'directory.png');await mkdir(directory);
    await assert.rejects(planOpenAIKeyframe(referenceSpec(directory),registry),/reference_file_invalid/);
    const oversized=join(dir,'large.png'),handle=await open(oversized,'w');
    try{await handle.truncate(20*1024*1024+1);}finally{await handle.close();}
    await assert.rejects(planOpenAIKeyframe(referenceSpec(oversized),registry),/reference_file_invalid/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('reference validation reads the checked descriptor after path replacement and closes it',async(t)=>{
  const dir=await mkdtemp(join(tmpdir(),'bip-reference-'));
  try{
    const path=join(dir,'cloud.png');await writeFile(path,tinyPng);
    const observed=await interceptReferenceStat(t,path,async()=>{
      await rename(path,join(dir,'original.png'));
      await writeFile(path,Buffer.from('replacement is not the approved image'));
    });
    const plan=await planOpenAIKeyframe(referenceSpec(path),registry);
    assert.equal(observed.calls,1,'validation must stat the opened reference descriptor');
    assert.deepEqual(plan._files[0].bytes,tinyPng);
    assert.equal(observed.handle.fd,-1,'success must close the reference descriptor');
  }finally{t.mock.restoreAll();await rm(dir,{recursive:true,force:true});}
});

test('concurrent reference growth is bounded and fails closed with descriptor cleanup',async(t)=>{
  const dir=await mkdtemp(join(tmpdir(),'bip-reference-'));
  try{
    const path=join(dir,'cloud.png');await writeFile(path,tinyPng);
    const observed=await interceptReferenceStat(t,path,async()=>{
      const writer=await open(path,'r+');
      try{await writer.truncate(21*1024*1024);}finally{await writer.close();}
    });
    await assert.rejects(planOpenAIKeyframe(referenceSpec(path),registry),/reference_file_invalid/);
    assert.equal(observed.calls,1);
    assert.ok(observed.readCalls>0,'reference content must use bounded descriptor reads');
    assert.equal(observed.readBytes,20*1024*1024+1,'growth reads at most one sentinel byte beyond the limit');
    assert.equal(observed.handle.fd,-1,'rejection must close the reference descriptor');
  }finally{t.mock.restoreAll();await rm(dir,{recursive:true,force:true});}
});

test('dry-run does not enable video or make provider requests',async()=>{
  const plan=await planOpenAIKeyframe(base,registry);
  assert.equal(plan.kind,'PREFLIGHT_ONLY');
  assert.equal(plan.endpoint,'/v1/images/generations');
  assert.equal(plan.model,'gpt-image-2.5-sunburst');
  assert.equal(plan.videoEligible,false);
  assert.equal(plan.finalApprovalEligible,false);
});
test('world-only shot must not smuggle named cast or images',async()=>{
  await assert.rejects(planOpenAIKeyframe({...base,cast:['cloud']},registry),/world_only_must_have_no_identifiable_cast/);
  await assert.rejects(planOpenAIKeyframe({...base,references:[{key:'cloud'}]},registry),/world_only_must_have_no_identifiable_cast/);
});
test('character shot cannot use text-only identity',async()=>{
  await assert.rejects(planOpenAIKeyframe({...base,mode:'character-edit',cast:['cloud'],references:[]},registry),/character_reference_required/);
});
test('reference hash must match approved file bytes',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'bip-test-'));
  try{
    const path=join(dir,'cloud.png');await writeFile(path,tinyPng);
    const spec={...base,mode:'character-edit',cast:['cloud'],references:[{key:'cloud',path,sha256:'0'.repeat(64),authority:'character-authority',approved:true}]};
    await assert.rejects(planOpenAIKeyframe(spec,registry),/reference_sha256_mismatch/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('fake image with correct SHA cannot pass reference validation',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'bip-test-'));
  try{
    const bytes=Buffer.from('not a PNG'),path=join(dir,'cloud.png');await writeFile(path,bytes);
    const spec={...base,mode:'character-edit',cast:['cloud'],references:[{key:'cloud',path,sha256:sha(bytes),authority:'character-authority',approved:true}]};
    await assert.rejects(planOpenAIKeyframe(spec,registry),/reference_file_invalid_format/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('paid generation requires explicit approval before network access',async()=>{
  let invoked=false;
  await assert.rejects(createOpenAIKeyframe(base,registry,{apiKey:'dummy',fetchImpl:async()=>{invoked=true;}}),/generation_approval_required/);
  assert.equal(invoked,false);
});
test('world generation records non-authorizing receipt and no secret or prompt',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'bip-test-'));
  try{
    let request;
    const fetchImpl=async(url,init)=>{request={url,init};return {ok:true,json:async()=>({data:[{b64_json:tinyPng.toString('base64')}]})};};
    const output=join(dir,'frame.png'),receipt=join(dir,'frame.json');
    const result=await createOpenAIKeyframe({...base,approvedForGeneration:true},registry,{apiKey:'secret',fetchImpl,outputPath:output,receiptPath:receipt});
    assert.equal(request.url,'https://api.openai.com/v1/images/generations');
    assert.equal(JSON.parse(request.init.body).model,'gpt-image-2.5-sunburst');
    assert.equal(result.outputSha256,sha(tinyPng));
    assert.equal(sha(await readFile(output)),sha(tinyPng));
    const saved=await readFile(receipt,'utf8');
    assert.equal(saved.includes('secret'),false);
    assert.equal(saved.includes(base.prompt),false);
    assert.equal(result.videoEligible,false);
    assert.equal(result.finalApprovalEligible,false);
    assert.match(result.neededNextGate,/makevideo/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('character edit includes only hashed character-authority references',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'bip-test-'));
  try{
    const path=join(dir,'cloud.png');await writeFile(path,tinyPng);
    const spec={...base,mode:'character-edit',cast:['cloud'],approvedForGeneration:true,references:[{key:'cloud',path,sha256:sha(tinyPng),authority:'character-authority',approved:true}]};
    let request;
    const fetchImpl=async(url,init)=>{request={url,init};return {ok:true,json:async()=>({data:[{b64_json:tinyPng.toString('base64')}]})};};
    await createOpenAIKeyframe(spec,registry,{apiKey:'dummy',fetchImpl,outputPath:join(dir,'frame.png')});
    assert.equal(request.url,'https://api.openai.com/v1/images/edits');
    assert.equal(request.init.body.getAll('image[]').length,1);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('non-PNG provider response never writes a false frame or receipt',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'bip-test-'));
  try{
    const output=join(dir,'frame.png'),receipt=join(dir,'frame.json');
    const fetchImpl=async()=>({ok:true,json:async()=>({data:[{b64_json:Buffer.from('fake image').toString('base64')}]})});
    await assert.rejects(createOpenAIKeyframe({...base,approvedForGeneration:true},registry,{apiKey:'dummy',fetchImpl,outputPath:output,receiptPath:receipt}),/openai_image_invalid_format/);
    await assert.rejects(readFile(output));
    await assert.rejects(readFile(receipt));
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('provider failures do not echo response bodies or credentials',async()=>{
  const fetchImpl=async()=>({ok:false,status:401,text:async()=>('private provider payload')});
  await assert.rejects(createOpenAIKeyframe({...base,approvedForGeneration:true},registry,{apiKey:'private-secret',fetchImpl,outputPath:'/tmp/bip-no-output.png'}),error=>error.message==='openai_http_401');
});
test('existing output blocks paid provider request and preserves image',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'bip-test-'));
  try{
    const output=join(dir,'frame.png'),receipt=join(dir,'receipt.json'),original=Buffer.from('old-image');
    await writeFile(output,original);
    let requests=0;
    await assert.rejects(
      createOpenAIKeyframe({...base,approvedForGeneration:true},registry,{
        apiKey:'dummy',outputPath:output,receiptPath:receipt,
        fetchImpl:async()=>{requests++;return {ok:true,json:async()=>({data:[{b64_json:tinyPng.toString('base64')}]})};},
      }),
      {code:'EEXIST'},
    );
    assert.equal(requests,0,'an existing output must not spend credits');
    assert.deepEqual(await readFile(output),original);
    await assert.rejects(readFile(receipt),{code:'ENOENT'});
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('existing receipt blocks paid request and cleans output reservation',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'bip-test-'));
  try{
    const output=join(dir,'frame.png'),receipt=join(dir,'receipt.json'),original='existing receipt';
    await writeFile(receipt,original);
    let requests=0;
    await assert.rejects(
      createOpenAIKeyframe({...base,approvedForGeneration:true},registry,{
        apiKey:'dummy',outputPath:output,receiptPath:receipt,
        fetchImpl:async()=>{requests++;return {ok:true,json:async()=>({data:[{b64_json:tinyPng.toString('base64')}]})};},
      }),
      {code:'EEXIST'},
    );
    assert.equal(requests,0,'an existing receipt must not spend credits');
    await assert.rejects(readFile(output),{code:'ENOENT'});
    assert.equal(await readFile(receipt,'utf8'),original);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('failed provider request cleans both reserved destinations',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'bip-test-'));
  try{
    const output=join(dir,'frame.png'),receipt=join(dir,'receipt.json');
    await assert.rejects(
      createOpenAIKeyframe({...base,approvedForGeneration:true},registry,{
        apiKey:'dummy',outputPath:output,receiptPath:receipt,
        fetchImpl:async()=>({ok:false,status:429}),
      }),
      /openai_http_429/,
    );
    await assert.rejects(readFile(output),{code:'ENOENT'});
    await assert.rejects(readFile(receipt),{code:'ENOENT'});
  }finally{await rm(dir,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyWorkersBuildsRead } from '../scripts/verify-cloudflare-workers-builds-read.mjs';

const rows=[{id:'bip',tag:'bip-tag'},{id:'sekret-backend',tag:'backend-tag'}];
const accountId='1'.repeat(32);
function provider({deny=[],invalid=[],scriptRows=rows}={}) {
  const calls=[];
  const request=async path=>{
    calls.push(path);
    const blocked=deny.some(x=>path.includes(x));
    const broken=invalid.some(x=>path.includes(x));
    return {response:{ok:!blocked,status:blocked?403:200},body:blocked?{success:false,errors:[{message:'Sensitive provider error not to echo'}]}:{success:true,result:broken?{}:[]}};
  };
  return {scriptRows,request,calls};
}

test('requires Builds triggers and builds read for both protected worker identities',async()=>{
  const p=provider();const result=await verifyWorkersBuildsRead({rows:p.scriptRows,accountId,request:p.request});
  assert.deepEqual(result,{ok:true,code:'builds-read-verified',checkedWorkers:2});
  for(const tag of ['bip-tag','backend-tag']){
    assert.ok(p.calls.some(x=>x.endsWith(`/builds/workers/${tag}/triggers`)));
    assert.ok(p.calls.some(x=>x.endsWith(`/builds/workers/${tag}/builds?per_page=50`)));
  }
  assert.equal(p.calls.length,4);
});
test('scripts-only token denied on Builds endpoints is rejected',async()=>{
  const p=provider({deny:['/builds/workers/']});const result=await verifyWorkersBuildsRead({rows:p.scriptRows,accountId,request:p.request});
  assert.equal(result.ok,false);assert.equal(result.code,'builds-read-unavailable');
  assert.ok(p.calls.length>0);
  assert.ok(!JSON.stringify(result).includes('Sensitive provider error'));
});
test('malformed Builds API result cannot pass as verified',async()=>{
  const p=provider({invalid:['/builds?per_page=50']});const result=await verifyWorkersBuildsRead({rows:p.scriptRows,accountId,request:p.request});
  assert.equal(result.ok,false);assert.equal(result.code,'builds-read-unavailable');
});
test('missing protected Worker tag is rejected before credential read-back',async()=>{
  const p=provider({scriptRows:[{id:'bip',tag:'bip-tag'}]});const result=await verifyWorkersBuildsRead({rows:p.scriptRows,accountId,request:p.request});
  assert.equal(result.ok,false);assert.equal(result.code,'required-worker-tag-missing');assert.equal(p.calls.length,0);
});
test('duplicate Worker identity is rejected before credential read-back',async()=>{
  const p=provider({scriptRows:[...rows,rows[0]]});const result=await verifyWorkersBuildsRead({rows:p.scriptRows,accountId,request:p.request});
  assert.equal(result.ok,false);assert.equal(result.code,'required-worker-tag-missing');assert.equal(p.calls.length,0);
});
test('observed optional alpha Worker must have readable Builds triggers',async()=>{
  const p=provider({scriptRows:[...rows,{id:'sekret-backend-alpha',tag:'alpha-tag'}]});const result=await verifyWorkersBuildsRead({rows:p.scriptRows,accountId,request:p.request});
  assert.equal(result.ok,true);assert.equal(result.checkedWorkers,3);
  assert.ok(p.calls.some(x=>x.endsWith('/builds/workers/alpha-tag/triggers')));
});
test('missing alpha tag fails without provider read-back',async()=>{
  const p=provider({scriptRows:[...rows,{id:'sekret-backend-alpha'}]});const result=await verifyWorkersBuildsRead({rows:p.scriptRows,accountId,request:p.request});
  assert.equal(result.ok,false);assert.equal(result.code,'required-worker-tag-missing');assert.equal(p.calls.length,0);
});
test('provider transport exception fails safely',async()=>{
  const result=await verifyWorkersBuildsRead({rows,accountId,request:async()=>{throw new Error('SECRET material from provider')}});
  assert.deepEqual(result,{ok:false,code:'builds-read-unavailable',checkedWorkers:0});
});

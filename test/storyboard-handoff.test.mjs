import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStoryboardHandoff } from '../scripts/storyboard-handoff.mjs';
const hash = 'a'.repeat(64);
function fixture() {
  const shots = Array.from({length:6}, (_,i)=>({order:i+1,startFrame:i*240,durationFrames:240,inputFingerprint:(i+1).toString().repeat(64),request:{projectId:'sekret-bip',adapterId:'runway-image-to-video@v1',request:{duration:10}},canonicalReferenceSha256:hash}));
  return {plan:{contract:'fcr/private-storyboard-media-jobs@v1',projectId:'sekret-bip',storyboardFingerprint:hash,sourceRecordId:'reviewed',fps:24,width:720,height:1280,totalFrames:1440,totalSeconds:60,assemblyAudio:{sha256:hash},shots,publishAuthority:false,outputApproval:'REVIEW_REQUIRED'},manifest:{master:{width:720,height:1280,fps:24,durationSeconds:60},sourcePolicy:{requiredShots:[1,2,3,4,5,6]},timeline:shots.map(s=>({shot:s.order,durationSeconds:10}))},mappings:shots.map(s=>({shot:s.order})),audioSha256:hash};
}
test('accepts exact 60-second ordered handoff',()=>assert.equal(validateStoryboardHandoff(fixture()).length,6));
for(const [name,change] of Object.entries({
 'short master': f=>f.manifest.master.durationSeconds=59,
 'wrong audio': f=>f.audioSha256='b'.repeat(64),
 'missing audio': f=>f.audioSha256=null,
 'wrong project': f=>f.plan.projectId='other',
 'wrong aspect': f=>f.manifest.master.width=1280,
 'reordered timeline': f=>f.manifest.timeline.reverse(),
 'reordered mapping': f=>f.mappings.reverse(),
 'missing mapping': f=>f.mappings.pop(),
 'gap': f=>f.plan.shots[2].startFrame++,
 'trimmed source': f=>f.manifest.timeline[0].sourceStartSeconds=1,
 'duplicate fingerprint': f=>f.plan.shots[1].inputFingerprint=f.plan.shots[0].inputFingerprint,
 'wrong shot duration': f=>f.plan.shots[0].request.request.duration=9,
 'publication authority': f=>f.plan.publishAuthority=true,
})) test('rejects '+name,()=>{const f=fixture();change(f);assert.throws(()=>validateStoryboardHandoff(f),{code:'FCR_STORYBOARD_HANDOFF_INVALID'});});

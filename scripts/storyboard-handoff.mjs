// Trusted operator inputs only. Fingerprints bind bytes and order, not authority.
export function validateStoryboardHandoff({ plan, manifest, mappings, audioSha256 }) {
  const invalid = () => { const e = new Error('FCR_STORYBOARD_HANDOFF_INVALID'); e.code = e.message; throw e; };
  const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  const fps = plan?.fps;
  const master = manifest?.master;
  const timeline = manifest?.timeline;
  const required = manifest?.sourcePolicy?.requiredShots;
  const shots = plan?.shots;
  if (plan?.contract !== 'fcr/private-storyboard-media-jobs@v1' || plan.projectId !== 'sekret-bip' || plan.publishAuthority !== false || plan.outputApproval !== 'REVIEW_REQUIRED' || !hash(plan.storyboardFingerprint) || typeof plan.sourceRecordId !== 'string' || !plan.sourceRecordId.trim() || ![24,25,30].includes(fps) || plan.width !== 720 || plan.height !== 1280 || !hash(plan.assemblyAudio?.sha256) || audioSha256 !== plan.assemblyAudio.sha256 || !Number.isInteger(plan.totalFrames) || plan.totalFrames < 60*fps || plan.totalFrames > 600*fps || plan.totalSeconds !== plan.totalFrames/fps || master?.durationSeconds !== plan.totalSeconds || master.fps !== fps || master.width !== plan.width || master.height !== plan.height || !Array.isArray(shots) || !shots.length || shots.length > 120 || ![timeline,required,mappings].every(a=>Array.isArray(a) && a.length === shots.length)) invalid();
  let cursor = 0;
  const seen = new Set();
  const result = shots.map((s,i)=>{
    const order = i+1;
    const seconds = s?.durationFrames/fps;
    if (s?.order !== order || s.startFrame !== cursor || !Number.isInteger(seconds) || seconds < 2 || seconds > 10 || !hash(s.inputFingerprint) || seen.has(s.inputFingerprint) || !hash(s.canonicalReferenceSha256) || s.request?.projectId !== plan.projectId || s.request?.adapterId !== 'runway-image-to-video@v1' || s.request?.request?.duration !== seconds || timeline[i]?.shot !== order || timeline[i]?.durationSeconds !== seconds || (timeline[i]?.sourceStartSeconds ?? 0) !== 0 || required[i] !== order || mappings[i]?.shot !== order) invalid();
    cursor += s.durationFrames;
    seen.add(s.inputFingerprint);
    return {...mappings[i], expectedInputFingerprint:s.inputFingerprint, expectedAdapterId:s.request.adapterId};
  });
  if (cursor !== plan.totalFrames) invalid();
  return result;
}

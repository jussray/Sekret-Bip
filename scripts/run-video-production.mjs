import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, rename, readdir, open, unlink } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderBipVideoMaster } from './render-video-master.mjs';

const schema = 'sekret-bip-video-production-run@v1';
const scripts = dirname(fileURLToPath(import.meta.url));
const proofSchemas = { render: 'sekret-bip-video-render-proof@v1', metadata: 'sekret-bip-video-master-proof@v1', playback: 'sekret-bip-video-playback-proof@v1' };
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const hashFile = async (path) => digest(await readFile(path));
async function json(path) { return JSON.parse(await readFile(path, 'utf8')); }
async function exists(path) { try { await readFile(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }
function reject(code) { const error = new Error(code); error.code = code; throw error; }

// Test injection is module-only; the operator CLI always invokes the repo verifiers.
export async function runBipVideoProduction(options, dependencies = {}) {
  const directory = resolve(options.runDir);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockPath = join(directory, 'production-run.lock');
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') reject('RUN_DIRECTORY_LOCKED_REVIEW_OWNER'); throw error; }
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    return await runLockedProduction(options, dependencies);
  } finally { await lock.close(); await unlink(lockPath); }
}

async function runLockedProduction({ manifestPath, sourcesPath, runDir, audioPath = null }, { runProcess = spawnSync } = {}) {
  const directory = resolve(runDir);
  const statePath = join(directory, 'production-run.json');
  let state = await exists(statePath) ? await json(statePath) : null;
  if (state && state.schema !== schema) reject('RUN_STATE_INVALID');
  if (!state && (await readdir(directory)).filter((name) => name !== 'production-run.lock').length) reject('RUN_DIRECTORY_NOT_EMPTY');
  const save = async () => {
    state.updatedAt = new Date().toISOString();
    const temporary = join(directory, 'production-run.pending.json');
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, statePath);
  };
  const blocked = async (stage, reason) => {
    state.status = 'BLOCKED'; state.blockedStage = stage; state.reason = reason;
    state.finalApprovalEligible = false; state.published = false;
    await save(); return state;
  };
  const previous = state;
  state ||= { schema, runId: randomUUID(), actor: 'operator-cli', createdAt: new Date().toISOString(), inputFingerprint: null, stages: {}, finalApprovalEligible: false, published: false };
  let manifest, sources, fingerprint;
  try {
    manifest = await json(resolve(manifestPath));
    const payload = await json(resolve(sourcesPath));
    sources = payload.shots || payload;
    if (!Array.isArray(manifest.timeline)) reject('APPROVED_TIMELINE_REQUIRED');
    if (!Array.isArray(sources) || !sources.length) reject('APPROVED_MOVING_CLIPS_REQUIRED');
    const boundSources = [];
    for (const source of sources) {
      if (source.approved !== true || !String(source.path || '').toLowerCase().endsWith('.mp4')) reject('APPROVED_MP4_SOURCES_REQUIRED');
      if (resolve(source.path) === join(directory, 'master.mp4')) reject('SOURCE_OUTPUT_COLLISION');
      const actual = await hashFile(source.path);
      if (actual !== String(source.sha256 || '').toLowerCase()) reject('SOURCE_HASH_MISMATCH');
      boundSources.push({ shot: source.shot, sha256: actual });
    }
    fingerprint = digest(JSON.stringify({ manifest, descriptors: sources, boundSources,
      audioSha256: audioPath ? await hashFile(resolve(audioPath)) : null,
      runtimeHashes: await Promise.all(['run-video-production.mjs', 'render-video-master.mjs', 'verify-video-master.mjs', 'verify-video-playback.mjs'].map((file) => hashFile(join(scripts, file)))) }));
  } catch (error) {
    // Never overwrite a previously bound run when its current inputs cannot be verified.
    if (previous?.inputFingerprint) return { schema, status: 'BLOCKED', blockedStage: 'preflight', reason: 'INPUT_REVERIFICATION_FAILED', finalApprovalEligible: false, published: false };
    return blocked('preflight', /^[A-Z_]+$/.test(error.code || '') && error.code !== 'ENOENT' ? error.code : 'APPROVED_INPUTS_MISSING_OR_INVALID');
  }
  if (previous?.inputFingerprint && previous.inputFingerprint !== fingerprint) reject('RUN_INPUTS_CHANGED_USE_NEW_DIRECTORY');
  state.inputFingerprint = fingerprint;
  const mediaPath = join(directory, 'master.mp4');
  const validStage = async (name) => {
    const stage = state.stages[name];
    if (!stage?.pass || !await exists(mediaPath) || await hashFile(mediaPath) !== stage.mediaSha256) return false;
    const receiptPath = join(directory, `${name}-receipt.json`);
    if (!await exists(receiptPath) || await hashFile(receiptPath) !== stage.receiptSha256) return false;
    const receipt = await json(receiptPath);
    return receipt.schema === proofSchemas[name] && receipt.pass === true && receipt.sha256 === stage.mediaSha256;
  };
  if (state.stages.render && !await validStage('render')) reject('RUN_RENDER_EVIDENCE_CHANGED');
  if (!state.stages.render) {
    if (await exists(mediaPath)) return blocked('render', 'PARTIAL_OR_UNOWNED_MASTER_REQUIRES_REVIEW_NEW_RUN_DIRECTORY');
    try {
      const rendered = await renderBipVideoMaster({ manifest, sources, outputPath: mediaPath,
        receiptPath: join(directory, 'render-receipt.json'), audioPath: audioPath ? resolve(audioPath) : null });
      if (rendered.kind !== 'RENDERED') return blocked('render', 'MEDIA_RENDER_CAPABILITY_UNAVAILABLE');
      state.stages.render = { pass: true, mediaSha256: rendered.receipt.sha256,
        receiptSha256: await hashFile(join(directory, 'render-receipt.json')) };
      await save();
    } catch { return blocked('render', 'APPROVED_MEDIA_RENDER_FAILED'); }
  }
  for (const [stage, script] of [['metadata', 'verify-video-master.mjs'], ['playback', 'verify-video-playback.mjs']]) {
    if (await validStage(stage)) continue;
    delete state.stages[stage];
    const receiptPath = join(directory, `${stage}-receipt.json`);
    const result = runProcess(process.execPath, [join(scripts, script), '--manifest', resolve(manifestPath), '--media', mediaPath, '--receipt', receiptPath], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    if (result.status !== 0) return blocked(stage, stage === 'playback' ? 'PLAYBACK_VERIFICATION_UNAVAILABLE_OR_FAILED' : 'MASTER_VERIFICATION_FAILED');
    let receipt;
    try { receipt = await json(receiptPath); } catch { return blocked(stage, 'VERIFIER_RECEIPT_MISSING_OR_INVALID'); }
    const receiptSha256 = await hashFile(receiptPath);
    if (receipt.schema !== proofSchemas[stage] || receipt.pass !== true || receipt.sha256 !== state.stages.render.mediaSha256 || await hashFile(mediaPath) !== state.stages.render.mediaSha256) return blocked(stage, 'VERIFIER_MEDIA_BINDING_FAILED');
    state.stages[stage] = { pass: true, mediaSha256: receipt.sha256, receiptSha256 };
    await save();
  }
  state.status = 'TECHNICAL_PROOF_COMPLETE_REVIEW_REQUIRED';
  delete state.blockedStage; delete state.reason;
  state.requiredNextProof = ['character-continuity-review', 'lip-sync-review', 'tone-and-audio-clarity-review', 'founder-final-master-approval', 'separate-publication-authority'];
  state.finalApprovalEligible = false; state.published = false;
  await save(); return state;
}

function arg(name) { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; }
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const manifestPath = arg('--manifest'), sourcesPath = arg('--sources'), runDir = arg('--run-dir');
    if (!manifestPath || !sourcesPath || !runDir) reject('MANIFEST_SOURCES_AND_RUN_DIRECTORY_REQUIRED');
    const result = await runBipVideoProduction({ manifestPath, sourcesPath, runDir, audioPath: arg('--audio') });
    console.log(JSON.stringify(result));
    if (result.status === 'BLOCKED') process.exitCode = 2;
  } catch (error) {
    const allowed = new Set(['RUN_STATE_INVALID', 'RUN_DIRECTORY_NOT_EMPTY', 'RUN_DIRECTORY_LOCKED_REVIEW_OWNER', 'RUN_INPUTS_CHANGED_USE_NEW_DIRECTORY', 'RUN_RENDER_EVIDENCE_CHANGED', 'MANIFEST_SOURCES_AND_RUN_DIRECTORY_REQUIRED']);
    console.error(JSON.stringify({ event: 'BIP_VIDEO_PRODUCTION_BLOCKED', reason: allowed.has(error?.code) ? error.code : 'PRODUCTION_EXECUTION_FAILED' }));
    process.exitCode = 1;
  }
}

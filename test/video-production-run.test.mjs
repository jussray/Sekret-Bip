import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { runBipVideoProduction } from '../scripts/run-video-production.mjs';
import { writeImportedSources } from '../scripts/import-media-job-clips.mjs';
import { probeBipVideoRenderer } from '../scripts/render-video-master.mjs';
const hash = (value) => createHash('sha256').update(value).digest('hex');
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'bip-production-'));
  const source = join(dir, 'shot.mp4');
  const result = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=160x284:r=24:d=1', '-f', 'lavfi', '-i', 'sine=frequency=660:duration=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', source]);
  assert.equal(result.status, 0);
  const manifest = {
    $schema: 'sekret-bip-video-master@v1', editor: { role: 'post-production-only' },
    master: { container: 'mp4', codec: 'h264', width: 160, height: 284, fps: 24, durationSeconds: 1, durationToleranceSeconds: 0.1 },
    sourcePolicy: { requiredShots: [1], requireApprovedShotEvidence: true, allowUnapprovedSource: false, allowIdentityRegeneration: false, allowInventedCharacters: false, allowWorldAuthorityAsCharacterAuthority: false },
    timeline: [{ shot: 1, durationSeconds: 1 }],
    proof: { playwrightPlayback: 'required', continuityReview: 'required', finalMasterApprovalAfterAllProof: true },
  };
  const manifestPath = join(dir, 'manifest.json'), sourcesPath = join(dir, 'sources.json');
  await writeFile(manifestPath, JSON.stringify(manifest));
  await writeFile(sourcesPath, JSON.stringify({ shots: [{ shot: 1, path: source, approved: true, sha256: hash(await readFile(source)) }] }));
  return { dir, source, manifestPath, sourcesPath, runDir: join(dir, 'run') };
}

test('missing approved footage returns a persistent blocked state without generation', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bip-no-clips-'));
  try {
    const result = await runBipVideoProduction({ manifestPath: join(dir, 'missing.json'), sourcesPath: join(dir, 'sources.json'), runDir: join(dir, 'run') });
    assert.equal(result.status, 'BLOCKED'); assert.equal(result.blockedStage, 'preflight');
    assert.equal(result.finalApprovalEligible, false); assert.equal(result.published, false);
    assert.equal(JSON.parse(await readFile(join(dir, 'run/production-run.json'))).status, 'BLOCKED');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('actual render and metadata proof persist; blocked browser resumes without rerender; source changes reject reuse', { timeout: 60000 }, async (t) => {
  if (!probeBipVideoRenderer().available) return t.skip('ffmpeg/ffprobe unavailable');
  const f = await fixture();
  try {
    let metadataRuns = 0;
    const first = await runBipVideoProduction(f, { runProcess(command, args, options) {
      if (args[0].endsWith('verify-video-playback.mjs')) return { status: 1, stderr: 'synthetic missing browser; do not persist private output' };
      metadataRuns++; return spawnSync(command, args, options);
    } });
    assert.equal(first.status, 'BLOCKED'); assert.equal(first.blockedStage, 'playback');
    assert.ok(first.stages.render.pass && first.stages.metadata.pass);
    const originalMaster = await readFile(join(f.runDir, 'master.mp4'));
    assert.equal(metadataRuns, 1);
    const resumed = await runBipVideoProduction(f, { runProcess(command, args) {
      assert.ok(args[0].endsWith('verify-video-playback.mjs'), 'resume must not rerun valid metadata');
      const receipt = args[args.indexOf('--receipt') + 1];
      // Explicitly simulated browser lane: tests orchestration, never browser proof.
      const write = spawnSync(process.execPath, ['-e', 'require("fs").writeFileSync(process.argv[1], process.argv[2])', receipt, JSON.stringify({ schema: 'sekret-bip-video-playback-proof@v1', pass: true, sha256: hash(originalMaster) })]);
      assert.equal(write.status, 0); return { status: 0 };
    } });
    assert.equal(resumed.status, 'TECHNICAL_PROOF_COMPLETE_REVIEW_REQUIRED');
    assert.equal(resumed.finalApprovalEligible, false); assert.equal(resumed.published, false);
    assert.ok(resumed.requiredNextProof.includes('founder-final-master-approval'));
    assert.deepEqual(await readFile(join(f.runDir, 'master.mp4')), originalMaster);
    await writeFile(f.source, 'changed bytes');
    const changed = await runBipVideoProduction(f);
    assert.equal(changed.status, 'BLOCKED'); assert.equal(changed.blockedStage, 'preflight');
    const persisted = JSON.parse(await readFile(join(f.runDir, 'production-run.json')));
    assert.equal(persisted.inputFingerprint, resumed.inputFingerprint, 'invalid inputs cannot replace a bound receipt');
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test('successful subprocess without matching receipt never advances playback', { timeout: 60000 }, async (t) => {
  if (!probeBipVideoRenderer().available) return t.skip('ffmpeg/ffprobe unavailable');
  const f = await fixture();
  try {
    const result = await runBipVideoProduction(f, { runProcess(command, args, options) {
      return args[0].endsWith('verify-video-playback.mjs') ? { status: 0 } : spawnSync(command, args, options);
    } });
    assert.equal(result.status, 'BLOCKED'); assert.equal(result.reason, 'VERIFIER_RECEIPT_MISSING_OR_INVALID');
    assert.equal(result.stages.playback, undefined);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test('60-second example is a frame-aligned vertical template, not source approval', async () => {
  const m = JSON.parse(await readFile(new URL('../examples/video-short-60s.manifest.json', import.meta.url)));
  assert.equal(m.master.width / m.master.height, 9 / 16);
  assert.equal(m.timeline.reduce((n, s) => n + s.durationSeconds, 0), 60);
  assert.deepEqual(m.timeline.map((s) => s.shot), m.sourcePolicy.requiredShots);
  assert.equal(m.delivery.status, 'template-not-approved-production');
});

test('concurrent production runs admit one owner and preserve exclusive output ownership', { timeout: 60000 }, async (t) => {
  if (!probeBipVideoRenderer().available) return t.skip('ffmpeg/ffprobe unavailable');
  const f = await fixture();
  try {
    const calls = [runBipVideoProduction(f, { runProcess: () => ({ status: 1 }) }), runBipVideoProduction(f, { runProcess: () => ({ status: 1 }) })];
    const results = await Promise.allSettled(calls);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    const denied = results.find((r) => r.status === 'rejected');
    assert.equal(denied.reason.code, 'RUN_DIRECTORY_LOCKED_REVIEW_OWNER');
    const state = JSON.parse(await readFile(join(f.runDir, 'production-run.json')));
    assert.equal(state.status, 'BLOCKED'); assert.ok(state.stages.render.pass);
    await assert.rejects(readFile(join(f.runDir, 'production-run.lock')), /ENOENT/);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});


test('FCR reviewed clip imports into actual renderer and metadata pipeline without autoapproving playback', { timeout: 60000 }, async (t) => {
  if (!probeBipVideoRenderer().available) return t.skip('ffmpeg/ffprobe unavailable');
  const f = await fixture();
  try {
    const receiptPath = join(f.dir, 'job.json'), reviewPath = join(f.dir, 'review.json'), outputPath = join(f.dir, 'imported.json');
    const sha256 = hash(await readFile(f.source));
    await writeFile(receiptPath, JSON.stringify({ version: 'fcr/media-job@v1', projectId: 'sekret-bip', jobId: 'synthetic-job', adapterId: 'synthetic-provider',
      inputFingerprint: 'a'.repeat(64), approvalRecordId: 'input-generation-approval', recordedAt: '2026-11-01T20:00:00Z', taskId: 'synthetic-task',
      state: 'SUCCEEDED', result: { state: 'SUCCEEDED', taskId: 'synthetic-task', output: { sha256 } }, outputApproval: 'REVIEW_REQUIRED', publishAuthority: false }));
    await writeFile(reviewPath, JSON.stringify({ version: 'sekret-bip-media-review@v1', reviewType: 'human', reviewId: 'synthetic-independent-review', reviewerId: 'synthetic-human',
      reviewedAt: '2026-11-01T20:01:00Z', projectId: 'sekret-bip', jobId: 'synthetic-job', inputFingerprint: 'a'.repeat(64), shot: 1, sha256,
      approved: true, identityApproved: true, continuityApproved: true, audioApproved: true }));
    const imported = await writeImportedSources({ projectId: 'sekret-bip', mappings: [{ shot: 1, receiptPath, reviewPath, mediaPath: f.source }], outputPath });
    assert.equal(imported.kind, 'IMPORTED');
    const result = await runBipVideoProduction({ ...f, sourcesPath: outputPath }, { runProcess(command, args, options) {
      return args[0].endsWith('verify-video-playback.mjs') ? { status: 1 } : spawnSync(command, args, options);
    } });
    assert.ok(result.stages.render.pass && result.stages.metadata.pass);
    assert.equal(result.status, 'BLOCKED'); assert.equal(result.blockedStage, 'playback');
    assert.equal(result.finalApprovalEligible, false);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

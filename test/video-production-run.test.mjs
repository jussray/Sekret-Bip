import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
  const result = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=160x284:r=24:d=60', '-f', 'lavfi', '-i', 'sine=frequency=660:duration=60', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', source]);
  assert.equal(result.status, 0);
  const manifest = {
    $schema: 'sekret-bip-video-master@v1', editor: { role: 'post-production-only' },
    master: { container: 'mp4', codec: 'h264', width: 160, height: 284, fps: 24, durationSeconds: 60, durationToleranceSeconds: 0.1 },
    sourcePolicy: { requiredShots: [1], requireApprovedShotEvidence: true, allowUnapprovedSource: false, allowIdentityRegeneration: false, allowInventedCharacters: false, allowWorldAuthorityAsCharacterAuthority: false },
    timeline: [{ shot: 1, durationSeconds: 60 }],
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
      const write = spawnSync(process.execPath, ['-e', 'require("fs").writeFileSync(process.argv[1], process.argv[2])', receipt, JSON.stringify({ schema: 'sekret-bip-video-playback-proof@v1', pass: true, sha256: hash(originalMaster), before: { duration: 60 } })]);
      assert.equal(write.status, 0); return { status: 0 };
    } });
    assert.equal(resumed.status, 'TECHNICAL_PROOF_COMPLETE_REVIEW_REQUIRED');
    assert.equal(resumed.finalApprovalEligible, false); assert.equal(resumed.published, false);
    assert.ok(resumed.requiredNextProof.includes('founder-final-master-approval'));
    assert.ok(resumed.requiredNextProof.includes('character-continuity-review'));
    assert.equal(JSON.parse(await readFile(join(f.runDir, 'render-receipt.json'))).master.durationSeconds, 60);
    assert.ok(JSON.parse(await readFile(join(f.runDir, 'metadata-receipt.json'))).actual.durationSeconds >= 60);
    assert.deepEqual(await readFile(join(f.runDir, 'master.mp4')), originalMaster);
    // A cached success must also meet the minimum, even when its byte binding is updated.
    const playbackPath = join(f.runDir, 'playback-receipt.json');
    const shortCached = JSON.stringify({ schema: 'sekret-bip-video-playback-proof@v1', pass: true,
      sha256: hash(originalMaster), before: { duration: 59.95 } });
    await writeFile(playbackPath, shortCached);
    const cachedState = JSON.parse(await readFile(join(f.runDir, 'production-run.json')));
    cachedState.stages.playback.receiptSha256 = hash(shortCached);
    await writeFile(join(f.runDir, 'production-run.json'), JSON.stringify(cachedState));
    let playbackRechecks = 0;
    const rechecked = await runBipVideoProduction(f, { runProcess(command, args) {
      assert.ok(args[0].endsWith('verify-video-playback.mjs'));
      playbackRechecks++; return { status: 1 };
    } });
    assert.equal(playbackRechecks, 1);
    assert.equal(rechecked.status, 'BLOCKED');
    assert.equal(rechecked.stages.playback, undefined);
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


test('production preflight rejects sub-minute or missing durations before reading footage', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bip-short-master-'));
  try {
    for (const durationSeconds of [59.9, 0, null, '60']) {
      const manifestPath = join(dir, 'manifest.json'), sourcesPath = join(dir, 'sources.json');
      await writeFile(manifestPath, JSON.stringify({ timeline: [], master: { durationSeconds } }));
      await writeFile(sourcesPath, JSON.stringify({ shots: [] }));
      const runDir = join(dir, String(durationSeconds));
      const result = await runBipVideoProduction({ manifestPath, sourcesPath, runDir });
      assert.equal(result.reason, 'FINAL_MASTER_MINIMUM_DURATION_REQUIRED');
      assert.equal(result.blockedStage, 'preflight');
      assert.deepEqual(result.stages, {});
      await assert.rejects(readFile(join(runDir, 'master.mp4')), /ENOENT/);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('successful hash-bound verifiers cannot accept sub-minute measured durations or missing duration evidence', { timeout: 60000 }, async (t) => {
  if (!probeBipVideoRenderer().available) return t.skip('ffmpeg/ffprobe unavailable');
  const f = await fixture();
  try {
    for (const stage of ['metadata', 'playback']) {
      for (const duration of [59.95, null]) {
        const runDir = join(f.dir, `${stage}-${duration}`);
        const result = await runBipVideoProduction({ ...f, runDir }, { runProcess(command, args, options) {
          if (!args[0].endsWith(`verify-video-${stage === 'metadata' ? 'master' : 'playback'}.mjs`)) return spawnSync(command, args, options);
          const receiptPath = args[args.indexOf('--receipt') + 1];
          // Deliberately simulated verifier evidence tests acceptance only, not browser playback.
          const receipt = { schema: `sekret-bip-video-${stage === 'metadata' ? 'master' : 'playback'}-proof@v1`, pass: true,
            sha256: hash(readFileSync(join(runDir, 'master.mp4'))),
            ...(stage === 'metadata' ? { actual: { durationSeconds: duration } } : { before: { duration } }) };
          const write = spawnSync(process.execPath, ['-e', 'require("fs").writeFileSync(process.argv[1], process.argv[2])', receiptPath, JSON.stringify(receipt)]);
          assert.equal(write.status, 0); return { status: 0 };
        } });
        assert.equal(result.status, 'BLOCKED');
        assert.equal(result.blockedStage, stage);
        assert.equal(result.reason, 'FINAL_MASTER_MINIMUM_DURATION_REQUIRED');
        assert.equal(result.stages[stage], undefined);
        assert.equal(result.finalApprovalEligible, false);
      }
    }
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

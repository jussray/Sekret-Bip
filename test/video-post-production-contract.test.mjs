import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const read = (path) => readFile(path, 'utf8');

test('Episode 001 video-use manifest keeps editing below canon authority', async () => {
  const manifest = JSON.parse(await read('production/video-use/episode-001.json'));
  assert.equal(manifest.$schema, 'sekret-bip-video-master@v1');
  assert.equal(manifest.editor.adapter, 'video-use');
  assert.equal(manifest.editor.role, 'post-production-only');
  assert.deepEqual(manifest.sourcePolicy.requiredShots, [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(manifest.sourcePolicy.requireApprovedShotEvidence, true);
  assert.equal(manifest.sourcePolicy.allowIdentityRegeneration, false);
  assert.equal(manifest.sourcePolicy.allowInventedCharacters, false);
  assert.equal(manifest.proof.playwrightPlayback, 'required');
  assert.equal(manifest.proof.continuityReview, 'required');
  assert.equal(manifest.proof.finalMasterApprovalAfterAllProof, true);
  assert.equal('requireApprovedShotCookies' in manifest.sourcePolicy, false);
  assert.equal('episodeCookieAfterAllProof' in manifest.proof, false);
});

test('master verifier accepts exact ffprobe metadata and cannot self-approve the final master', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bip-video-proof-'));
  const media = join(dir, 'master.mp4');
  const ffprobe = join(dir, 'ffprobe');
  const receipt = join(dir, 'receipt.json');
  await writeFile(media, 'synthetic-media-for-contract-test');
  await writeFile(ffprobe, `#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({streams:[{codec_type:'video',codec_name:'h264',width:1080,height:1920,avg_frame_rate:'30/1'}],format:{duration:'25.000'}}));\n`);
  await chmod(ffprobe, 0o755);

  const run = spawnSync(process.execPath, [
    'scripts/verify-video-master.mjs',
    '--manifest', 'production/video-use/episode-001.json',
    '--media', media,
    '--receipt', receipt,
    '--ffprobe', ffprobe,
  ], { encoding: 'utf8' });

  assert.equal(run.status, 0, run.stderr || run.stdout);
  const proof = JSON.parse(await read(receipt));
  assert.equal(proof.pass, true);
  assert.equal(proof.actual.codec, 'h264');
  assert.equal(proof.actual.width, 1080);
  assert.equal(proof.actual.height, 1920);
  assert.equal(proof.actual.fps, 30);
  assert.equal(proof.actual.durationSeconds, 25);
  assert.deepEqual(proof.requiredNextProof, ['playwright-playback', 'continuity-review']);
  assert.equal(proof.finalApprovalEligible, false);
  assert.equal('episodeCookieEligible' in proof, false);
});

test('Playwright verifier must perform real browser decode and time advancement', async () => {
  const source = await read('scripts/verify-video-playback.mjs');
  assert.match(source, /chromium\.launch/);
  assert.match(source, /readyState/);
  assert.match(source, /videoWidth/);
  assert.match(source, /videoHeight/);
  assert.match(source, /v\.play\(\)/);
  assert.match(source, /currentTime/);
  assert.match(source, /playbackAdvanced/);
  assert.match(source, /finalApprovalEligible: false/);
  assert.doesNotMatch(source, /episodeCookieEligible/);
});

test('short engine assigns video-use only to post-production and keeps approval in canon review', async () => {
  const engine = await read('sekret-bip-short-engine.md');
  assert.match(engine, /video-use/i);
  assert.match(engine, /post-production/i);
  assert.match(engine, /must not regenerate character identity/i);
  assert.match(engine, /Playwright playback proof/i);
  assert.match(engine, /shot approval evidence/i);
  assert.match(engine, /final continuity approval/i);
  assert.doesNotMatch(engine, /shot cookies?/i);
  assert.doesNotMatch(engine, /episode cookie/i);
});

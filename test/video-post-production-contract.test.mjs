import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const read = (path) => readFile(path, 'utf8');

test('Episode 001 video-use manifest keeps editing below canon authority and targets YouTube widescreen', async () => {
  const manifest = JSON.parse(await read('production/video-use/episode-001.json'));
  assert.equal(manifest.$schema, 'sekret-bip-video-master@v1');
  assert.equal(manifest.delivery.platform, 'youtube');
  assert.equal(manifest.delivery.audience, 'young-children');
  assert.equal(manifest.delivery.aspectRatio, '16:9');
  assert.deepEqual(manifest.delivery.toneArc, ['curious', 'magical', 'playful', 'exciting', 'reassuring']);
  assert.equal(manifest.editor.adapter, 'video-use');
  assert.equal(manifest.editor.role, 'post-production-only');
  assert.equal(manifest.master.dimensionPolicy, 'minimum');
  assert.equal(manifest.master.width, 1920);
  assert.equal(manifest.master.height, 1080);
  assert.equal(manifest.master.fps, 30);
  assert.equal(manifest.master.durationSeconds, 64);
  assert.deepEqual(manifest.sourcePolicy.requiredShots, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(manifest.sourcePolicy.requireApprovedShotEvidence, true);
  assert.equal(manifest.sourcePolicy.allowUnapprovedSource, false);
  assert.equal(manifest.sourcePolicy.allowIdentityRegeneration, false);
  assert.equal(manifest.sourcePolicy.allowInventedCharacters, false);
  assert.equal(manifest.sourcePolicy.allowWorldAuthorityAsCharacterAuthority, false);
  assert.equal(manifest.sourcePolicy.providerOutputCreatesAuthority, false);
  assert.ok(manifest.sourcePolicy.allowedVisualExecutionLanes.includes('google-gemini-with-exact-references'));
  assert.equal(manifest.proof.playwrightPlayback, 'required');
  assert.equal(manifest.proof.continuityReview, 'required');
  assert.equal(manifest.proof.toneReview, 'required');
  assert.equal(manifest.proof.audioClarityReview, 'required');
  assert.equal(manifest.proof.youtubeTargetIdentityReview, 'required-before-publish');
  assert.equal(manifest.proof.finalMasterApprovalAfterAllProof, true);
  assert.equal('requireApprovedShotCookies' in manifest.sourcePolicy, false);
  assert.equal('episodeCookieAfterAllProof' in manifest.proof, false);
});

test('master verifier accepts higher-than-minimum 16:9 delivery and cannot self-approve publishing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bip-video-proof-'));
  const media = join(dir, 'master.mp4');
  const ffprobe = join(dir, 'ffprobe');
  const receipt = join(dir, 'receipt.json');
  await writeFile(media, 'synthetic-media-for-contract-test');
  await writeFile(ffprobe, `#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({streams:[{codec_type:'video',codec_name:'h264',width:3840,height:2160,avg_frame_rate:'30/1'}],format:{duration:'64.000'}}));\n`);
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
  assert.equal(proof.actual.width, 3840);
  assert.equal(proof.actual.height, 2160);
  assert.equal(proof.actual.fps, 30);
  assert.equal(proof.actual.durationSeconds, 64);
  assert.ok(Math.abs(proof.actual.aspectRatio - (16 / 9)) < 0.001);
  assert.match(proof.sha256, /^[a-f0-9]{64}$/);
  assert.equal(proof.sourceApprovalVerified, false);
  assert.deepEqual(proof.requiredNextProof, [
    'playwright-playback',
    'continuity-review',
    'tone-review',
    'audio-clarity-review',
    'youtube-target-identity-review'
  ]);
  assert.equal(proof.finalApprovalEligible, false);
  assert.equal(proof.publishEligible, false);
});

test('master verifier rejects sub-1080p output even when aspect ratio is correct', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bip-video-proof-small-'));
  const media = join(dir, 'master.mp4');
  const ffprobe = join(dir, 'ffprobe');
  await writeFile(media, 'synthetic-media-for-contract-test');
  await writeFile(ffprobe, `#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({streams:[{codec_type:'video',codec_name:'h264',width:1280,height:720,avg_frame_rate:'30/1'}],format:{duration:'64.000'}}));\n`);
  await chmod(ffprobe, 0o755);

  const run = spawnSync(process.execPath, [
    'scripts/verify-video-master.mjs',
    '--manifest', 'production/video-use/episode-001.json',
    '--media', media,
    '--ffprobe', ffprobe,
  ], { encoding: 'utf8' });

  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /MASTER_CONTRACT_FAILED/);
  assert.match(run.stderr, /widthMinimum/);
  assert.match(run.stderr, /heightMinimum/);
});

test('Playwright verifier performs real browser decode and binds proof to the same media bytes', async () => {
  const source = await read('scripts/verify-video-playback.mjs');
  assert.match(source, /createHash/);
  assert.match(source, /sha256/);
  assert.match(source, /chromium\.launch/);
  assert.match(source, /readyState/);
  assert.match(source, /videoWidth/);
  assert.match(source, /videoHeight/);
  assert.match(source, /widthMinimum/);
  assert.match(source, /heightMinimum/);
  assert.match(source, /aspectRatio/);
  assert.match(source, /v\.play\(\)/);
  assert.match(source, /currentTime/);
  assert.match(source, /playbackAdvanced/);
  assert.match(source, /sourceApprovalVerified: false/);
  assert.match(source, /finalApprovalEligible: false/);
  assert.match(source, /publishEligible: false/);
  assert.match(source, /Content-Range/);
});

test('both verifiers enforce the full fail-closed release policy', async () => {
  for (const path of ['scripts/verify-video-master.mjs', 'scripts/verify-video-playback.mjs']) {
    const source = await read(path);
    assert.match(source, /YOUTUBE_DELIVERY_REQUIRED/);
    assert.match(source, /YOUNG_CHILD_AUDIENCE_REQUIRED/);
    assert.match(source, /WIDESCREEN_16_9_REQUIRED/);
    assert.match(source, /MINIMUM_DIMENSION_POLICY_REQUIRED/);
    assert.match(source, /APPROVED_SHOT_EVIDENCE_REQUIRED/);
    assert.match(source, /UNAPPROVED_SOURCE_MUST_BE_FORBIDDEN/);
    assert.match(source, /IDENTITY_REGENERATION_MUST_BE_FORBIDDEN/);
    assert.match(source, /INVENTED_CHARACTERS_MUST_BE_FORBIDDEN/);
    assert.match(source, /WORLD_AUTHORITY_AS_CHARACTER_AUTHORITY_MUST_BE_FORBIDDEN/);
    assert.match(source, /TONE_REVIEW_MUST_BE_REQUIRED/);
    assert.match(source, /AUDIO_CLARITY_REVIEW_MUST_BE_REQUIRED/);
    assert.match(source, /YOUTUBE_TARGET_IDENTITY_REVIEW_MUST_BE_REQUIRED/);
    assert.match(source, /FINAL_APPROVAL_MUST_REQUIRE_ALL_PROOF/);
  }
});

test('short engine assigns video-use only to post-production and keeps approval in canon review', async () => {
  const engine = await read('sekret-bip-short-engine.md');
  assert.match(engine, /video-use/i);
  assert.match(engine, /post-production/i);
  assert.match(engine, /must not regenerate character identity/i);
  assert.match(engine, /Playwright playback proof/i);
  assert.match(engine, /shot approval evidence/i);
  assert.match(engine, /final continuity approval/i);
  assert.match(engine, /1920 × 1080 minimum/);
  assert.match(engine, /16:9 widescreen/);
  assert.doesNotMatch(engine, /shot cookies?/i);
  assert.doesNotMatch(engine, /episode cookie/i);
});

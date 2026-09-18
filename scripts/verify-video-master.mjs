import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { spawnSync } from 'node:child_process';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function fail(message, details = {}) {
  const payload = { pass: false, error: message, ...details };
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

function parseRate(value) {
  if (!value) return NaN;
  if (!value.includes('/')) return Number(value);
  const [n, d] = value.split('/').map(Number);
  return d ? n / d : NaN;
}

function parseAspect(value) {
  const match = /^(\d+):(\d+)$/.exec(String(value ?? ''));
  if (!match) return NaN;
  return Number(match[1]) / Number(match[2]);
}

function assertManifestPolicy(manifest) {
  if (manifest.$schema !== 'sekret-bip-video-master@v1') fail('UNSUPPORTED_MANIFEST_SCHEMA');
  if (manifest.delivery?.platform !== 'youtube') fail('YOUTUBE_DELIVERY_REQUIRED');
  if (manifest.delivery?.audience !== 'young-children') fail('YOUNG_CHILD_AUDIENCE_REQUIRED');
  if (manifest.delivery?.aspectRatio !== '16:9') fail('WIDESCREEN_16_9_REQUIRED');
  if (manifest.editor?.role !== 'post-production-only') fail('EDITOR_AUTHORITY_TOO_BROAD');
  if (manifest.master?.dimensionPolicy !== 'minimum') fail('MINIMUM_DIMENSION_POLICY_REQUIRED');
  if (manifest.sourcePolicy?.requireApprovedShotEvidence !== true) fail('APPROVED_SHOT_EVIDENCE_REQUIRED');
  if (manifest.sourcePolicy?.allowUnapprovedSource !== false) fail('UNAPPROVED_SOURCE_MUST_BE_FORBIDDEN');
  if (manifest.sourcePolicy?.allowIdentityRegeneration !== false) fail('IDENTITY_REGENERATION_MUST_BE_FORBIDDEN');
  if (manifest.sourcePolicy?.allowInventedCharacters !== false) fail('INVENTED_CHARACTERS_MUST_BE_FORBIDDEN');
  if (manifest.sourcePolicy?.allowWorldAuthorityAsCharacterAuthority !== false) fail('WORLD_AUTHORITY_AS_CHARACTER_AUTHORITY_MUST_BE_FORBIDDEN');
  if (manifest.proof?.playwrightPlayback !== 'required') fail('PLAYWRIGHT_PROOF_MUST_BE_REQUIRED');
  if (manifest.proof?.continuityReview !== 'required') fail('CONTINUITY_REVIEW_MUST_BE_REQUIRED');
  if (manifest.proof?.toneReview !== 'required') fail('TONE_REVIEW_MUST_BE_REQUIRED');
  if (manifest.proof?.audioClarityReview !== 'required') fail('AUDIO_CLARITY_REVIEW_MUST_BE_REQUIRED');
  if (manifest.proof?.youtubeTargetIdentityReview !== 'required-before-publish') fail('YOUTUBE_TARGET_IDENTITY_REVIEW_MUST_BE_REQUIRED');
  if (manifest.proof?.finalMasterApprovalAfterAllProof !== true) fail('FINAL_APPROVAL_MUST_REQUIRE_ALL_PROOF');
}

const manifestPath = arg('--manifest');
const mediaPath = arg('--media');
const receiptPath = arg('--receipt');
const ffprobe = arg('--ffprobe', process.env.FFPROBE_BIN || 'ffprobe');

if (!manifestPath || !mediaPath) {
  fail('USAGE', { usage: 'node scripts/verify-video-master.mjs --manifest <json> --media <mp4> [--receipt <json>] [--ffprobe <binary>]' });
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
assertManifestPolicy(manifest);
if (extname(mediaPath).toLowerCase() !== '.mp4') fail('MASTER_MUST_BE_MP4');

const probe = spawnSync(ffprobe, [
  '-v', 'error',
  '-print_format', 'json',
  '-show_format',
  '-show_streams',
  mediaPath,
], { encoding: 'utf8' });

if (probe.status !== 0) fail('FFPROBE_FAILED', { stderr: probe.stderr?.trim() || null });

let metadata;
try {
  metadata = JSON.parse(probe.stdout);
} catch {
  fail('FFPROBE_INVALID_JSON');
}

const videoStreams = (metadata.streams || []).filter((s) => s.codec_type === 'video');
if (videoStreams.length !== 1) fail('MASTER_REQUIRES_ONE_VIDEO_STREAM', { count: videoStreams.length });

const video = videoStreams[0];
const expected = manifest.master;
const actualWidth = Number(video.width);
const actualHeight = Number(video.height);
const expectedAspect = parseAspect(manifest.delivery.aspectRatio);
const actualAspect = actualHeight ? actualWidth / actualHeight : NaN;
const actualFps = parseRate(video.avg_frame_rate || video.r_frame_rate);
const duration = Number(metadata.format?.duration ?? video.duration);
const checks = {
  codec: video.codec_name === expected.codec,
  widthMinimum: actualWidth >= expected.width,
  heightMinimum: actualHeight >= expected.height,
  aspectRatio: Number.isFinite(actualAspect) && Math.abs(actualAspect - expectedAspect) <= 0.001,
  fps: Number.isFinite(actualFps) && Math.abs(actualFps - expected.fps) <= 0.01,
  duration: Number.isFinite(duration) && Math.abs(duration - expected.durationSeconds) <= expected.durationToleranceSeconds,
};

if (Object.values(checks).some((v) => !v)) {
  fail('MASTER_CONTRACT_FAILED', {
    checks,
    actual: { codec: video.codec_name, width: actualWidth, height: actualHeight, aspectRatio: actualAspect, fps: actualFps, duration },
    expected,
  });
}

const bytes = await readFile(mediaPath);
const receipt = {
  schema: 'sekret-bip-video-master-proof@v1',
  pass: true,
  manifest: manifestPath,
  media: mediaPath,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  actual: {
    codec: video.codec_name,
    width: actualWidth,
    height: actualHeight,
    aspectRatio: actualAspect,
    fps: actualFps,
    durationSeconds: duration,
  },
  sourceApprovalVerified: false,
  requiredNextProof: [
    'playwright-playback',
    'continuity-review',
    'tone-review',
    'audio-clarity-review',
    'youtube-target-identity-review'
  ],
  finalApprovalEligible: false,
  publishEligible: false,
};

if (receiptPath) await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));

import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { chromium } from '@playwright/test';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function fail(message, details = {}) {
  console.error(JSON.stringify({ pass: false, error: message, ...details }, null, 2));
  process.exit(1);
}

function assertManifestPolicy(manifest) {
  if (manifest.$schema !== 'sekret-bip-video-master@v1') fail('UNSUPPORTED_MANIFEST_SCHEMA');
  if (manifest.editor?.role !== 'post-production-only') fail('EDITOR_AUTHORITY_TOO_BROAD');
  if (manifest.sourcePolicy?.requireApprovedShotEvidence !== true) fail('APPROVED_SHOT_EVIDENCE_REQUIRED');
  if (manifest.sourcePolicy?.allowUnapprovedSource !== false) fail('UNAPPROVED_SOURCE_MUST_BE_FORBIDDEN');
  if (manifest.sourcePolicy?.allowIdentityRegeneration !== false) fail('IDENTITY_REGENERATION_MUST_BE_FORBIDDEN');
  if (manifest.sourcePolicy?.allowInventedCharacters !== false) fail('INVENTED_CHARACTERS_MUST_BE_FORBIDDEN');
  if (manifest.sourcePolicy?.allowWorldAuthorityAsCharacterAuthority !== false) fail('WORLD_AUTHORITY_AS_CHARACTER_AUTHORITY_MUST_BE_FORBIDDEN');
  if (manifest.proof?.playwrightPlayback !== 'required') fail('PLAYWRIGHT_PROOF_MUST_BE_REQUIRED');
  if (manifest.proof?.continuityReview !== 'required') fail('CONTINUITY_REVIEW_MUST_BE_REQUIRED');
  if (manifest.proof?.finalMasterApprovalAfterAllProof !== true) fail('FINAL_APPROVAL_MUST_REQUIRE_ALL_PROOF');
}

const mediaPath = arg('--media');
const manifestPath = arg('--manifest');
const receiptPath = arg('--receipt');
if (!mediaPath || !manifestPath) {
  fail('USAGE', { usage: 'node scripts/verify-video-playback.mjs --manifest <json> --media <mp4> [--receipt <json>]' });
}
if (extname(mediaPath).toLowerCase() !== '.mp4') fail('MASTER_MUST_BE_MP4');

const [mediaBytes, manifestText] = await Promise.all([
  readFile(mediaPath),
  readFile(manifestPath, 'utf8'),
]);
const manifest = JSON.parse(manifestText);
assertManifestPolicy(manifest);
const expected = manifest.master;
const mediaSha256 = createHash('sha256').update(mediaBytes).digest('hex');

const server = createServer((req, res) => {
  if (req.url === '/master.mp4') {
    const range = req.headers.range;
    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (!match) {
        res.writeHead(416, { 'Content-Range': `bytes */${mediaBytes.length}` }).end();
        return;
      }
      const start = Number(match[1]);
      const requestedEnd = match[2] ? Number(match[2]) : mediaBytes.length - 1;
      const end = Math.min(requestedEnd, mediaBytes.length - 1);
      if (!Number.isInteger(start) || start < 0 || start >= mediaBytes.length || end < start) {
        res.writeHead(416, { 'Content-Range': `bytes */${mediaBytes.length}` }).end();
        return;
      }
      res.writeHead(206, {
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${mediaBytes.length}`,
        'Content-Length': end - start + 1,
      });
      res.end(mediaBytes.subarray(start, end + 1));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': mediaBytes.length, 'Accept-Ranges': 'bytes' });
    res.end(mediaBytes);
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><video id="master" src="/master.mp4" muted playsinline controls></video>');
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const url = `http://127.0.0.1:${address.port}/`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const v = document.querySelector('#master');
    return v && v.readyState >= 3 && Number.isFinite(v.duration) && v.duration > 0;
  }, null, { timeout: 15000 });

  const before = await page.locator('#master').evaluate((v) => ({
    readyState: v.readyState,
    currentTime: v.currentTime,
    duration: v.duration,
    width: v.videoWidth,
    height: v.videoHeight,
  }));
  await page.locator('#master').evaluate((v) => v.play());
  await page.waitForTimeout(900);
  const after = await page.locator('#master').evaluate((v) => ({
    readyState: v.readyState,
    currentTime: v.currentTime,
    paused: v.paused,
  }));

  const checks = {
    ready: before.readyState >= 3 && after.readyState >= 3,
    width: before.width === expected.width,
    height: before.height === expected.height,
    duration: Math.abs(before.duration - expected.durationSeconds) <= expected.durationToleranceSeconds,
    playbackAdvanced: after.currentTime > before.currentTime + 0.2,
  };
  if (Object.values(checks).some((v) => !v)) fail('PLAYBACK_CONTRACT_FAILED', { checks, before, after, expected });

  const receipt = {
    schema: 'sekret-bip-video-playback-proof@v1',
    pass: true,
    manifest: manifestPath,
    media: mediaPath,
    sha256: mediaSha256,
    url,
    before,
    after,
    checks,
    sourceApprovalVerified: false,
    requiredNextProof: ['continuity-review'],
    finalApprovalEligible: false,
  };
  if (receiptPath) await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

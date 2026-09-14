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
const expected = manifest.master;

const server = createServer((req, res) => {
  if (req.url === '/master.mp4') {
    const range = req.headers.range;
    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (!match) {
        res.writeHead(416).end();
        return;
      }
      const start = Number(match[1]);
      const requestedEnd = match[2] ? Number(match[2]) : mediaBytes.length - 1;
      const end = Math.min(requestedEnd, mediaBytes.length - 1);
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
    url,
    before,
    after,
    checks,
    requiredNextProof: ['continuity-review'],
    episodeCookieEligible: false,
  };
  if (receiptPath) await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

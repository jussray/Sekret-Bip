import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { BIP_VIDEO_RENDERER, probeBipVideoRenderer, renderBipVideoMaster } from '../scripts/render-video-master.mjs';

const manifest = {
  $schema: 'sekret-bip-video-master@v1',
  editor: { role: 'post-production-only' },
  sourcePolicy: {
    requiredShots: [1, 2],
    requireApprovedShotEvidence: true,
    allowUnapprovedSource: false,
    allowIdentityRegeneration: false,
    allowInventedCharacters: false,
    allowWorldAuthorityAsCharacterAuthority: false,
  },
  master: {
    container: 'mp4',
    codec: 'h264',
    width: 320,
    height: 180,
    fps: 24,
    durationSeconds: 2,
    durationToleranceSeconds: 0.25,
  },
  proof: {
    playwrightPlayback: 'required',
    continuityReview: 'required',
    finalMasterApprovalAfterAllProof: true,
  },
};

async function hashFile(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

function makeShot(path, color) {
  return spawnSync(process.env.FFMPEG_BIN || 'ffmpeg', [
    '-nostdin', '-y',
    '-f', 'lavfi', '-i', `color=c=${color}:s=320x180:r=24:d=1`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    path,
  ], { encoding: 'utf8' });
}

test('Bip renderer rejects unapproved source media', async () => {
  const result = await (async () => {
    try {
      await renderBipVideoMaster({ manifest, sources: [], outputPath: '/tmp/bip-invalid.mp4' });
      return null;
    } catch (error) {
      return error;
    }
  })();
  assert.ok(result);
  assert.match(result.message, /SOURCE_COUNT/);
});

test('Bip independently renders approved shots into a verified MP4', { timeout: 60000 }, async (t) => {
  if (!probeBipVideoRenderer().available) {
    t.skip('ffmpeg/ffprobe unavailable');
    return;
  }

  const dir = await mkdtemp(join(tmpdir(), 'bip-video-'));
  try {
    const shot1 = join(dir, 'shot-1.mp4');
    const shot2 = join(dir, 'shot-2.mp4');
    assert.equal(makeShot(shot1, '0x3b0764').status, 0);
    assert.equal(makeShot(shot2, '0x7c3aed').status, 0);

    const outputPath = join(dir, 'master.mp4');
    const receiptPath = join(dir, 'receipt.json');
    const rendered = await renderBipVideoMaster({
      manifest,
      sources: [
        { shot: 1, path: shot1, approved: true, sha256: await hashFile(shot1) },
        { shot: 2, path: shot2, approved: true, sha256: await hashFile(shot2) },
      ],
      outputPath,
      receiptPath,
    });

    assert.equal(rendered.kind, 'RENDERED');
    assert.equal(rendered.receipt.renderer, BIP_VIDEO_RENDERER);
    assert.equal(rendered.receipt.sourceApprovalVerified, true);
    assert.equal(rendered.receipt.identityRegenerationUsed, false);
    assert.equal(rendered.receipt.inventedCharactersUsed, false);
    assert.equal(rendered.receipt.master.width, 320);
    assert.equal(rendered.receipt.master.height, 180);
    assert.equal(rendered.receipt.master.codec, 'h264');
    assert.match(rendered.receipt.sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(rendered.receipt.requiredNextProof.slice(0, 2), ['verify-video-master', 'playwright-playback']);

    const diskReceipt = JSON.parse(await readFile(receiptPath, 'utf8'));
    assert.equal(diskReceipt.sha256, rendered.receipt.sha256);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

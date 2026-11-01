import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
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

function decodedFrame(path, seconds) {
  const result = spawnSync(process.env.FFMPEG_BIN || 'ffmpeg', [
    '-v', 'error', '-ss', String(seconds), '-i', path, '-frames:v', '1',
    '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
  ]);
  assert.equal(result.status, 0);
  return [...result.stdout];
}

function decodedAudio(path, start, duration) {
  const result = spawnSync(process.env.FFMPEG_BIN || 'ffmpeg', [
    '-v', 'error', '-ss', String(start), '-i', path, '-t', String(duration),
    '-vn', '-ac', '1', '-ar', '48000', '-f', 's16le', 'pipe:1',
  ]);
  assert.equal(result.status, 0);
  assert.ok(result.stdout.length > 1000, 'actual decoded audio must exist');
  let energy = 0, crossings = 0, previous = 0;
  for (let i = 0; i < result.stdout.length; i += 2) {
    const sample = result.stdout.readInt16LE(i);
    energy += sample * sample;
    if (previous <= 0 && sample > 0) crossings++;
    previous = sample;
  }
  return { rms: Math.sqrt(energy / (result.stdout.length / 2)), frequency: crossings / duration };
}

function makeAudibleShot(path, color, frequency) {
  return spawnSync(process.env.FFMPEG_BIN || 'ffmpeg', [
    '-nostdin', '-y', '-f', 'lavfi', '-i', `color=c=${color}:s=320x180:r=24:d=2`,
    '-f', 'lavfi', '-i', `sine=frequency=${frequency}:sample_rate=48000:duration=2`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', path,
  ], { encoding: 'utf8' });
}

const timedManifest = {
  ...manifest,
  timeline: [
    { shot: 2, durationSeconds: 0.75, sourceStartSeconds: 0.25 },
    { shot: 1, durationSeconds: 1.25 },
  ],
};

test('explicit storyboard preserves unequal cut times, reordered pictures and source sound', { timeout: 60000 }, async (t) => {
  if (!probeBipVideoRenderer().available) return t.skip('ffmpeg/ffprobe unavailable');
  const dir = await mkdtemp(join(tmpdir(), 'bip-storyboard-'));
  try {
    const red = join(dir, 'red.mp4'), blue = join(dir, 'blue.mp4'), out = join(dir, 'out.mp4');
    assert.equal(makeAudibleShot(red, 'red', 440).status, 0);
    assert.equal(makeAudibleShot(blue, 'blue', 880).status, 0);
    const sources = [
      { shot: 1, path: red, approved: true, sha256: await hashFile(red) },
      { shot: 2, path: blue, approved: true, sha256: await hashFile(blue) },
    ];
    const result = await renderBipVideoMaster({ manifest: timedManifest, sources, outputPath: out });
    assert.equal(result.kind, 'RENDERED');
    const before = decodedFrame(out, 0.6), after = decodedFrame(out, 0.9);
    assert.ok(before[2] > 200 && before[0] < 30, 'blue shot must lead until the 0.75 second cut');
    assert.ok(after[0] > 200 && after[2] < 30, 'red shot must start at the storyboard cut, not source duration');
    const first = decodedAudio(out, 0.15, 0.4), second = decodedAudio(out, 1.0, 0.5);
    assert.ok(first.rms > 100 && second.rms > 100, 'approved source audio must not be replaced by silence');
    assert.ok(Math.abs(first.frequency - 880) < 15, 'first sound follows reordered blue source');
    assert.ok(Math.abs(second.frequency - 440) < 15, 'second sound follows red source');
    assert.deepEqual(result.receipt.timeline, timedManifest.timeline.map((shot) => ({ sourceStartSeconds: 0, ...shot })));
    assert.equal(result.receipt.finalApprovalEligible, false);
    assert.match(result.receipt.audioMode, /approved-source-audio/);
    assert.ok(Math.abs(result.receipt.master.durationSeconds - 2) < 0.1);
    const shortAudio = join(dir, 'short.wav');
    assert.equal(spawnSync(process.env.FFMPEG_BIN || 'ffmpeg', [
      '-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=1200:duration=0.5', shortAudio,
    ]).status, 0);
    await assert.rejects(renderBipVideoMaster({ manifest: timedManifest, sources,
      audioPath: shortAudio, outputPath: join(dir, 'short-audio.mp4') }), /EXTERNAL_AUDIO_TOO_SHORT_FOR_TIMELINE/);
    await assert.rejects(renderBipVideoMaster({
      manifest: { ...manifest, master: { ...manifest.master, durationSeconds: 4 }, timeline: [{ shot: 1, durationSeconds: 3 }, { shot: 2, durationSeconds: 1 }] },
      sources, outputPath: join(dir, 'short.mp4'),
    }), /SHOT_1_TOO_SHORT_FOR_TIMELINE/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('explicit storyboard inserts silence only for sources without audio', { timeout: 60000 }, async (t) => {
  if (!probeBipVideoRenderer().available) return t.skip('ffmpeg/ffprobe unavailable');
  const dir = await mkdtemp(join(tmpdir(), 'bip-mixed-audio-'));
  try {
    const audible = join(dir, 'audible.mp4'), silent = join(dir, 'silent.mp4'), out = join(dir, 'out.mp4');
    assert.equal(makeAudibleShot(audible, 'red', 440).status, 0);
    assert.equal(makeShot(silent, 'blue').status, 0);
    const result = await renderBipVideoMaster({
      manifest: { ...manifest, timeline: [{ shot: 1, durationSeconds: 1 }, { shot: 2, durationSeconds: 1 }] },
      sources: [
        { shot: 1, path: audible, approved: true, sha256: await hashFile(audible) },
        { shot: 2, path: silent, approved: true, sha256: await hashFile(silent) },
      ], outputPath: out,
    });
    assert.equal(result.kind, 'RENDERED');
    assert.ok(decodedAudio(out, 0.2, 0.5).rms > 100);
    assert.ok(decodedAudio(out, 1.2, 0.5).rms < 2, 'missing audio must not replay previous dialogue');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('explicit storyboard rejects missing/duplicate shots, invalid times and total mismatch before rendering', async () => {
  for (const [timeline, expected] of [
    [[], /TIMELINE_SHOTS_INVALID/],
    [[{ shot: 1, durationSeconds: 1 }, { shot: 1, durationSeconds: 1 }], /TIMELINE_SHOTS_INVALID/],
    [[{ shot: 1, durationSeconds: -1 }, { shot: 2, durationSeconds: 3 }], /TIMELINE_TIME_INVALID/],
    [[{ shot: 1, durationSeconds: 0.7 }, { shot: 2, durationSeconds: 1.3 }], /TIMELINE_MUST_ALIGN_TO_FRAMES/],
    [[{ shot: 1, durationSeconds: 1 }, { shot: 2, durationSeconds: 2 }], /TIMELINE_MASTER_DURATION_MISMATCH/],
  ]) {
    await assert.rejects(renderBipVideoMaster({ manifest: { ...manifest, timeline }, sources: [], outputPath: '/tmp/bip-invalid-timing.mp4' }), expected);
  }
});

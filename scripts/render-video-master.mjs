import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join } from 'node:path';

export const BIP_VIDEO_RENDERER = 'sekret-bip/approved-media-ffmpeg-master@v1';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function sha256File(path) {
  return sha256(await readFile(path));
}

function fail(message, code = 'BIP_VIDEO_RENDER_REJECTED') {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function parseRate(value) {
  if (!value) return NaN;
  if (!String(value).includes('/')) return Number(value);
  const [numerator, denominator] = String(value).split('/').map(Number);
  return denominator ? numerator / denominator : NaN;
}

function assertManifestPolicy(manifest) {
  if (manifest?.$schema !== 'sekret-bip-video-master@v1') fail('UNSUPPORTED_MANIFEST_SCHEMA');
  if (manifest?.editor?.role !== 'post-production-only') fail('EDITOR_AUTHORITY_TOO_BROAD');
  if (manifest?.sourcePolicy?.requireApprovedShotEvidence !== true) fail('APPROVED_SHOT_EVIDENCE_REQUIRED');
  if (manifest?.sourcePolicy?.allowUnapprovedSource !== false) fail('UNAPPROVED_SOURCE_MUST_BE_FORBIDDEN');
  if (manifest?.sourcePolicy?.allowIdentityRegeneration !== false) fail('IDENTITY_REGENERATION_MUST_BE_FORBIDDEN');
  if (manifest?.sourcePolicy?.allowInventedCharacters !== false) fail('INVENTED_CHARACTERS_MUST_BE_FORBIDDEN');
  if (manifest?.sourcePolicy?.allowWorldAuthorityAsCharacterAuthority !== false) fail('WORLD_AUTHORITY_AS_CHARACTER_AUTHORITY_MUST_BE_FORBIDDEN');
  if (!Array.isArray(manifest?.sourcePolicy?.requiredShots) || manifest.sourcePolicy.requiredShots.length < 1) fail('REQUIRED_SHOTS_MISSING');
  const master = manifest?.master || {};
  if (master.container !== 'mp4' || master.codec !== 'h264') fail('MASTER_FORMAT_UNSUPPORTED');
  if (!Number.isInteger(master.width) || !Number.isInteger(master.height) || master.width < 160 || master.height < 160) fail('MASTER_DIMENSIONS_INVALID');
  if (master.width % 2 || master.height % 2) fail('MASTER_DIMENSIONS_MUST_BE_EVEN');
  if (!Number.isFinite(Number(master.fps)) || Number(master.fps) < 12 || Number(master.fps) > 60) fail('MASTER_FPS_INVALID');
  if (!Number.isFinite(Number(master.durationSeconds)) || Number(master.durationSeconds) <= 0 || Number(master.durationSeconds) > 600) fail('MASTER_DURATION_INVALID');
}

function assertSourceDescriptor(source, shot) {
  if (Number(source?.shot) !== Number(shot)) fail(`SHOT_${shot}_DESCRIPTOR_MISMATCH`);
  if (source?.approved !== true) fail(`SHOT_${shot}_NOT_APPROVED`);
  if (!isAbsolute(String(source?.path || '')) || !existsSync(String(source?.path || ''))) fail(`SHOT_${shot}_MEDIA_MISSING`);
  if (!/^[0-9a-f]{64}$/i.test(String(source?.sha256 || ''))) fail(`SHOT_${shot}_SHA256_REQUIRED`);
}

export function probeBipVideoRenderer() {
  const ffmpeg = spawnSync(process.env.FFMPEG_BIN || 'ffmpeg', ['-version'], { encoding: 'utf8' });
  const ffprobe = spawnSync(process.env.FFPROBE_BIN || 'ffprobe', ['-version'], { encoding: 'utf8' });
  return {
    available: ffmpeg.status === 0 && ffprobe.status === 0,
    ffmpegVersion: ffmpeg.status === 0 ? /ffmpeg version (\S+)/.exec(ffmpeg.stdout || '')?.[1] || 'unknown' : null,
    ffprobeVersion: ffprobe.status === 0 ? /ffprobe version (\S+)/.exec(ffprobe.stdout || '')?.[1] || 'unknown' : null,
  };
}

function probeMedia(path) {
  const result = spawnSync(process.env.FFPROBE_BIN || 'ffprobe', [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path,
  ], { encoding: 'utf8' });
  if (result.status !== 0) fail(`SOURCE_PROBE_FAILED:${path}`, 'BIP_VIDEO_SOURCE_INVALID');
  const parsed = JSON.parse(result.stdout || '{}');
  const video = (parsed.streams || []).find((stream) => stream.codec_type === 'video');
  if (!video) fail(`SOURCE_VIDEO_STREAM_MISSING:${path}`, 'BIP_VIDEO_SOURCE_INVALID');
  return {
    width: Number(video.width || 0),
    height: Number(video.height || 0),
    durationSeconds: Number(parsed.format?.duration || video.duration || 0),
    fps: parseRate(video.avg_frame_rate || video.r_frame_rate),
    codec: video.codec_name || null,
  };
}

export async function renderBipVideoMaster({ manifest, sources, outputPath, receiptPath = null, audioPath = null }) {
  assertManifestPolicy(manifest);
  if (!Array.isArray(sources)) fail('SOURCES_MUST_BE_AN_ARRAY');
  if (!isAbsolute(String(outputPath || '')) || extname(String(outputPath)).toLowerCase() !== '.mp4') fail('OUTPUT_PATH_MUST_BE_ABSOLUTE_MP4');
  if (audioPath && (!isAbsolute(String(audioPath)) || !existsSync(String(audioPath)))) fail('AUDIO_PATH_INVALID');

  const capability = probeBipVideoRenderer();
  if (!capability.available) {
    return { kind: 'CAPABILITY_UNAVAILABLE', reason: 'ffmpeg and ffprobe binaries are required on PATH' };
  }

  const requiredShots = manifest.sourcePolicy.requiredShots.map(Number);
  if (sources.length !== requiredShots.length) fail('SOURCE_COUNT_MUST_MATCH_REQUIRED_SHOTS');
  const sourceByShot = new Map(sources.map((source) => [Number(source?.shot), source]));
  if (sourceByShot.size !== requiredShots.length || [...sourceByShot.keys()].some((shot) => !requiredShots.includes(shot))) {
    fail('SOURCE_SET_MUST_MATCH_REQUIRED_SHOTS');
  }

  const verifiedSources = [];
  for (const shot of requiredShots) {
    const source = sourceByShot.get(shot);
    assertSourceDescriptor(source, shot);
    const actualSha256 = await sha256File(source.path);
    if (actualSha256 !== String(source.sha256).toLowerCase()) fail(`SHOT_${shot}_HASH_MISMATCH`, 'BIP_VIDEO_SOURCE_STALE');
    const probe = probeMedia(source.path);
    verifiedSources.push({ shot, path: source.path, sha256: actualSha256, probe });
  }

  const workDir = await mkdtemp(join(tmpdir(), 'sekret-bip-video-'));
  try {
    const localSources = [];
    for (const source of verifiedSources) {
      const extension = extname(source.path).toLowerCase() || '.mp4';
      const localPath = join(workDir, `shot-${String(source.shot).padStart(3, '0')}${extension}`);
      await copyFile(source.path, localPath);
      localSources.push(localPath);
    }
    const concatPath = join(workDir, 'concat.txt');
    await writeFile(concatPath, `${localSources.map((path) => `file '${basename(path)}'`).join('\n')}\n`, 'utf8');

    await mkdir(dirname(outputPath), { recursive: true });
    const master = manifest.master;
    const duration = Number(master.durationSeconds);
    const videoFilter = [
      `scale=${master.width}:${master.height}:force_original_aspect_ratio=increase`,
      `crop=${master.width}:${master.height}`,
      `fps=${master.fps}`,
      `tpad=stop_mode=clone:stop_duration=${duration}`,
      `trim=duration=${duration}`,
      'setpts=PTS-STARTPTS',
      'format=yuv420p',
    ].join(',');

    const args = ['-nostdin', '-y', '-f', 'concat', '-safe', '1', '-i', concatPath];
    if (audioPath) args.push('-stream_loop', '-1', '-i', audioPath);
    else args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');
    args.push(
      '-t', String(duration),
      '-map', '0:v:0', '-map', '1:a:0',
      '-vf', videoFilter,
      '-r', String(master.fps), '-fps_mode', 'cfr',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
      '-movflags', '+faststart',
      outputPath,
    );

    const rendered = spawnSync(process.env.FFMPEG_BIN || 'ffmpeg', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    if (rendered.status !== 0 || !existsSync(outputPath)) fail('FFMPEG_RENDER_FAILED', 'BIP_VIDEO_RENDER_FAILED');

    const outputProbe = probeMedia(outputPath);
    if (outputProbe.width !== Number(master.width) || outputProbe.height !== Number(master.height)) fail('OUTPUT_DIMENSION_MISMATCH', 'BIP_VIDEO_VERIFY_FAILED');
    if (!Number.isFinite(outputProbe.fps) || Math.abs(outputProbe.fps - Number(master.fps)) > 0.01) fail('OUTPUT_FPS_MISMATCH', 'BIP_VIDEO_VERIFY_FAILED');
    if (outputProbe.codec !== master.codec) fail('OUTPUT_CODEC_MISMATCH', 'BIP_VIDEO_VERIFY_FAILED');
    if (Math.abs(outputProbe.durationSeconds - duration) > Number(master.durationToleranceSeconds ?? 0.5)) fail('OUTPUT_DURATION_MISMATCH', 'BIP_VIDEO_VERIFY_FAILED');

    const receipt = {
      schema: 'sekret-bip-video-render-proof@v1',
      renderer: BIP_VIDEO_RENDERER,
      pass: true,
      outputPath,
      sha256: await sha256File(outputPath),
      bytes: (await stat(outputPath)).size,
      master: {
        width: outputProbe.width,
        height: outputProbe.height,
        fps: outputProbe.fps,
        durationSeconds: outputProbe.durationSeconds,
        codec: outputProbe.codec,
      },
      sourceApprovalVerified: true,
      sourceShots: verifiedSources.map(({ shot, sha256: sourceSha256 }) => ({ shot, sha256: sourceSha256 })),
      identityRegenerationUsed: false,
      inventedCharactersUsed: false,
      audioMode: audioPath ? 'approved-external-audio' : 'silent-fallback',
      ffmpegVersion: capability.ffmpegVersion,
      ffprobeVersion: capability.ffprobeVersion,
      finalApprovalEligible: false,
      requiredNextProof: ['verify-video-master', 'playwright-playback', 'continuity-review', 'tone-review', 'audio-clarity-review'],
    };
    if (receiptPath) {
      await mkdir(dirname(receiptPath), { recursive: true });
      await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    }
    return { kind: 'RENDERED', receipt };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const manifestPath = arg('--manifest');
    const sourcesPath = arg('--sources');
    const outputPath = arg('--output');
    const receiptPath = arg('--receipt');
    const audioPath = arg('--audio');
    if (!manifestPath || !sourcesPath || !outputPath) {
      fail('USAGE: node scripts/render-video-master.mjs --manifest <json> --sources <json> --output <mp4> [--audio <audio>] [--receipt <json>]');
    }
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const payload = JSON.parse(await readFile(sourcesPath, 'utf8'));
    const result = await renderBipVideoMaster({ manifest, sources: payload.shots || payload, outputPath, receiptPath, audioPath });
    console.log(JSON.stringify(result, null, 2));
    if (result.kind !== 'RENDERED') process.exitCode = 2;
  } catch (error) {
    console.error(JSON.stringify({ kind: 'FAILED', code: error?.code || 'BIP_VIDEO_RENDER_FAILED', error: error?.message || String(error) }, null, 2));
    process.exitCode = 1;
  }
}

/**
 * ttsService.ts
 *
 * Bridges the Se'kret Bip Piper TTS server to in-app audio playback.
 *
 * Flow:
 *   avatarKey + text
 *     → POST /synthesize  (Piper TTS server)
 *     → WAV blob saved to device cache (expo-file-system)
 *     → playOnce(uri)  (audioPlayback)
 *     → auto-cleanup after playback
 *
 * Voice model mapping:
 *   Each character maps to a Piper ONNX voice model file that must be
 *   present in the server's PIPER_VOICE_DIR (/voices). The model stem
 *   (filename without .onnx) is sent as the `voice` field.
 *
 *   Character → Piper model stem → tone
 *   ─────────────────────────────────────────────────────────────────
 *   raylene   → en_US-amy-medium      warm, expressive female
 *   rylane    → en_US-ryan-medium     direct male
 *   cloud     → en_US-amy-low         softer, quieter female
 *   night     → en_US-lessac-low      quietest; slow, unhurried
 *   sekret    → en_US-amy-medium      fallback to raylene voice
 *
 *   ⚠️  These are the recommended community Piper models for each
 *   character's tone. If you want a different voice, change the
 *   value here AND make sure the matching .onnx + .onnx.json files
 *   are present in the Docker container's /voices directory.
 *   Check installed models: GET /health on the Piper server.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { playOnce } from './audio/audioPlayback';
import type { VoiceBipAvatarKey } from '../constants/voiceBip';

// ── Config ────────────────────────────────────────────────────────────────
// Set EXPO_PUBLIC_PIPER_TTS_URL in your .env (e.g. http://localhost:8080
// for local dev, or your hosted container URL for production).
// Set EXPO_PUBLIC_PIPER_API_TOKEN to match PIPER_API_TOKEN on the server.
// Leave PIPER_API_TOKEN empty on the server (and token blank here) to
// skip auth during local development.

const PIPER_URL = (process.env.EXPO_PUBLIC_PIPER_TTS_URL ?? '').replace(/\/$/, '');
const PIPER_TOKEN = process.env.EXPO_PUBLIC_PIPER_API_TOKEN ?? '';

// ── Voice model map ───────────────────────────────────────────────────────
// Maps each avatar key to the Piper model stem (no .onnx extension).
// ⚠️  If you swap a model, update this map and redeploy the container.

type AvatarVoiceModelKey = VoiceBipAvatarKey | 'sekret';

const PIPER_VOICE_MODEL: Record<AvatarVoiceModelKey, string> = {
  raylene: 'en_US-amy-medium',
  rylane:  'en_US-ryan-medium',
  cloud:   'en_US-amy-low',
  night:   'en_US-lessac-low',
  sekret:  'en_US-amy-medium', // shared with raylene until Sekret gets its own voice
};

// ── Cache directory ───────────────────────────────────────────────────────
// TTS responses are written here, played once, then deleted.
// Separate from bip_recordings/ so cleanup never touches user voice bips.

const TTS_CACHE_DIR = `${FileSystem.cacheDirectory ?? ''}bip_tts_cache/`;

async function ensureTtsCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(TTS_CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(TTS_CACHE_DIR, { intermediates: true });
  }
}

async function deleteCacheFile(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

// ── Error type ────────────────────────────────────────────────────────────

export class TtsServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'TtsServiceError';
  }
}

// ── Core synthesis + playback ─────────────────────────────────────────────

/**
 * Synthesises `text` using the Piper voice for `avatarKey`, downloads the
 * resulting WAV to a temp cache file, plays it once, then cleans up.
 *
 * @throws {TtsServiceError} if the server is unreachable, returns an error
 *   status, or synthesis times out.
 */
export async function speakAsAvatar(
  text: string,
  avatarKey: AvatarVoiceModelKey,
): Promise<void> {
  if (!PIPER_URL) {
    // TTS not configured — fail silently so the app still works in
    // environments where the Piper server isn't running.
    console.warn('[ttsService] EXPO_PUBLIC_PIPER_TTS_URL is not set. Skipping TTS.');
    return;
  }

  const voice = PIPER_VOICE_MODEL[avatarKey];
  const endpoint = `${PIPER_URL}/synthesize`;
  const cacheFilename = `tts_${avatarKey}_${Date.now()}.wav`;

  await ensureTtsCacheDir();
  const destUri = `${TTS_CACHE_DIR}${cacheFilename}`;

  // ── Step 1: POST to Piper /synthesize ───────────────────────────────────
  // Using fetch() + writeAsStringAsync(base64) instead of downloadAsync
  // because downloadAsync's DownloadOptions type does not support POST bodies.

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (PIPER_TOKEN) {
    headers['Authorization'] = `Bearer ${PIPER_TOKEN}`;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, voice, format: 'wav' }),
    });
  } catch (err) {
    throw new TtsServiceError(
      `[ttsService] Network error reaching Piper server at ${endpoint}: ${String(err)}`,
    );
  }

  if (!response.ok) {
    const statusCode = response.status;
    let detail = `HTTP ${statusCode}`;
    if (statusCode === 404) detail += ` (voice '${voice}' not installed on server)`;
    if (statusCode === 500) detail += ' (synthesis failed on server)';
    if (statusCode === 504) detail += ' (synthesis timed out)';
    throw new TtsServiceError(`[ttsService] Piper server returned ${detail}.`, statusCode);
  }

  // ── Step 2: Write WAV blob to device cache ───────────────────────────────
  // expo-file-system writeAsStringAsync with Base64 encoding is the correct
  // way to persist binary HTTP responses to disk in React Native / Expo Go.

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  await FileSystem.writeAsStringAsync(destUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // ── Step 3: Play the WAV ────────────────────────────────────────────────
  try {
    await playOnce(destUri);
  } finally {
    // Always clean up the cache file — even if playback throws.
    // We don't await this so playback teardown isn't blocked.
    deleteCacheFile(destUri).catch(() => {});
  }
}

// ── Health check ──────────────────────────────────────────────────────────

export interface PiperHealthResult {
  ok: boolean;
  voices: string[];
  error?: string;
}

/**
 * Calls GET /health on the Piper server.
 * Returns the list of installed voice model stems and whether the server
 * is reachable. Use this for diagnostics and to verify voice models are
 * installed before enabling TTS in production.
 */
export async function checkPiperHealth(): Promise<PiperHealthResult> {
  if (!PIPER_URL) {
    return { ok: false, voices: [], error: 'EXPO_PUBLIC_PIPER_TTS_URL is not set' };
  }
  try {
    const res = await fetch(`${PIPER_URL}/health`);
    if (!res.ok) {
      return { ok: false, voices: [], error: `HTTP ${res.status}` };
    }
    const data = await res.json() as { ok: boolean; voices: string[] };
    return { ok: data.ok, voices: data.voices };
  } catch (err) {
    return { ok: false, voices: [], error: String(err) };
  }
}

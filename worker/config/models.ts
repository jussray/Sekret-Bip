/**
 * worker/config/models.ts
 *
 * Single source of truth for OpenAI model identifiers.
 * Values come from Worker environment vars (set in wrangler.toml [vars]).
 * Falls back to safe defaults so the worker boots even without explicit config.
 *
 * To rotate a model without a code change:
 *   1. Update wrangler.toml [vars]  (non-secret, safe to commit)
 *   2. wrangler deploy --name sekret-bip
 *
 * Or for a one-off override:
 *   wrangler deploy --var OPENAI_CHAT_MODEL:gpt-4.1 --name sekret-bip
 */

export interface WorkerEnv {
  // Cloudflare Worker secret — injected by `wrangler secret put`, never in source
  OPENAI_API_KEY: string;

  // Non-secret vars — set in wrangler.toml [vars], safe to commit
  OPENAI_CHAT_MODEL?: string;
  OPENAI_TTS_MODEL?: string;
  OPENAI_STT_MODEL?: string;
  AUDIO_MAX_BYTES?: string;
}

export function getModels(env: WorkerEnv) {
  return {
    chat: env.OPENAI_CHAT_MODEL ?? 'gpt-4o',
    tts:  env.OPENAI_TTS_MODEL  ?? 'gpt-4o-mini-tts',
    stt:  env.OPENAI_STT_MODEL  ?? 'whisper-1',
  } as const;
}

/**
 * Returns the audio size cap in bytes.
 * Default: 512 KB ≈ ~30s of compressed Expo AudioRecording output.
 */
export function getAudioMaxBytes(env: WorkerEnv): number {
  const raw = env.AUDIO_MAX_BYTES;
  if (raw) {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 524_288; // 512 KB
}

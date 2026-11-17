export interface PiperTtsEnv {
  PIPER_TTS_URL?: string;
  PIPER_TTS_TOKEN?: string;
  PIPER_SUHANA_VOICE?: string;
  PIPER_SY_VOICE?: string;
  PIPER_CLOUD_VOICE?: string;
  PIPER_NIGHT_VOICE?: string;
  PIPER_SEKRET_VOICE?: string;
  PIPER_PARENT_COACH_VOICE?: string;
}

export type PiperCharacterId = 'suhana' | 'sy' | 'cloud' | 'night' | 'sekret' | 'parentCoach';

const PIPER_REQUEST_TIMEOUT_MS = 30_000;

/**
 * These defaults must match the model stems baked into services/piper-tts/Dockerfile.
 * Environment overrides remain available so the provider can be swapped without
 * changing the mobile client or the canonical Worker contract.
 */
const DEFAULT_PIPER_VOICES: Record<PiperCharacterId, string> = {
  suhana: 'en_US-amy-medium',
  sy: 'en_US-ryan-medium',
  cloud: 'en_US-amy-low',
  night: 'en_US-lessac-low',
  sekret: 'en_US-amy-medium',
  parentCoach: 'en_US-amy-medium',
};

function getPiperVoice(characterId: PiperCharacterId, env: PiperTtsEnv): string {
  const configured = characterId === 'suhana' ? env.PIPER_SUHANA_VOICE
    : characterId === 'sy' ? env.PIPER_SY_VOICE
      : characterId === 'cloud' ? env.PIPER_CLOUD_VOICE
        : characterId === 'night' ? env.PIPER_NIGHT_VOICE
          : characterId === 'parentCoach' ? env.PIPER_PARENT_COACH_VOICE
            : env.PIPER_SEKRET_VOICE;
  return configured?.trim() || DEFAULT_PIPER_VOICES[characterId];
}

export async function synthesizeWithPiper(input: { text: string; characterId: PiperCharacterId; env: PiperTtsEnv; }) {
  const baseUrl = input.env.PIPER_TTS_URL?.trim().replace(/\/$/, '');
  if (!baseUrl) return null;
  const voice = getPiperVoice(input.characterId, input.env);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (input.env.PIPER_TTS_TOKEN?.trim()) headers.Authorization = `Bearer ${input.env.PIPER_TTS_TOKEN.trim()}`;
  const response = await fetch(`${baseUrl}/synthesize`, {
    method: 'POST', headers,
    body: JSON.stringify({ text: input.text.slice(0, 4000), voice, format: 'wav' }),
    signal: AbortSignal.timeout(PIPER_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Piper TTS ${response.status}`);
  return { bytes: new Uint8Array(await response.arrayBuffer()), contentType: response.headers.get('content-type') || 'audio/wav', voice };
}

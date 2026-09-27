import type { CanonCharacterId, VoiceProvider, VoiceRoutingDecision } from './voice-routing';

export interface WorkersAiBinding {
  run(
    model: string,
    input: Record<string, unknown>,
    options?: { returnRawResponse?: boolean },
  ): Promise<Response | ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array>;
}

export interface VoiceProviderEnv {
  AI?: WorkersAiBinding;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_SUHANA_VOICE_ID?: string;
  ELEVENLABS_SY_VOICE_ID?: string;
  ELEVENLABS_CLOUD_VOICE_ID?: string;
  ELEVENLABS_NIGHT_VOICE_ID?: string;
  ELEVENLABS_SEKRET_VOICE_ID?: string;
  ELEVENLABS_PARENT_COACH_VOICE_ID?: string;
}

export interface CharacterAlignment {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
}

export interface VoiceSynthesisResult {
  audioBase64: string;
  contentType: string;
  provider: VoiceProvider;
  model: string;
  voiceId?: string;
  timing?: CharacterAlignment;
}

const CLOUDFLARE_MODELS: Record<'cloudflare-aura-1' | 'cloudflare-aura-2', string> = {
  'cloudflare-aura-1': '@cf/deepgram/aura-1',
  'cloudflare-aura-2': '@cf/deepgram/aura-2-en',
};

const AURA_1_SPEAKERS: Record<CanonCharacterId, string> = {
  suhana: 'asteria',
  sy: 'orion',
  cloud: 'luna',
  night: 'orpheus',
  sekret: 'athena',
  parentCoach: 'hera',
};

const AURA_2_SPEAKERS: Record<CanonCharacterId, string> = {
  suhana: 'asteria',
  sy: 'orion',
  cloud: 'luna',
  night: 'orpheus',
  sekret: 'athena',
  parentCoach: 'hera',
};

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function responseBytes(value: Response | ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array): Promise<{ bytes: Uint8Array; contentType?: string }> {
  if (value instanceof Response) {
    return {
      bytes: new Uint8Array(await value.arrayBuffer()),
      contentType: value.headers.get('content-type') ?? undefined,
    };
  }
  if (value instanceof Uint8Array) return { bytes: value };
  if (value instanceof ArrayBuffer) return { bytes: new Uint8Array(value) };
  return { bytes: new Uint8Array(await new Response(value).arrayBuffer()) };
}

function elevenLabsVoiceId(characterId: CanonCharacterId, env: VoiceProviderEnv): string | undefined {
  if (characterId === 'suhana') return env.ELEVENLABS_SUHANA_VOICE_ID?.trim();
  if (characterId === 'sy') return env.ELEVENLABS_SY_VOICE_ID?.trim();
  if (characterId === 'cloud') return env.ELEVENLABS_CLOUD_VOICE_ID?.trim();
  if (characterId === 'night') return env.ELEVENLABS_NIGHT_VOICE_ID?.trim();
  if (characterId === 'parentCoach') return env.ELEVENLABS_PARENT_COACH_VOICE_ID?.trim();
  return env.ELEVENLABS_SEKRET_VOICE_ID?.trim();
}

async function synthesizeCloudflare(
  provider: 'cloudflare-aura-1' | 'cloudflare-aura-2',
  text: string,
  characterId: CanonCharacterId,
  env: VoiceProviderEnv,
): Promise<VoiceSynthesisResult> {
  if (!env.AI) throw new Error('workers_ai_unavailable');
  const model = CLOUDFLARE_MODELS[provider];
  const speaker = provider === 'cloudflare-aura-1'
    ? AURA_1_SPEAKERS[characterId]
    : AURA_2_SPEAKERS[characterId];
  const raw = await env.AI.run(model, {
    text: text.slice(0, 4000),
    speaker,
    encoding: 'mp3',
  }, { returnRawResponse: true });
  const { bytes, contentType } = await responseBytes(raw);
  if (bytes.byteLength === 0) throw new Error('workers_ai_empty_audio');
  return {
    audioBase64: toBase64(bytes),
    contentType: contentType || 'audio/mpeg',
    provider,
    model,
    voiceId: speaker,
  };
}

async function synthesizeElevenLabs(
  text: string,
  characterId: CanonCharacterId,
  env: VoiceProviderEnv,
): Promise<VoiceSynthesisResult> {
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  const voiceId = elevenLabsVoiceId(characterId, env);
  if (!apiKey || !voiceId) throw new Error('elevenlabs_unavailable');

  const model = 'eleven_flash_v2_5';
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text.slice(0, 4000),
        model_id: model,
        apply_text_normalization: 'auto',
      }),
    },
  );
  if (!response.ok) throw new Error(`elevenlabs_${response.status}`);
  const data = await response.json() as {
    audio_base64?: string;
    alignment?: {
      characters?: unknown;
      character_start_times_seconds?: unknown;
      character_end_times_seconds?: unknown;
    } | null;
  };
  if (!data.audio_base64) throw new Error('elevenlabs_empty_audio');

  const alignment = data.alignment;
  const timing = alignment
    && Array.isArray(alignment.characters)
    && Array.isArray(alignment.character_start_times_seconds)
    && Array.isArray(alignment.character_end_times_seconds)
    ? {
        characters: alignment.characters.filter((value): value is string => typeof value === 'string'),
        characterStartTimesSeconds: alignment.character_start_times_seconds.filter((value): value is number => typeof value === 'number'),
        characterEndTimesSeconds: alignment.character_end_times_seconds.filter((value): value is number => typeof value === 'number'),
      }
    : undefined;

  return {
    audioBase64: data.audio_base64,
    contentType: 'audio/mpeg',
    provider: 'elevenlabs-flash',
    model,
    voiceId,
    timing,
  };
}

async function synthesizeProvider(
  provider: VoiceProvider,
  text: string,
  characterId: CanonCharacterId,
  env: VoiceProviderEnv,
): Promise<VoiceSynthesisResult> {
  if (provider === 'elevenlabs-flash') return synthesizeElevenLabs(text, characterId, env);
  return synthesizeCloudflare(provider, text, characterId, env);
}

export async function synthesizeRoutedVoice(
  route: VoiceRoutingDecision,
  text: string,
  env: VoiceProviderEnv,
): Promise<VoiceSynthesisResult & { usedFallback: boolean; primaryProvider: VoiceProvider }> {
  try {
    const result = await synthesizeProvider(route.provider, text, route.canonicalCharacterId, env);
    return { ...result, usedFallback: false, primaryProvider: route.provider };
  } catch (primaryError) {
    if (!route.fallbackProvider) throw primaryError;
    console.error('[voice-provider:primary]', {
      provider: route.provider,
      error: primaryError instanceof Error ? primaryError.message : 'unknown',
    });
    const result = await synthesizeProvider(route.fallbackProvider, text, route.canonicalCharacterId, env);
    return { ...result, usedFallback: true, primaryProvider: route.provider };
  }
}

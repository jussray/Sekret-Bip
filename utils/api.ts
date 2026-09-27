/**
 * Compatibility layer for legacy screen imports.
 *
 * Canonical network helpers live in src/utils/api.ts. Launch voice behavior is
 * overridden here so legacy Voice Bip / Pages screens default to zero-cost
 * device speech and do not call paid STT/TTS unless explicitly enabled.
 */
export * from '../src/utils/api';

import {
  fetchSekretReply as fetchServerReply,
  fetchSekretTranscribe as fetchServerTranscribe,
  fetchSekretVoice as fetchServerVoice,
} from '../src/utils/api';
import { speakDeviceReply } from './deviceSpeech';

const PAID_STT_ENABLED = process.env.EXPO_PUBLIC_VOICE_STT_ENABLED === 'true';
const PAID_TTS_ENABLED = process.env.EXPO_PUBLIC_VOICE_TTS_ENABLED === 'true';

function localVoiceAck(avatarKey?: string): string {
  const raw = (avatarKey ?? '').trim().toLowerCase();
  if (raw === 'sy' || raw.includes('rylane')) {
    return "Bet. You got it out. You don't gotta run it back right now.";
  }
  if (raw.includes('cloud')) {
    return 'Okay. You can let that one stay here for a minute.';
  }
  if (raw.includes('night')) {
    return 'Got it. You can leave that here for tonight.';
  }
  return 'Got you. You got it out. You can leave it right here.';
}

/**
 * Launch default: no paid STT.
 *
 * Set EXPO_PUBLIC_VOICE_STT_ENABLED=true only when you intentionally want to
 * turn server transcription back on. Until then, voice notes remain private
 * recordings and the UI uses a content-neutral acknowledgement.
 */
export function fetchSekretTranscribe(
  ...args: Parameters<typeof fetchServerTranscribe>
): ReturnType<typeof fetchServerTranscribe> {
  if (!PAID_STT_ENABLED) return Promise.resolve(null);
  return fetchServerTranscribe(...args);
}

/**
 * Launch default: speak replies with the phone/browser speech engine.
 *
 * This avoids the Worker -> OpenAI/Piper synthesis path. Set
 * EXPO_PUBLIC_VOICE_TTS_ENABLED=true only when paid/server TTS is desired.
 */
export function fetchSekretVoice(
  ...args: Parameters<typeof fetchServerVoice>
): ReturnType<typeof fetchServerVoice> {
  const [input] = args;
  if (PAID_TTS_ENABLED) return fetchServerVoice(...args);
  return speakDeviceReply(input.reply, input.characterId).then(() => null);
}

/**
 * When STT is intentionally off, Voice Bip must not pretend it understood an
 * untranscribed recording or spend an LLM call responding to placeholder text.
 * Use a short companion-specific acknowledgement instead.
 */
export function fetchSekretReply(
  ...args: Parameters<typeof fetchServerReply>
): ReturnType<typeof fetchServerReply> {
  const [text, context = 'journal', _mood, avatarKey] = args;
  const isUntranscribedVoiceBip =
    !PAID_STT_ENABLED &&
    context === 'voiceBip' &&
    text.trim() === 'I needed to get some feelings out.';

  if (isUntranscribedVoiceBip) {
    return Promise.resolve(localVoiceAck(avatarKey));
  }

  return fetchServerReply(...args);
}

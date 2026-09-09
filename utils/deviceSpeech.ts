import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

interface NativeSpeechModule {
  speak(id: string, text: string, options: Record<string, unknown>): void;
  stop?: () => Promise<void> | void;
}

type VoiceCharacter = 'suhana' | 'sy' | 'cloud' | 'night' | 'sekret' | string;

let nativeSpeech: NativeSpeechModule | null = null;

try {
  nativeSpeech = requireNativeModule('ExpoSpeech') as NativeSpeechModule;
} catch {
  nativeSpeech = null;
}

const DEVICE_VOICE_STYLE: Record<string, { rate: number; pitch: number }> = {
  suhana: { rate: 0.98, pitch: 1.05 },
  raylene: { rate: 0.98, pitch: 1.05 },
  sy: { rate: 0.96, pitch: 0.92 },
  rylane: { rate: 0.96, pitch: 0.92 },
  cloud: { rate: 0.9, pitch: 1.03 },
  night: { rate: 0.88, pitch: 0.9 },
  sekret: { rate: 0.94, pitch: 1.0 },
};

function styleFor(characterId: VoiceCharacter) {
  return DEVICE_VOICE_STYLE[String(characterId).toLowerCase()] ?? DEVICE_VOICE_STYLE.sekret;
}

function speakOnWeb(text: string, characterId: VoiceCharacter): boolean {
  if (Platform.OS !== 'web') return false;
  const speech = (globalThis as typeof globalThis & {
    speechSynthesis?: {
      cancel(): void;
      speak(utterance: unknown): void;
    };
    SpeechSynthesisUtterance?: new (text: string) => {
      rate: number;
      pitch: number;
      volume: number;
      lang: string;
    };
  });

  if (!speech.speechSynthesis || !speech.SpeechSynthesisUtterance) return false;

  const utterance = new speech.SpeechSynthesisUtterance(text);
  const style = styleFor(characterId);
  utterance.rate = style.rate;
  utterance.pitch = style.pitch;
  utterance.volume = 1;
  utterance.lang = 'en-US';
  speech.speechSynthesis.cancel();
  speech.speechSynthesis.speak(utterance);
  return true;
}

export async function speakDeviceReply(text: string, characterId: VoiceCharacter): Promise<boolean> {
  const clean = text.trim();
  if (!clean) return false;

  if (speakOnWeb(clean, characterId)) return true;
  if (!nativeSpeech) return false;

  try {
    await nativeSpeech.stop?.();
    const style = styleFor(characterId);
    nativeSpeech.speak(`sekret-${Date.now()}`, clean.slice(0, 4000), {
      language: 'en-US',
      rate: style.rate,
      pitch: style.pitch,
      volume: 1,
    });
    return true;
  } catch (error) {
    console.warn('[deviceSpeech] local speech unavailable:', error instanceof Error ? error.message : error);
    return false;
  }
}

export async function stopDeviceReply(): Promise<void> {
  if (Platform.OS === 'web') {
    const speech = (globalThis as typeof globalThis & { speechSynthesis?: { cancel(): void } });
    speech.speechSynthesis?.cancel();
    return;
  }

  try {
    await nativeSpeech?.stop?.();
  } catch {
    // Device speech is an optional launch enhancement; never crash the screen.
  }
}

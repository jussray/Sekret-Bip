export * from '../../services/voiceBipIntelligence';

import { logRuntimeFingerprint } from '@/services/runtimeFingerprintLogger';

export async function reportVoiceRequestFailure(input: {
  companion?: string | null;
  durationMs?: number | null;
  errorCode?: string | null;
  screen?: string | null;
  message?: string | null;
}): Promise<void> {
  await logRuntimeFingerprint('voice.generation_failed', {
    screen: input.screen ?? 'VoiceBip',
    message: input.message ?? 'Voice response request failed.',
    metadata: {
      companion: input.companion ?? null,
      durationMs: input.durationMs ?? null,
      errorCode: input.errorCode ?? null,
      operation: 'voice_response_request',
    },
  });
}

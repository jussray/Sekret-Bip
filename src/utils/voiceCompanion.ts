// src/utils/voiceCompanion.ts
// Physical implementation — utils/voiceCompanion.ts is the legacy shim.

export interface VoiceCompanionStatus {
  ready: boolean;
  mode: 'voice' | 'text' | 'future';
  message: string;
}

export interface VoiceCompanionSession {
  id: string;
  avatarKey: string;
  personality: string;
  voiceId: string | null;
  mood: string;
  status: VoiceCompanionStatus;
}

export function createVoiceCompanionSession(
  avatarKey: string,
  personality: string,
  mood: string,
  mode: VoiceCompanionStatus['mode'] = 'voice',
  voiceId: string | null = null,
): VoiceCompanionSession {
  return {
    id: `voice-${Date.now()}`,
    avatarKey,
    personality,
    voiceId,
    mood,
    status: {
      ready: true,
      mode,
      message: 'Voice-ready architecture is prepared for future conversations.',
    },
  };
}

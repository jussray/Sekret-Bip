import { useMemo, useState } from 'react';
import { createVoiceCompanionSession, type VoiceCompanionSession, type VoiceCompanionStatus } from '@/utils/voiceCompanion';

interface UseVoiceCompanionArgs {
  avatarKey?: string;
  personality?: string;
  mood?: string;
  voiceId?: string | null;
}

export function useVoiceCompanion({
  avatarKey = 'raylene',
  personality = 'raylene',
  mood = 'calm',
  voiceId = null,
}: UseVoiceCompanionArgs) {
  const [session, setSession] = useState<VoiceCompanionSession | null>(null);

  const prepareVoiceSession = (mode: VoiceCompanionStatus['mode'] = 'voice') => {
    const nextSession = createVoiceCompanionSession(avatarKey, personality, mood, mode, voiceId);
    setSession(nextSession);
    return nextSession;
  };

  const voiceStatus = useMemo(() => session?.status || {
    ready: true,
    mode: 'future' as const,
    message: 'Voice-ready architecture is prepared for future conversations.',
  }, [session]);

  return {
    session,
    voiceStatus,
    prepareVoiceSession,
  };
}

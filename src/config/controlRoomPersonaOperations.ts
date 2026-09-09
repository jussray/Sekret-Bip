import type { PersonalityId } from '@/types';

export type VoiceProfile = 'cool-cousin' | 'redteam' | 'quiet-comfort' | 'ghostwriter' | 'oracle' | 'parent-coach';
export type SafetyProfile = 'teen-safe' | 'teen-calm' | 'parent-guidance';
export type MemoryProfile = 'conversational' | 'minimal' | 'reflective' | 'parent-context';

export interface PersonaOperationsConfig {
  personalityId: PersonalityId;
  voiceProfile: VoiceProfile;
  safetyProfile: SafetyProfile;
  memoryProfile: MemoryProfile;
  owner: 'ai';
  status: 'active' | 'watch';
  notes: string;
}

export const PERSONA_OPERATIONS: Record<PersonalityId, PersonaOperationsConfig> = {
  raylene: { personalityId: 'raylene', voiceProfile: 'cool-cousin', safetyProfile: 'teen-safe', memoryProfile: 'conversational', owner: 'ai', status: 'active', notes: 'Emotionally sharp, direct, funny, protective, and never clinical.' },
  rylane: { personalityId: 'rylane', voiceProfile: 'redteam', safetyProfile: 'teen-safe', memoryProfile: 'conversational', owner: 'ai', status: 'active', notes: 'Direct, loyal, sparse, and honest without performing slang.' },
  cloud: { personalityId: 'cloud', voiceProfile: 'quiet-comfort', safetyProfile: 'teen-calm', memoryProfile: 'minimal', owner: 'ai', status: 'active', notes: 'Low-pressure presence with short replies and no forced questions.' },
  night: { personalityId: 'night', voiceProfile: 'ghostwriter', safetyProfile: 'teen-calm', memoryProfile: 'reflective', owner: 'ai', status: 'active', notes: 'Quiet late-night presence. One thought at a time.' },
  oracle: { personalityId: 'oracle', voiceProfile: 'oracle', safetyProfile: 'teen-safe', memoryProfile: 'reflective', owner: 'ai', status: 'watch', notes: 'Pattern recognition and grounded perspective. Never mystical or diagnostic.' },
  parentCoach: { personalityId: 'parentCoach', voiceProfile: 'parent-coach', safetyProfile: 'parent-guidance', memoryProfile: 'parent-context', owner: 'ai', status: 'active', notes: 'Warm kitchen-table guidance that does not shame or take sides.' },
};

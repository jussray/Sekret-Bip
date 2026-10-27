/**
 * src/services/ai/index.ts
 *
 * AI service barrel.
 * Import via: import { sendMessage, AI_PERSONALITIES, PERSONALITY_CONFIG } from '@/services/ai';
 */
export { sendMessage, makeUserMessage, makeAssistantMessage } from './chat';
export type { ChatMessage }                                   from './chat';
export { AI_PERSONALITIES, PERSONALITY_CONFIG }               from './personalities';
export type { PersonalityConfig }                             from './personalities';
export { AVATAR_PERSONAS, VOICE_SEEDS, buildAvatarSystemPrompt, composeAvatarPrompt, lintAvatarResponse } from './aiPatternLinter';
export type { AvatarPersona, LintResult, PatternHit, PatternSeverity } from './aiPatternLinter';

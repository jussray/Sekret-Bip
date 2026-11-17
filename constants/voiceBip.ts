import type { ImageSourcePropType } from 'react-native';
import { AVATARS, IMAGES, type Character } from './theme';
import type { SekretPersonality } from '../services/sekretPresence';

export type VoiceBipAvatarKey = Character;
export type FutureVoiceId = string | null;

/**
 * Piper TTS voice model stems for each character.
 * Each value must match a .onnx file present in the server's /voices directory.
 * Check installed models: GET /health on the Piper server (or call checkPiperHealth()).
 */
export const VOICE_BIP_VOICE_IDS = {
  rayleneVoiceId: 'en_US-amy-medium'    as string,
  rylaneVoiceId:  'en_US-ryan-medium'   as string,
  cloudVoiceId:   'en_US-amy-low'       as string,
  nightVoiceId:   'en_US-lessac-low'    as string,
  sekretVoiceId:  'en_US-amy-medium'    as string,
} as const;

export type AvatarVoiceProfileKey = VoiceBipAvatarKey | 'sekret';

export interface AvatarVoiceProfile {
  key: AvatarVoiceProfileKey;
  voiceId: string;
  enabled: boolean;
  provider: 'piper' | 'none';
}

/** Oracle is intentionally absent: it reasons privately and never speaks. */
export const AVATAR_VOICE_PROFILES: Record<AvatarVoiceProfileKey, AvatarVoiceProfile> = {
  raylene: { key: 'raylene', voiceId: VOICE_BIP_VOICE_IDS.rayleneVoiceId, enabled: true,  provider: 'piper' },
  rylane:  { key: 'rylane',  voiceId: VOICE_BIP_VOICE_IDS.rylaneVoiceId,  enabled: true,  provider: 'piper' },
  cloud:   { key: 'cloud',   voiceId: VOICE_BIP_VOICE_IDS.cloudVoiceId,   enabled: true,  provider: 'piper' },
  night:   { key: 'night',   voiceId: VOICE_BIP_VOICE_IDS.nightVoiceId,   enabled: true,  provider: 'piper' },
  sekret:  { key: 'sekret',  voiceId: VOICE_BIP_VOICE_IDS.sekretVoiceId,  enabled: true,  provider: 'piper' },
};

export interface VoiceBipPrompt {
  emoji: string;
  text: string;
}

export interface VoiceBipAvatarDefinition {
  key: VoiceBipAvatarKey;
  displayName: string;
  emoji: string;
  role: string;
  energy: string;
  personality: SekretPersonality;
  voiceId: string;
  accent: string;
  heroArt: {
    day: ImageSourcePropType | null;
    night: ImageSourcePropType | null;
  };
  prompts: readonly VoiceBipPrompt[];
  tips: readonly string[];
  greeting: string;
  presence: string;
  listening: string;
  responseLabel: string;
  archiveTitle: string;
}

export const VOICE_BIP_AVATARS: Record<VoiceBipAvatarKey, VoiceBipAvatarDefinition> = {
  raylene: {
    key: 'raylene',
    displayName: 'Suhana',
    emoji: '\uD83D\uDC9C',
    role: 'The one who sees it',
    energy: 'Come here. Talk to me.',
    personality: 'suhana',
    voiceId: VOICE_BIP_VOICE_IDS.rayleneVoiceId,
    accent: '#e9a8d2',
    heroArt: { day: IMAGES.rayleneVoiceDay, night: IMAGES.rayleneVoiceNight },
    prompts: [
      { emoji: '\uD83D\uDC9C', text: "What's something you've been carrying that you haven't said out loud yet?" },
      { emoji: '\uD83C\uDF19', text: 'Tell me about a moment this week that felt heavier than it should have.' },
      { emoji: '\uD83E\uDEF6', text: "What do you need right now that nobody's asked you about?" },
      { emoji: '\uD83C\uDF27\uFE0F', text: 'Say the thing you keep stopping yourself from saying.' },
      { emoji: '\u2728', text: 'What went okay today -- even just one small thing?' },
    ],
    tips: [
      'Find a private spot -- car, room, bathroom, wherever',
      "You don't need perfect words. Just talk.",
      "It's okay to cry, pause, or start over",
      'No judgment. No corny speech. Just real conversation.',
    ],
    greeting: 'Come here. Talk to me.',
    presence: "Suhana's here — sharp, real, and listening",
    listening: 'Suhana is listening\u2026 \uD83D\uDC9C',
    responseLabel: 'Suhana replied \uD83D\uDC9C',
    archiveTitle: 'Voice Bips with Suhana',
  },
  rylane: {
    key: 'rylane',
    displayName: 'Sy',
    emoji: '\u26A1',
    role: 'Big brother / older cousin',
    energy: 'Aight. Say it straight.',
    personality: 'sy',
    voiceId: VOICE_BIP_VOICE_IDS.rylaneVoiceId,
    accent: '#8f9cff',
    heroArt: { day: IMAGES.rylaneVoiceDay, night: IMAGES.rylaneVoiceNight },
    prompts: [
      { emoji: '\u26A1', text: "What's been sitting on your chest that you haven't put down yet?" },
      { emoji: '\uD83E\uDDE0', text: "Say it plain. No filter. What's actually on your mind right now?" },
      { emoji: '\uD83C\uDF99\uFE0F', text: 'Talk me through the last 24 hours, for real.' },
      { emoji: '\uD83D\uDD0A', text: 'What would you say if nobody was watching or judging?' },
      { emoji: '\uD83C\uDFC6', text: "What's one thing you handled today that nobody gave you credit for?" },
    ],
    tips: [
      'Find your spot -- car, garage, walk, wherever feels real',
      "You don't gotta sound smooth. Just say it.",
      'Pause. Curse. Restart. All allowed.',
      "I'm not grading you. I'm holding it with you.",
    ],
    greeting: 'Aight. Say it straight.',
    presence: "Sy's here - no judgment, no lecture",
    listening: 'Sy is listening\u2026 \u26A1',
    responseLabel: 'Sy replied \u26A1',
    archiveTitle: 'Voice Bips with Sy',
  },
  cloud: {
    key: 'cloud',
    displayName: 'Cloud',
    emoji: '\u2601\uFE0F',
    role: 'Reflection',
    energy: "We don't have to rush this.",
    personality: 'cloud',
    voiceId: VOICE_BIP_VOICE_IDS.cloudVoiceId,
    accent: '#c8c9f5',
    heroArt: { day: AVATARS.cloud.fullbody, night: AVATARS.cloud.fullbody },
    prompts: [
      { emoji: '\u2601\uFE0F', text: "Let the words come slowly. There's no rush here." },
      { emoji: '\uD83D\uDD6F\uFE0F', text: "What's one thing that felt heavy this week you haven't set down?" },
      { emoji: '\uD83C\uDF0A', text: 'Just breathe first. Then say whatever comes.' },
      { emoji: '\uD83E\uDEE7', text: 'What feels closest to the surface right now?' },
    ],
    tips: [
      "Start with one word if that's all you have",
      'Silence is allowed. Take the space you need.',
      'You can pause and come back when the thought is ready',
      'Nothing has to be solved here',
    ],
    greeting: "We don't have to rush this.",
    presence: "Cloud's here - quiet and unhurried",
    listening: 'Cloud is listening\u2026 \u2601\uFE0F',
    responseLabel: 'Cloud replied \u2601\uFE0F',
    archiveTitle: 'Voice Bips with Cloud',
  },
  night: {
    key: 'night',
    displayName: 'Night',
    emoji: '\uD83C\uDF19',
    role: 'Late-night presence',
    energy: "I'm here while everybody else is asleep.",
    personality: 'night',
    voiceId: VOICE_BIP_VOICE_IDS.nightVoiceId,
    accent: '#bbb7ef',
    heroArt: { day: null, night: null },
    prompts: [
      { emoji: '\uD83C\uDF03', text: 'What keeps replaying in your head at night?' },
      { emoji: '\uD83C\uDF19', text: "What are you too tired to pretend is fine right now?" },
      { emoji: '\uD83D\uDE36\u200D\uD83C\uDF2B\uFE0F', text: 'Say the part that gets louder after dark.' },
      { emoji: '\uD83D\uDD6F\uFE0F', text: 'What do you need someone to stay awake with you for?' },
    ],
    tips: [
      'Let the room be quiet around you',
      "You don't have to make tonight sound better than it feels",
      'Take your time between thoughts',
      'Night stays present; Night does not push',
    ],
    greeting: "I'm here while everybody else is asleep.",
    presence: "Night's here - the light is still on",
    listening: 'Night is listening\u2026 \uD83C\uDF19',
    responseLabel: 'Night replied \uD83C\uDF19',
    archiveTitle: 'Voice Bips with Night',
  },
};

export const VOICE_BIP_AVATAR_KEYS = Object.freeze([
  'raylene',
  'rylane',
  'cloud',
  'night',
] as const);

export function normalizeVoiceBipAvatar(value?: string): VoiceBipAvatarKey {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'rylane') return 'rylane';
  if (normalized === 'cloud') return 'cloud';
  if (normalized === 'night') return 'night';
  return 'raylene';
}

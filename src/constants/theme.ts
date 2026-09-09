/**
 * Canonical theme and compatibility image map.
 *
 * Human companion assets are identity-locked to the approved Raylene, Rylane,
 * and Night masters. State-specific keys remain stable so existing screens do
 * not need to change while matching emotional poses are regenerated.
 */
import type { Theme, SekretProfile } from '@/types';

export const THEME_PACKS: Record<string, Theme> = {
  night: {
    name: 'Golden Moon', emoji: '🌙', background: '#3A2503',
    card: '#5B3A00', accent: '#FFD84D', soft: '#FFF3B0',
  },
  flower: {
    name: 'Soft Pink', emoji: '🌸', background: '#4A1028',
    card: '#6D1B3B', accent: '#FF4FA3', soft: '#FFD6E7',
  },
  rain: {
    name: 'Rain Blue', emoji: '🌧️', background: '#243447',
    card: '#36506B', accent: '#4DA3FF', soft: '#B6DCFF',
  },
  neon: {
    name: 'Night Purple', emoji: '💜', background: '#160028',
    card: '#2B0A4D', accent: '#D946EF', soft: '#F5B8FF',
  },
  galaxy: {
    name: 'Galaxy Night', emoji: '🌌', background: '#151A40',
    card: '#2A2D73', accent: '#7C83FF', soft: '#D7D9FF',
  },
};

export const SEKRET_PROFILES: Record<string, SekretProfile> = {
  soft: {
    name: "Se'kret", emoji: '🌸', title: 'Soft Big Sis',
    vibe: 'Warm, expressive, protective, and real.',
    greeting: "Hey love. I'm here. Tell me what's on your mind.",
  },
  rylane: {
    name: 'Rylane', emoji: '⚡', title: 'Loyal Bro',
    vibe: 'Quiet loyalty. Keeps it real. Never talks down.',
    greeting: "Aight, I'm here. What's been heavy?",
  },
  cloud: {
    name: "Cloud Se'kret", emoji: '☁️', title: 'Quiet Comfort',
    vibe: 'Soft, calm, low-pressure presence.',
    greeting: 'No pressure. We can just sit here for a minute.',
  },
  night: {
    name: "Night Se'kret", emoji: '🌙', title: 'Late-Night Listener',
    vibe: 'Minimal words, calm energy, safe space.',
    greeting: "I'm here. You don't gotta explain perfectly.",
  },
};

export const MOODS = [
  { id: 'Happy', emoji: '😊' },
  { id: 'Sad', emoji: '😔' },
  { id: 'Angry', emoji: '😡' },
  { id: 'Tired', emoji: '😴' },
];

export const COMFORT_MESSAGES = [
  { emoji: '🌙', text: "You've survived every hard day so far. That matters." },
  { emoji: '☁️', text: 'Rest is productive too. You are allowed to pause.' },
  { emoji: '💙', text: "Someone is glad you're still here tonight." },
  { emoji: '🌧️', text: 'Bad moments are real. So is your strength.' },
  { emoji: '✨', text: "You don't need to be perfect to be loved." },
  { emoji: '🫶', text: 'Your feelings are allowed here.' },
  { emoji: '🕯️', text: 'Slow breath. Stay with me.' },
];

export const HOME_MESSAGES = [
  "Don't stay up carrying the whole world tonight.",
  'Rest is productive too.',
  'You deserve softness too.',
  'Heavy days do not define you.',
  'Your mind deserves rest.',
  'Breathe slowly tonight.',
  'You made it through today.',
];

export const HEAVY_WORDS = [
  'alone', 'hurt', 'tired', 'done', 'empty',
  'cry', 'sad', 'scared', 'anxious', 'panic',
];

export type VibeKey = 'soft' | 'rylane' | 'cloud' | 'night';
export type Character = VibeKey;
export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';
export type RoomPhase = 'day' | 'evening' | 'night';

const VALID_VIBE_KEYS: VibeKey[] = ['soft', 'rylane', 'cloud', 'night'];

export function normalizeVibeKey(raw: string | undefined): VibeKey {
  return VALID_VIBE_KEYS.includes(raw as VibeKey) ? (raw as VibeKey) : 'soft';
}

export function normalizeCharacterKey(raw: string | undefined): Character {
  return normalizeVibeKey(raw);
}

export const ROOM_BACKGROUNDS: Record<VibeKey, string> = {
  soft: '#4A1028',
  rylane: '#243447',
  cloud: '#151A40',
  night: '#3A2503',
};

export function getRoomBg(vibe: VibeKey): string {
  return ROOM_BACKGROUNDS[vibe] ?? ROOM_BACKGROUNDS.soft;
}

export function getParentRoomBg(): string {
  return '#1A0A2E';
}

export interface AvatarMap {
  neutral: number;
  happy?: number;
  window?: number;
  voice?: number;
}

export type SceneKey = 'default' | 'writing' | 'window' | 'voiceBip';

export interface RoomScene {
  bg: string;
  avatar: AvatarMap;
}

export function getRoomPhase(hour: number): RoomPhase {
  if (hour >= 6 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function getRoomScene(character: Character, _phase: RoomPhase): RoomScene {
  const bg = ROOM_BACKGROUNDS[character] ?? ROOM_BACKGROUNDS.soft;
  return { bg, avatar: { neutral: AVATARS[character] } };
}

const RAYLENE_MASTER = require('../../assets/images/companions/raylene/raylene-master.png');
const RYLANE_MASTER = require('../../assets/images/companions/rylane/rylane-master.png');
const NIGHT_MASTER = require('../../assets/images/companions/night/night-master.png');

export const IMAGES: Record<string, number> = {
  rayleneNeutral: RAYLENE_MASTER,
  rayleneHappy: RAYLENE_MASTER,
  rayleneHappyV3: RAYLENE_MASTER,
  rayleneWriting: RAYLENE_MASTER,
  rayleneWindow: RAYLENE_MASTER,
  rayleneWindowRainy: RAYLENE_MASTER,
  rayleneFullbody: RAYLENE_MASTER,
  rayleneVoiceDay: RAYLENE_MASTER,
  rayleneVoiceNight: RAYLENE_MASTER,
  raylene_Bippin2Day: RAYLENE_MASTER,
  rayleneThinking: RAYLENE_MASTER,
  rayleneConfident: RAYLENE_MASTER,
  rayleeneSad: RAYLENE_MASTER,

  rylaneNeutral: RYLANE_MASTER,
  rylaneNeutralV2: RYLANE_MASTER,
  rylaneHappy: RYLANE_MASTER,
  rylaneThinking: RYLANE_MASTER,
  rylaneWriting: RYLANE_MASTER,
  rylaneWindow: RYLANE_MASTER,
  rylaneWindowDay: RYLANE_MASTER,
  rylaneFullbody: RYLANE_MASTER,
  rylaneVoiceDay: RYLANE_MASTER,
  rylaneVoiceNight: RYLANE_MASTER,

  cloud: require('../../assets/images/cloud.png'),
  cloudHappy: require('../../assets/images/cloud-happy.png'),
  cloudHeadphones: require('../../assets/images/cloud-headphones.png'),
  cloudHeadphonesV2: require('../../assets/images/cloud-headphones-v2.png'),
  cloudSleepy: require('../../assets/images/cloud-sleepy.png'),
  cloudStormy: require('../../assets/images/cloud-stormy.png'),
  cloudAvatarNeutral: require('../../assets/images/cloud.png'),
  cloudAvatarHappy: require('../../assets/images/cloud-happy.png'),
  cloudAvatarThinking: require('../../assets/images/cloud-headphones.png'),
  cloudAvatarWriting: require('../../assets/images/cloud-headphones-v2.png'),
  cloudAvatarWindow: require('../../assets/images/cloud-sleepy.png'),

  nightNeutral: NIGHT_MASTER,
  nightHappy: NIGHT_MASTER,
  nightListening: NIGHT_MASTER,
  nightProtective: NIGHT_MASTER,
  nightRelaxed: NIGHT_MASTER,
  nightSoftsmile: NIGHT_MASTER,
  nightThinking: NIGHT_MASTER,
};

export const AVATARS: Record<VibeKey, number> = {
  soft: IMAGES.rayleneNeutral,
  rylane: IMAGES.rylaneNeutral,
  cloud: IMAGES.cloud,
  night: IMAGES.nightNeutral,
};

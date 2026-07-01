/**
 * src/types/index.ts
 *
 * Canonical types (moved from types/index.ts in Step 3).
 * Import via: import type { JournalEntry } from '@/types';
 */

export * from './identity';
export * from './verification';
export * from './safety';
export * from './doorbell';
export * from './notifications';
export * from './companions';

export interface JournalEntry {
  id: number;
  text: string;
  mood: string;
  date: string;
  time: string;
  source?: string;
  entryMode?: string;
  moodTag?: string;
  imageUri?: string;
  mediaType?: 'photo' | 'video';
  sekretReply?: string;
  sekretAvatarState?: string;
  locked?: boolean;
  pinned?: boolean;
  activeTab?: string;
}

export interface CirclePost {
  // number for locally-created optimistic posts (Date.now()), string for
  // posts loaded from Circle V2's uuid-keyed `posts` table.
  id: number | string;
  text: string;
  date: string;
  time: string;
  reactions: {
    felt: number;
    comfort: number;
    proud: number;
    stay: number;
    sameHere?: number;
  };
  bipType?: string;
  mediaKind?: string;
  circleTag?: string;
  postMood?: string;
}

export interface VoiceNote {
  id: number;
  title: string;
  date: string;
  time: string;
  duration: string;
  type?: 'voice' | 'video' | 'audio' | 'text' | 'cloud';
  [key: string]: unknown;
}

export interface MoodEntry {
  id: number;
  mood: string;
  date: string;
  time: string;
}

export interface Theme {
  name: string;
  emoji: string;
  background: string;
  card: string;
  accent: string;
  soft: string;
  feeling?: string;
  [key: string]: unknown;
}

export interface SekretProfile {
  name: string;
  emoji: string;
  title: string;
  vibe: string;
  greeting: string;
}

export interface TeenProfile {
  displayName: string;
  ageRange: '13-15' | '16-17' | '18-19' | '';
  preferredSekret: 'raylene' | 'rylane' | 'cloud' | 'night' | '';
  setupComplete: boolean;
}

export interface ParentProfile {
  displayName: string;
  role: 'mom' | 'dad' | 'guardian' | 'caregiver' | 'other' | '';
  teenNickname: string;
  setupComplete: boolean;
}

export type PersonalityId = 'raylene' | 'rylane' | 'cloud' | 'night' | 'oracle' | 'parentCoach';

export type ScreenKey =
  | 'home'
  | 'pages'
  | 'calm'
  | 'circle'
  | 'sekret'
  | 'voiceBip'
  | 'bridge'
  | 'parentBridge'
  | 'cloudThoughts'
  | 'settings'
  | 'discover';

export interface ParentCirclePost {
  // number for locally-created optimistic posts (Date.now()), string for
  // posts loaded from Circle V2's uuid-keyed `posts` table.
  id: number | string;
  text: string;
  date: string;
  time: string;
  mood?: string;
  circleTag?: string;
  reactions?: {
    felt?: number;
    comfort?: number;
    proud?: number;
    stay?: number;
    sameHere?: number;
    beenThere?: number;
    solidarity?: number;
    reminder?: number;
    needed?: number;
    strength?: number;
    [key: string]: number | undefined;
  };
}

export interface ComfortSession {
  id: number;
  date: string;
  time: string;
  durationSecs?: number;
  type: string;
  mood?: string;
}

export interface CrewMember {
  id: string | number;
  name: string;
  relation?: string;
  emoji?: string;
  commitment?: string;
  cadence?: 'daily' | 'weekly' | 'whenever' | string;
  inviteCode?: string;
  addedAt?: string;
}

export interface CrewCheckIn {
  id: number;
  memberId: string | number;
  date: string;
  time: string;
  mood: string;
  note?: string;
}

export interface SavePageInput {
  text: string;
  source: string;
  moodTag?: string;
  entryMode?: string;
  locked?: boolean;
  imageUri?: string;
}

export interface BridgePayload {
  type: string;
  payload: unknown;
}

export type VibeKey =
  | 'midnight'
  | 'rainyDay'
  | 'musicMode'
  | 'studyCorner'
  | 'freshStart'
  | 'dreamer'
  | 'grounded'
  | 'energy'
  | 'flow'
  | 'softDay';

export interface VibeLabEntry {
  id: number;
  vibeKey: VibeKey;
  emoji: string;
  label: string;
  selectedAt: string;
  oracleSignal?: string;
}

/**
 * src/utils/sekretCompanion.ts
 * Physical implementation — see utils/sekretCompanion.ts for the legacy shim.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CompanionActivityInput,
  CompanionCheckIn,
  CompanionLevel,
  CompanionState,
  MemorySummary,
} from '../../types/sekretCompanion';
import {
  DEFAULT_SEKRET_MEMORY,
  loadSekretMemory,
  saveSekretMemory,
  summarizeSekretMemory,
  type SekretMemory,
} from '../../services/sekretMemory';
import { buildSekretPresence, normalizeSekretPersonality } from '../../services/sekretPresence';
import { buildSekretCheckIn } from '../../services/sekretCheckins';

const STORAGE_KEY = 'sekret_companion_state';

const PERSONALITY_LABELS: Record<string, string> = {
  soft: 'Suhana',
  raylene: 'Suhana',
  suhana: 'Suhana',
  rylane: 'Sy',
  sy: 'Sy',
  cloud: "Cloud Se'kret",
  night: "Night Se'kret",
};

function canonicalDisplayPersonality(value?: string): string {
  const direct = value ? PERSONALITY_LABELS[value.trim().toLowerCase()] : undefined;
  if (direct) return direct;

  switch (normalizeSekretPersonality(value)) {
    case 'sy':
      return 'Sy';
    case 'cloud':
      return "Cloud Se'kret";
    case 'night':
      return "Night Se'kret";
    default:
      return 'Suhana';
  }
}

function toPersistedPersonalityId(value?: string): 'soft' | 'rylane' | 'cloud' | 'night' {
  switch (normalizeSekretPersonality(value)) {
    case 'sy':
      return 'rylane';
    case 'cloud':
      return 'cloud';
    case 'night':
      return 'night';
    default:
      return 'soft';
  }
}

const DEFAULT_MEMORY_SUMMARY: MemorySummary = {
  favoriteMood: 'Thoughtful',
  favoriteSekret: 'Suhana',
  commonTopics: ['breathing', 'rest'],
  streakDays: 0,
  lastCheckIn: 'Just met you.',
  comfortToolsUsed: ['breath', 'rest'],
  recurringEmotions: ['calm'],
  recurringStruggles: ['overthinking'],
  importantMilestones: ['First check-in'],
  daysActive: 0,
  conversations: 0,
  journalsWritten: 0,
  voiceBips: 0,
  comfortActions: 0,
};

const DEFAULT_COMPANION_LEVEL: CompanionLevel = {
  level: 1,
  title: 'First hello',
  progress: 0,
  nextLevel: 8,
  unlockedGreetings: ['Hey, I\u2019m here.'],
  unlockedDepth: ['soft check-ins'],
  encouragements: ['You\u2019re doing enough.'],
  personalityResponses: ['gentle comfort'],
};

export const DEFAULT_COMPANION_STATE: CompanionState = {
  memorySummary: DEFAULT_MEMORY_SUMMARY,
  companionLevel: DEFAULT_COMPANION_LEVEL,
  greeting: 'Hey, I\u2019m here with you.',
  presenceMessage: 'I\u2019m here with you. No rush.',
  checkIn: null,
  lastUpdated: '',
  personality: 'Suhana',
};

function buildCompanionMemory(previous?: MemorySummary, input?: CompanionActivityInput): SekretMemory {
  return {
    ...DEFAULT_SEKRET_MEMORY,
    selectedPersonality: input?.selectedSekret || previous?.favoriteSekret || 'soft',
    streaks: {
      current: previous?.streakDays || 0,
      longest: previous?.streakDays || 0,
      lastUpdated: '',
    },
    recurringTopics: previous?.commonTopics || DEFAULT_SEKRET_MEMORY.recurringTopics,
    lastCheckIn: previous?.lastCheckIn || DEFAULT_SEKRET_MEMORY.lastCheckIn,
  };
}

export function buildMemorySummary(input: CompanionActivityInput, previous?: MemorySummary): MemorySummary {
  const memory = buildCompanionMemory(previous, input);
  return summarizeSekretMemory(memory);
}

export function buildCompanionLevel(summary: MemorySummary): CompanionLevel {
  const score = summary.daysActive * 2 + summary.conversations * 2 + summary.journalsWritten * 3 + summary.voiceBips * 4 + summary.comfortActions * 2;
  const level = Math.max(1, Math.min(6, Math.floor(score / 8) + 1));
  const nextLevel = Math.max(1, (level * 8) - score);
  const titles = ['First hello', 'Softly familiar', 'Trusted companion', 'Steady presence', 'Deeply known', 'Forever in your corner'];
  const greetings = [
    'Hey, I\u2019m here.', 'I\u2019m glad you checked in.',
    'You don\u2019t have to carry it alone.', 'We\u2019ve been growing together.',
    'I know your rhythm now.',
  ];
  const depths = [
    'gentle check-ins', 'memory-based comfort', 'deeper conversations',
    'special encouragement', 'personality-specific care',
  ];
  const encouragements = [
    'You are doing better than you think.', 'One small step still counts.',
    'You are allowed to be soft here.', 'I\u2019m proud of the way you keep showing up.',
  ];
  return {
    level,
    title: titles[level - 1] || titles[titles.length - 1],
    progress: Math.min(100, Math.round((score % 8) / 8 * 100)),
    nextLevel,
    unlockedGreetings: greetings.slice(0, Math.max(1, Math.min(greetings.length, level))),
    unlockedDepth: depths.slice(0, Math.max(1, Math.min(depths.length, level - 1))),
    encouragements: encouragements.slice(0, Math.max(1, Math.min(encouragements.length, level))),
    personalityResponses: ['gentle warmth', 'protective calm', 'honest care'],
  };
}

function getScreenPresence(input: CompanionActivityInput, summary: MemorySummary, personality: string) {
  return buildSekretPresence(summary, personality, input.screen);
}

export function buildCheckIn(summary: MemorySummary, input: CompanionActivityInput, personality: string): CompanionCheckIn | null {
  return buildSekretCheckIn(summary, personality, input.mood, input.isLateNight, input);
}

export function buildGreeting(personality: string, _level: CompanionLevel, _mood?: string) {
  switch (normalizeSekretPersonality(personality)) {
    case 'sy':
      return 'Aight. What REALLY happened?';
    case 'cloud':
      return 'Something feels different today.';
    case 'night':
      return 'Rough night?';
    default:
      return 'Friend... \uD83D\uDE2D okay, what happened?';
  }
}

export function buildCompanionSnapshot(input: CompanionActivityInput, previousState?: CompanionState) {
  const memorySummary = buildMemorySummary(input, previousState?.memorySummary);
  const companionLevel = buildCompanionLevel(memorySummary);
  const personality = input.selectedSekret
    ? canonicalDisplayPersonality(input.selectedSekret)
    : canonicalDisplayPersonality(previousState?.personality);
  const greeting = buildGreeting(personality, companionLevel, input.mood);
  const presenceMessage = getScreenPresence(input, memorySummary, personality);
  const checkIn = buildCheckIn(memorySummary, input, personality);
  return {
    memorySummary, companionLevel, greeting, presenceMessage, checkIn,
    lastUpdated: previousState?.lastUpdated || '',
    personality,
  } satisfies CompanionState;
}

export async function loadCompanionState(): Promise<CompanionState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const memory = await loadSekretMemory();
    if (!raw) {
      return {
        ...DEFAULT_COMPANION_STATE,
        memorySummary: {
          ...DEFAULT_MEMORY_SUMMARY,
          commonTopics: memory.recurringTopics || DEFAULT_MEMORY_SUMMARY.commonTopics,
          streakDays: memory.streaks?.current || 0,
          lastCheckIn: memory.lastCheckIn || DEFAULT_MEMORY_SUMMARY.lastCheckIn,
        },
        personality: canonicalDisplayPersonality(memory.selectedPersonality || 'soft'),
      };
    }
    const parsed = JSON.parse(raw) as CompanionState;
    return {
      ...DEFAULT_COMPANION_STATE,
      ...parsed,
      memorySummary: {
        ...DEFAULT_MEMORY_SUMMARY,
        ...(parsed.memorySummary || {}),
        commonTopics: parsed.memorySummary?.commonTopics || memory.recurringTopics || DEFAULT_MEMORY_SUMMARY.commonTopics,
        streakDays: parsed.memorySummary?.streakDays ?? memory.streaks?.current ?? 0,
        lastCheckIn: parsed.memorySummary?.lastCheckIn || memory.lastCheckIn || DEFAULT_MEMORY_SUMMARY.lastCheckIn,
      },
      companionLevel: { ...DEFAULT_COMPANION_LEVEL, ...(parsed.companionLevel || {}) },
      personality: canonicalDisplayPersonality(parsed.personality || memory.selectedPersonality || 'soft'),
    };
  } catch (error) {
    console.warn('Unable to load companion state', error);
    return DEFAULT_COMPANION_STATE;
  }
}

export async function saveCompanionState(state: CompanionState) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      personality: canonicalDisplayPersonality(state.personality),
    }));
    const existing = await loadSekretMemory();
    const memory: SekretMemory = {
      ...existing,
      selectedPersonality: toPersistedPersonalityId(state.personality),
      streaks: {
        current: state.memorySummary?.streakDays || existing.streaks?.current || 0,
        longest: Math.max(existing.streaks?.longest || 0, state.memorySummary?.streakDays || 0),
        lastUpdated: state.lastUpdated || existing.streaks?.lastUpdated || new Date().toISOString(),
      },
      recurringTopics: state.memorySummary?.commonTopics || existing.recurringTopics || DEFAULT_SEKRET_MEMORY.recurringTopics,
      lastCheckIn: state.memorySummary?.lastCheckIn || existing.lastCheckIn || DEFAULT_SEKRET_MEMORY.lastCheckIn,
      lastUpdated: state.lastUpdated || existing.lastUpdated || new Date().toISOString(),
    };
    await saveSekretMemory(memory);
  } catch (error) {
    console.warn('Unable to save companion state', error);
  }
}

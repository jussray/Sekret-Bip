import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CompanionActivityInput, MemorySummary } from '../types/sekretCompanion';


type ComfortWordEntry = { word: string; date: string };
type DeferredEntry    = { phrase: string; date: string };
type WinEntry         = { mood: string; date: string };
type MemoryRecord = {
  sourceId?: string;
  date?: string;
};

export type MoodMemory = MemoryRecord & { mood?: string };
export type JournalMemory = MemoryRecord & { mood?: string; topics?: string[] };
export type VoiceBipMemory = MemoryRecord & { title?: string; type?: string };
export type ComfortMemory = MemoryRecord & { type?: string };

export interface SekretMemory {
  moodHistory: MoodMemory[];
  journalActivity: JournalMemory[];
  voiceBips: VoiceBipMemory[];
  comfortUsage: ComfortMemory[];
  streaks: {
    current: number;
    longest: number;
    lastUpdated?: string;
  };
  selectedPersonality: string;
  lastCheckIn?: string;
  lastActiveAt?: string;
  recurringTopics: string[];
  comfortWordHistory: ComfortWordEntry[];
  deferredGoalHistory: DeferredEntry[];
  winHistory: WinEntry[];
  lastUpdated: string;
}

export const SEKRET_MEMORY_STORAGE_KEY = 'sekret_companion_memory';

const LEGACY_ACTIVITY_KEYS = ['moodHistory', 'entries', 'voiceNotes', 'comfortSessions'] as const;
const TOPIC_WORDS = [
  'school', 'friends', 'friendship', 'family', 'stress', 'sleep', 'body', 'heart',
  'future', 'home', 'work', 'love', 'money', 'grades', 'identity', 'peace', 'rest',
  'comfort', 'voice', 'circle', 'confidence', 'lonely', 'overthinking', 'relationship',
] as const;
const MAX_ACTIVITY_ITEMS = 60;

// Moods in the "winning" category — used to track growth over time
const WINNING_MOODS = new Set([
  'proud', 'motivated', 'confident', 'excited', 'accomplished', 'loved', 'connected',
  'locked-in', 'celebrating', 'glow-up', 'feeling-seen',
]);

// Words teens use to mask harder emotions
const COMFORT_WORDS = [
  'tired', 'fine', 'whatever', 'idk', 'okay', 'kind of', 'sort of', 'not really', 'ig', 'i guess',
] as const;

// Phrases that signal deferred goals
const DEFERRED_PHRASES = [
  'on monday', 'next week', 'next month', "i'll start", 'ill start', 'eventually',
  'soon', 'maybe later', 'one day', 'when i', 'after i',
] as const;



export const DEFAULT_SEKRET_MEMORY: SekretMemory = {
  moodHistory: [],
  journalActivity: [],
  voiceBips: [],
  comfortUsage: [],
  streaks: { current: 0, longest: 0, lastUpdated: '' },
  selectedPersonality: 'soft',
  lastCheckIn: '',
  lastActiveAt: '',
  recurringTopics: [],
  comfortWordHistory: [],
  deferredGoalHistory: [],
  winHistory: [],
  lastUpdated: '',
};

function safeArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function parseArray(raw: string | null): any[] {
  if (!raw) return [];
  try {
    return safeArray(JSON.parse(raw));
  } catch {
    return [];
  }
}

function sourceId(value: any, fallback: string): string {
  return String(value?.id ?? fallback);
}

function normalizeDate(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function extractTopics(text?: string): string[] {
  if (!text) return [];
  const normalized = text.toLowerCase();
  return TOPIC_WORDS.filter((topic) => normalized.includes(topic));
}


function extractComfortWords(text: string): ComfortWordEntry[] {
  const lower = text.toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  return COMFORT_WORDS
    .filter(word => lower.includes(word))
    .map(word => ({ word, date }));
}

function extractDeferredPhrases(text: string): DeferredEntry[] {
  const lower = text.toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  return DEFERRED_PHRASES
    .filter(phrase => lower.includes(phrase))
    .map(phrase => ({ phrase, date }));
}

function extractWins(moodHistory: Array<{ mood?: string; date?: string }>): WinEntry[] {
  const date = new Date().toISOString().slice(0, 10);
  return moodHistory
    .filter(entry => entry.mood && WINNING_MOODS.has(entry.mood.toLowerCase()))
    .map(entry => ({ mood: entry.mood!.toLowerCase(), date: entry.date || date }));
}

function normalizeTopics(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.toLowerCase().trim())))
    .slice(0, 6);
}

function mergeUnique<T extends MemoryRecord>(existing: T[], incoming: T[]): T[] {
  const records = new Map<string, T>();
  [...existing, ...incoming].forEach((record, index) => {
    const key = record.sourceId || `${record.date || 'undated'}:${JSON.stringify(record)}:${index}`;
    records.set(key, { ...records.get(key), ...record });
  });
  return Array.from(records.values()).slice(-MAX_ACTIVITY_ITEMS);
}

function countMostCommon(values: Array<string | undefined>, fallback: string): string {
  const counts = values.reduce<Record<string, number>>((all, value) => {
    if (value) all[value] = (all[value] || 0) + 1;
    return all;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || fallback;
}

function activityFromInput(input: CompanionActivityInput) {
  const moodHistory = safeArray(input.moodHistory).map((entry, index): MoodMemory => ({
    sourceId: sourceId(entry, `mood:${entry?.date || index}:${entry?.mood || ''}`),
    mood: entry?.mood,
    date: normalizeDate(entry?.date),
  }));
  const journalActivity = safeArray(input.journalEntries).map((entry, index): JournalMemory => ({
    sourceId: sourceId(entry, `journal:${entry?.date || index}:${entry?.text || ''}`),
    mood: entry?.mood,
    date: normalizeDate(entry?.date),
    topics: extractTopics(entry?.text),
  }));
  const voiceBips = safeArray(input.voiceNotes).map((entry, index): VoiceBipMemory => ({
    sourceId: sourceId(entry, `voice:${entry?.date || index}:${entry?.title || ''}`),
    title: entry?.title,
    type: entry?.type,
    date: normalizeDate(entry?.date),
  }));
  const comfortUsage = safeArray(input.comfortSessions).map((entry, index): ComfortMemory => ({
    sourceId: sourceId(entry, `comfort:${entry?.date || index}:${entry?.type || ''}`),
    type: entry?.type,
    date: normalizeDate(entry?.date),
  }));
  const recurringTopics = normalizeTopics([
    ...journalActivity.flatMap((entry) => entry.topics || []),
    ...safeArray(input.circlePosts).flatMap((post) => extractTopics(post?.text)),
  ]);
  const allJournalText = safeArray(input.journalEntries).map((e: any) => e?.text || '').join(' ');
  const moodLabels = safeArray(input.moodHistory).map((e: any) => e?.mood || '').join(' ');
  const comfortWordHistory = [
    ...extractComfortWords(allJournalText),
    ...extractComfortWords(moodLabels),
  ];
  const deferredGoalHistory = extractDeferredPhrases(allJournalText);
  const winHistory = extractWins(safeArray(input.moodHistory));
  return { moodHistory, journalActivity, voiceBips, comfortUsage, recurringTopics, comfortWordHistory, deferredGoalHistory, winHistory };
}

function normalizeMemory(value: Partial<SekretMemory> | undefined): SekretMemory {
  return {
    ...DEFAULT_SEKRET_MEMORY,
    ...value,
    moodHistory: safeArray(value?.moodHistory),
    journalActivity: safeArray(value?.journalActivity),
    voiceBips: safeArray(value?.voiceBips),
    comfortUsage: safeArray(value?.comfortUsage),
    streaks: {
      current: Math.max(0, Number(value?.streaks?.current) || 0),
      longest: Math.max(0, Number(value?.streaks?.longest) || 0),
      lastUpdated: value?.streaks?.lastUpdated || '',
    },
    recurringTopics: normalizeTopics(value?.recurringTopics || []),
    comfortWordHistory: Array.isArray(value?.comfortWordHistory) ? value.comfortWordHistory : [],
    deferredGoalHistory: Array.isArray(value?.deferredGoalHistory) ? value.deferredGoalHistory : [],
    winHistory: Array.isArray(value?.winHistory) ? value.winHistory : [],
  };
}

export async function loadSekretMemory(): Promise<SekretMemory> {
  try {
    const values = await AsyncStorage.multiGet([SEKRET_MEMORY_STORAGE_KEY, ...LEGACY_ACTIVITY_KEYS]);
    const byKey = Object.fromEntries(values);
    const stored = byKey[SEKRET_MEMORY_STORAGE_KEY]
      ? normalizeMemory(JSON.parse(byKey[SEKRET_MEMORY_STORAGE_KEY] as string) as Partial<SekretMemory>)
      : normalizeMemory(undefined);

    // Existing app activity remains canonical. We only copy compact metadata into companion memory.
    const legacyInput: CompanionActivityInput = {
      moodHistory: parseArray(byKey.moodHistory),
      journalEntries: parseArray(byKey.entries),
      voiceNotes: parseArray(byKey.voiceNotes),
      comfortSessions: parseArray(byKey.comfortSessions),
    };
    const legacy = activityFromInput(legacyInput);
    return {
      ...stored,
      moodHistory: mergeUnique(stored.moodHistory, legacy.moodHistory),
      journalActivity: mergeUnique(stored.journalActivity, legacy.journalActivity),
      voiceBips: mergeUnique(stored.voiceBips, legacy.voiceBips),
      comfortUsage: mergeUnique(stored.comfortUsage, legacy.comfortUsage),
      recurringTopics: normalizeTopics([...stored.recurringTopics, ...legacy.recurringTopics]),
    };
  } catch (error) {
    console.warn('Unable to load Sekret memory', error);
    return normalizeMemory(undefined);
  }
}

export async function saveSekretMemory(memory: SekretMemory): Promise<boolean> {
  try {
    await AsyncStorage.setItem(SEKRET_MEMORY_STORAGE_KEY, JSON.stringify(normalizeMemory(memory)));
    return true;
  } catch (error) {
    console.warn('Unable to save Sekret memory', error);
    return false;
  }
}

export async function updateSekretMemory(
  input: CompanionActivityInput,
  previous?: SekretMemory,
): Promise<SekretMemory> {
  const base = normalizeMemory(previous || await loadSekretMemory());
  const activity = activityFromInput(input);
  const now = new Date().toISOString();
  const currentStreak = Math.max(0, input.streakDays ?? base.streaks.current);
  const next: SekretMemory = {
    ...base,
    moodHistory: mergeUnique(base.moodHistory, activity.moodHistory),
    journalActivity: mergeUnique(base.journalActivity, activity.journalActivity),
    voiceBips: mergeUnique(base.voiceBips, activity.voiceBips),
    comfortUsage: mergeUnique(base.comfortUsage, activity.comfortUsage),
    streaks: {
      current: currentStreak,
      longest: Math.max(base.streaks.longest, currentStreak),
      lastUpdated: input.lastOpenDate || base.streaks.lastUpdated || now,
    },
    selectedPersonality: input.selectedSekret || base.selectedPersonality || 'soft',
    lastActiveAt: input.lastOpenDate || base.lastActiveAt || now,
    recurringTopics: normalizeTopics([...activity.recurringTopics, ...base.recurringTopics]),
    comfortWordHistory: [...base.comfortWordHistory, ...activity.comfortWordHistory].slice(-80),
    deferredGoalHistory: [...base.deferredGoalHistory, ...activity.deferredGoalHistory].slice(-40),
    winHistory: [...base.winHistory, ...activity.winHistory].slice(-100),
    lastUpdated: now,
  };
  await saveSekretMemory(next);
  return next;
}

export function summarizeSekretMemory(memory: SekretMemory): MemorySummary {
  const normalized = normalizeMemory(memory);
  const moods = normalized.moodHistory.map((entry) => entry.mood).filter(Boolean) as string[];
  const moodCounts = moods.reduce<Record<string, number>>((all, mood) => {
    all[mood] = (all[mood] || 0) + 1;
    return all;
  }, {});
  const recurringEmotions = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count > 1)
    .map(([mood]) => mood)
    .slice(0, 6);
  const comfortTools = normalizeTopics(normalized.comfortUsage.map((entry) => entry.type));
  const activityDates = new Set([
    ...normalized.moodHistory, ...normalized.journalActivity,
    ...normalized.voiceBips, ...normalized.comfortUsage,
  ].map((entry) => entry.date).filter(Boolean));

  // Comfort word pattern: most-used evasive word in recent 20 entries
  const recentComfort = normalized.comfortWordHistory.slice(-20);
  const comfortCounts: Record<string, number> = {};
  recentComfort.forEach(({ word }) => { comfortCounts[word] = (comfortCounts[word] || 0) + 1; });
  const topComfortEntry = Object.entries(comfortCounts).sort((a, b) => b[1] - a[1])[0];
  const comfortWordPattern = topComfortEntry && topComfortEntry[1] >= 3 ? topComfortEntry[0] : undefined;

  // Deferred goal: if same or similar phrase appears 2+ times across different dates
  const deferDates = new Set(normalized.deferredGoalHistory.map(e => e.date));
  const hasDeferredGoal = deferDates.size >= 2;

  // Recurring entity: topic word that appears 3+ times in journal text
  const topicFreq: Record<string, number> = {};
  normalized.journalActivity.forEach(j => {
    (j.topics || []).forEach((t: string) => { topicFreq[t] = (topicFreq[t] || 0) + 1; });
  });
  const topEntity = Object.entries(topicFreq).sort((a, b) => b[1] - a[1])[0];
  const recurringEntity = topEntity && topEntity[1] >= 3 ? topEntity[0] : undefined;

  // Win / growth tracking
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const recentWins = normalized.winHistory.filter(w => (w.date || '') >= thirtyDaysAgo);
  const proudMoodCount = recentWins.length;
  const winMoments = [...new Set(recentWins.map(w => w.mood))];

  // "You've picked Proud 3x this week" — detect meaningful winning-mood patterns
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const weekWins = normalized.winHistory.filter(w => (w.date || '') >= sevenDaysAgo);
  const topWinMood = weekWins.length > 0
    ? Object.entries(weekWins.reduce<Record<string, number>>((acc, w) => {
        acc[w.mood] = (acc[w.mood] || 0) + 1; return acc;
      }, {})).sort((a, b) => b[1] - a[1])[0]
    : null;
  const recentGrowth = topWinMood && topWinMood[1] >= 2
    ? `${topWinMood[1]}x ${topWinMood[0]} this week`
    : undefined;

  // Winning streak: consecutive days with any winning mood
  const winDates = new Set(normalized.winHistory.map(w => w.date).filter(Boolean));
  let winningStreak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (winDates.has(d.toISOString().slice(0, 10))) winningStreak++;
    else break;
  }

  return {
    favoriteMood: countMostCommon(moods, 'Thoughtful'),
    favoriteSekret: normalized.selectedPersonality || 'soft',
    commonTopics: normalized.recurringTopics,
    streakDays: normalized.streaks.current,
    lastCheckIn: normalized.lastCheckIn || '',
    comfortToolsUsed: comfortTools,
    recurringEmotions,
    recurringStruggles: normalized.recurringTopics.slice(0, 4),
    importantMilestones: [
      ...(normalized.streaks.longest >= 2 ? [`${normalized.streaks.longest}-day streak`] : []),
      ...(normalized.journalActivity.length ? ['first page written'] : []),
      ...(normalized.voiceBips.length ? ['first voice bip'] : []),
      ...(normalized.comfortUsage.length ? ['comfort found'] : []),
      ...(proudMoodCount >= 3 ? [`feeling proud ${proudMoodCount}x`] : []),
    ].slice(0, 5),
    daysActive: Math.max(activityDates.size, normalized.streaks.longest),
    conversations: normalized.moodHistory.length + normalized.journalActivity.length + normalized.voiceBips.length,
    journalsWritten: normalized.journalActivity.length,
    voiceBips: normalized.voiceBips.length,
    comfortActions: normalized.comfortUsage.length,
    comfortWordPattern,
    hasDeferredGoal,
    recurringEntity,
    winMoments,
    proudMoodCount,
    recentGrowth,
    winningStreak,
  };
}

/**
 * Bump the daily streak counter. Idempotent: calling multiple times on the
 * same day is a no-op. Call this on any meaningful user activity.
 */
export async function bumpStreak(): Promise<void> {
  try {
    const mem = await loadSekretMemory();
    const today     = new Date().toISOString().slice(0, 10);
    const lastDate  = mem.streaks.lastUpdated?.slice(0, 10) ?? '';
    if (lastDate === today) return;
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const next      = lastDate === yesterday ? mem.streaks.current + 1 : 1;
    const longest   = Math.max(mem.streaks.longest, next);
    const now       = new Date().toISOString();
    await saveSekretMemory({
      ...mem,
      streaks:     { current: next, longest, lastUpdated: now },
      lastUpdated: now,
    });
  } catch {
    // never surface — streak is a soft feature
  }
}

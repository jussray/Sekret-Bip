import type { CompanionActivityInput, CompanionCheckIn, MemorySummary } from '../types/sekretCompanion';
import type { SekretMemory } from './sekretMemory';
import { normalizeSekretPersonality, type SekretPersonality } from './sekretPresence';

const LOW_MOOD = /sad|heavy|angry|tired|anxious|stress|overwhelmed|awful|lonely|burned out/i;
const WINNING_MOOD = /happy|proud|motivated|confident|excited|accomplished|loved|connected|celebrating|glow.up/i;

type CheckInTrigger = 'low-mood' | 'repeated-emotion' | 'long-absence' | 'late-night' | 'winning-mood';

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysSince(value?: string): number {
  const date = parseDate(value);
  if (!date) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

const MESSAGES: Record<SekretPersonality, Record<CheckInTrigger, Omit<CompanionCheckIn, 'id'>>> = {
  suhana: {
    'low-mood': { message: 'dang. c’mere for a second.', tone: 'warm' },
    'repeated-emotion': { message: 'friend... yesterday was rough too. how we doing today?', tone: 'protective' },
    'long-absence': { message: 'there you are. no speech. what’s been going on?', tone: 'warm' },
    'late-night': { message: 'okay, it’s late. what’s keeping you up?', tone: 'gentle' },
    'winning-mood': { message: 'AS YOU SHOULD. tell me everything 😭', tone: 'warm' },
  },
  sy: {
    'low-mood': { message: 'damn. what actually happened?', tone: 'protective' },
    'repeated-emotion': { message: 'rough again? aight. talk to me.', tone: 'protective' },
    'long-absence': { message: 'you been quiet. no lecture. what’s up?', tone: 'warm' },
    'late-night': { message: 'still up? what’s on your mind?', tone: 'gentle' },
    'winning-mood': { message: 'nah, that’s actually huge. tell me.', tone: 'warm' },
  },
  cloud: {
    'low-mood': { message: 'that’s heavy. come sit for a sec.', tone: 'gentle' },
    'repeated-emotion': { message: 'yesterday was rough. no rush today.', tone: 'gentle' },
    'long-absence': { message: 'been a minute. come sit.', tone: 'warm' },
    'late-night': { message: 'the night got loud again?', tone: 'gentle' },
    'winning-mood': { message: 'there you are. hold onto this one.', tone: 'warm' },
  },
  night: {
    'low-mood': { message: 'yeah. stay here a minute.', tone: 'gentle' },
    'repeated-emotion': { message: 'rough again? one breath.', tone: 'gentle' },
    'long-absence': { message: 'been a while. stay a minute.', tone: 'warm' },
    'late-night': { message: 'rough night?', tone: 'gentle' },
    'winning-mood': { message: 'good night. hold onto that.', tone: 'warm' },
  },
};

function repeatedMood(summary: Partial<MemorySummary> | undefined, mood: string): boolean {
  return Boolean(summary?.recurringEmotions?.some((emotion) =>
    mood.toLowerCase().includes(emotion.toLowerCase()) || emotion.toLowerCase().includes(mood.toLowerCase()),
  ));
}

export function buildSekretCheckIn(
  summary: Partial<MemorySummary> | undefined,
  personality?: string,
  mood?: string,
  isLateNight?: boolean,
  input?: CompanionActivityInput,
  memory?: SekretMemory,
): CompanionCheckIn | null {
  const voice = normalizeSekretPersonality(personality);
  const currentMood = (mood || '').trim();
  const absentDays = daysSince(input?.lastOpenDate || memory?.lastActiveAt);

  let trigger: CheckInTrigger | null = null;
  if (LOW_MOOD.test(currentMood) && repeatedMood(summary, currentMood)) trigger = 'repeated-emotion';
  else if (LOW_MOOD.test(currentMood)) trigger = 'low-mood';
  else if (WINNING_MOOD.test(currentMood)) trigger = 'winning-mood';
  else if (absentDays >= 7) trigger = 'long-absence';
  else if (isLateNight) trigger = 'late-night';
  if (!trigger) return null;

  return { id: `${voice}-${trigger}`, ...MESSAGES[voice][trigger] };
}

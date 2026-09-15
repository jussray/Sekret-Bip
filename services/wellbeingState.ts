import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadSekretMemory,
  summarizeSekretMemory,
  type SekretMemory,
} from './sekretMemory';

/**
 * WellbeingStateV1 is a read model over the existing Se'kret memory store.
 * It deliberately does not create a second source of truth and never carries
 * diagnoses, disorders, risk scores, or clinical conclusions.
 */
export type WellbeingConfidence = 'emerging' | 'growing' | 'strong';
export type WellbeingObservationKind = 'mood-pattern' | 'context-pattern' | 'growth-pattern' | 'support-pattern';

export interface WellbeingObservationV1 {
  id: string;
  kind: WellbeingObservationKind;
  statement: string;
  confidence: WellbeingConfidence;
  evidenceCount: number;
  basis: 'explicit-user-records' | 'interaction-pattern';
  lastObservedAt?: string;
}

export interface WellbeingStateV1 {
  schema: 'sekret-wellbeing-state@v1';
  updatedAt: string;
  observations: WellbeingObservationV1[];
  dismissedObservationIds: string[];
}

type DismissedObservation = { id: string; dismissedAt: string };

const DISMISSED_STORAGE_KEY = 'sekret_wellbeing_dismissed_v1';
const MAX_DISMISSED = 100;
const MAX_PROVIDER_CONTEXT = 5;

function confidenceFor(count: number): WellbeingConfidence {
  if (count >= 4) return 'strong';
  if (count >= 2) return 'growing';
  return 'emerging';
}

function safeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'pattern';
}

function countMood(memory: SekretMemory, mood: string): number {
  const target = mood.toLowerCase();
  return memory.moodHistory.filter(entry => entry.mood?.toLowerCase() === target).length;
}

function countTopic(memory: SekretMemory, topic: string): number {
  const target = topic.toLowerCase();
  return memory.journalActivity.reduce((count, entry) => (
    count + ((entry.topics ?? []).some(value => value.toLowerCase() === target) ? 1 : 0)
  ), 0);
}

function countComfortTool(memory: SekretMemory, tool: string): number {
  const target = tool.toLowerCase();
  return memory.comfortUsage.filter(entry => entry.type?.toLowerCase() === target).length;
}

function latestDate(values: Array<string | undefined>): string | undefined {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1);
}

function deriveObservations(memory: SekretMemory): WellbeingObservationV1[] {
  const summary = summarizeSekretMemory(memory);
  const observations: WellbeingObservationV1[] = [];

  // Mood observations come only from moods the person explicitly logged.
  for (const mood of summary.recurringEmotions.slice(0, 2)) {
    const evidenceCount = countMood(memory, mood);
    if (evidenceCount < 2) continue;
    observations.push({
      id: `mood:${safeSlug(mood)}`,
      kind: 'mood-pattern',
      statement: `You have logged “${mood}” more than once.`,
      confidence: confidenceFor(evidenceCount),
      evidenceCount,
      basis: 'explicit-user-records',
      lastObservedAt: latestDate(memory.moodHistory.filter(entry => entry.mood?.toLowerCase() === mood.toLowerCase()).map(entry => entry.date)),
    });
  }

  // Topics describe surroundings/context, not what they mean psychologically.
  for (const topic of summary.commonTopics.slice(0, 3)) {
    const evidenceCount = countTopic(memory, topic);
    if (evidenceCount < 2) continue;
    observations.push({
      id: `context:${safeSlug(topic)}`,
      kind: 'context-pattern',
      statement: `“${topic}” keeps showing up in your reflections.`,
      confidence: confidenceFor(evidenceCount),
      evidenceCount,
      basis: 'interaction-pattern',
      lastObservedAt: latestDate(memory.journalActivity.filter(entry => (entry.topics ?? []).includes(topic)).map(entry => entry.date)),
    });
  }

  // Growth is retained only when the existing memory engine has repeated,
  // explicit positive evidence. It is not a score or a judgment.
  if (summary.recentGrowth && (summary.proudMoodCount ?? 0) > 0) {
    const evidenceCount = summary.proudMoodCount ?? 0;
    observations.push({
      id: 'growth:recent',
      kind: 'growth-pattern',
      statement: summary.recentGrowth,
      confidence: confidenceFor(evidenceCount),
      evidenceCount,
      basis: 'explicit-user-records',
      lastObservedAt: latestDate(memory.winHistory.map(entry => entry.date)),
    });
  }

  // Support-tool observations use actual tool usage only. They do not infer
  // why the tool was used or whether it “worked.”
  for (const tool of summary.comfortToolsUsed.slice(0, 2)) {
    const evidenceCount = countComfortTool(memory, tool);
    if (evidenceCount < 2) continue;
    observations.push({
      id: `support:${safeSlug(tool)}`,
      kind: 'support-pattern',
      statement: `You have come back to “${tool}” more than once.`,
      confidence: confidenceFor(evidenceCount),
      evidenceCount,
      basis: 'interaction-pattern',
      lastObservedAt: latestDate(memory.comfortUsage.filter(entry => entry.type?.toLowerCase() === tool.toLowerCase()).map(entry => entry.date)),
    });
  }

  return observations.slice(0, 8);
}

async function loadDismissed(): Promise<DismissedObservation[]> {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is DismissedObservation => Boolean(
      item && typeof item === 'object' && typeof item.id === 'string' && typeof item.dismissedAt === 'string'
    )).slice(-MAX_DISMISSED);
  } catch {
    return [];
  }
}

export function buildWellbeingState(
  memory: SekretMemory,
  dismissedObservationIds: readonly string[] = [],
): WellbeingStateV1 {
  const dismissed = new Set(dismissedObservationIds);
  return {
    schema: 'sekret-wellbeing-state@v1',
    updatedAt: memory.lastUpdated || new Date(0).toISOString(),
    observations: deriveObservations(memory).filter(observation => !dismissed.has(observation.id)),
    dismissedObservationIds: [...dismissed],
  };
}

export async function loadWellbeingState(): Promise<WellbeingStateV1> {
  const [memory, dismissed] = await Promise.all([loadSekretMemory(), loadDismissed()]);
  return buildWellbeingState(memory, dismissed.map(item => item.id));
}

/** User correction/rejection. This hides only the derived observation. */
export async function dismissWellbeingObservation(id: string): Promise<void> {
  if (!id.trim()) return;
  const current = await loadDismissed();
  const next = [
    ...current.filter(item => item.id !== id),
    { id, dismissedAt: new Date().toISOString() },
  ].slice(-MAX_DISMISSED);
  await AsyncStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(next));
}

/**
 * Bounded context for companion replies. This is descriptive, tentative, and
 * user-controlled. The raw Page or Voice transcript is never duplicated here.
 */
export function buildWellbeingContext(state: WellbeingStateV1): string[] {
  return state.observations.slice(0, MAX_PROVIDER_CONTEXT).map(observation =>
    `${observation.statement} [${observation.confidence}; ${observation.evidenceCount} observations]`
  );
}

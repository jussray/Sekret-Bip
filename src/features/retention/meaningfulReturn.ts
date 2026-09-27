import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '@/utils/supabase';
import type { ActivityEvent, ActivityEventType } from '@/features/activity/events';

export const MEANINGFUL_RETURN_STORAGE_KEY = 'sekretbip_meaningful_return_receipts_v1';
export const MEANINGFUL_RETURN_SEEN_KEY = 'sekretbip_meaningful_return_seen_v1';

export type MeaningfulCategory = 'understand' | 'express' | 'regulate' | 'connect' | 'grow';
export type ReturnStage = 'recognition' | 'understanding' | 'ownership';

export interface MeaningfulReturnReceipt {
  id: string;
  actionType: ActivityEventType;
  occurredAt: string;
  category: MeaningfulCategory;
  icon: string;
  label: string;
  acknowledgment: string;
  route: string;
}

export interface MeaningfulReturnSnapshot {
  activeDays8: number;
  activeDays30: number;
  meaningfulActions8: number;
  meaningfulActions30: number;
  categoryCounts: Record<MeaningfulCategory, number>;
  latest: MeaningfulReturnReceipt | null;
  isNew: boolean;
  stage: ReturnStage;
}

type ReceiptConfig = Omit<MeaningfulReturnReceipt, 'id' | 'actionType' | 'occurredAt'>;

const RECEIPTS: Partial<Record<ActivityEventType, ReceiptConfig>> = {
  mood_logged: {
    category: 'understand',
    icon: '💭',
    label: 'You checked in with yourself.',
    acknowledgment: 'Naming it counts. You do not have to solve the whole feeling today.',
    route: 'history',
  },
  journal_saved: {
    category: 'express',
    icon: '📓',
    label: 'You made room for the real version.',
    acknowledgment: 'That thought has somewhere private to live now. You do not have to carry it all at once.',
    route: 'pages',
  },
  voice_completed: {
    category: 'express',
    icon: '🎙️',
    label: 'You said it out loud.',
    acknowledgment: 'You did not need perfect words. Your voice was enough.',
    route: 'voiceBip',
  },
  comfort_completed: {
    category: 'regulate',
    icon: '🤍',
    label: 'You chose comfort when you needed it.',
    acknowledgment: 'Taking care of yourself is not avoiding the problem. It is making room to face it safely.',
    route: 'comfort',
  },
  breathe_completed: {
    category: 'regulate',
    icon: '🌬️',
    label: 'You gave your body a reset.',
    acknowledgment: 'A small reset is still real movement.',
    route: 'calm',
  },
  crew_checkin: {
    category: 'connect',
    icon: '🤝',
    label: 'You showed up for your people.',
    acknowledgment: 'Connection can be quiet. Showing up still matters.',
    route: 'circle',
  },
  circle_post: {
    category: 'connect',
    icon: '🌫️',
    label: 'You let something be seen safely.',
    acknowledgment: 'You shared without giving away your private identity.',
    route: 'circle',
  },
  circle_reaction: {
    category: 'connect',
    icon: '💜',
    label: 'You made somebody feel less alone.',
    acknowledgment: 'Support does not need a popularity score to matter.',
    route: 'circle',
  },
  goal_completed: {
    category: 'grow',
    icon: '🌱',
    label: 'You moved one thing forward.',
    acknowledgment: 'Progress can be small, uneven, and still yours.',
    route: 'growth',
  },
  bridge_shared: {
    category: 'connect',
    icon: '🌉',
    label: 'You reached out without giving up your whole private space.',
    acknowledgment: 'You chose what to share and what kind of support you needed. That is the point of Bridge.',
    route: 'bridge',
  },
  memory_reviewed: {
    category: 'understand',
    icon: '🌸',
    label: 'You looked back without judging yourself.',
    acknowledgment: 'Your history is information, not a grade.',
    route: 'memories',
  },
  bippin2_step_completed: {
    category: 'grow',
    icon: '⭐',
    label: 'You learned something about growing up.',
    acknowledgment: 'Knowing yourself better is real growth.',
    route: 'bippin2',
  },
};

const EMPTY_CATEGORY_COUNTS: Record<MeaningfulCategory, number> = {
  understand: 0,
  express: 0,
  regulate: 0,
  connect: 0,
  grow: 0,
};

function parseReceipts(raw: string | null): MeaningfulReturnReceipt[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function dayKey(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function withinDays(value: string, days: number): boolean {
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return false;
  return parsed >= Date.now() - days * 86_400_000;
}

function stageFor(activeDays8: number, activeDays30: number): ReturnStage {
  if (activeDays30 >= 6) return 'ownership';
  if (activeDays8 >= 3) return 'understanding';
  return 'recognition';
}

function buildReceipt(event: ActivityEvent): MeaningfulReturnReceipt | null {
  const config = RECEIPTS[event.type];
  if (!config) return null;

  return {
    id: `${event.type}:${event.occurredAt}`,
    actionType: event.type,
    occurredAt: event.occurredAt,
    category: config.category,
    icon: config.icon,
    label: config.label,
    acknowledgment: config.acknowledgment,
    route: event.meta?.route ?? config.route,
  };
}

export async function recordMeaningfulReturnReceipt(event: ActivityEvent): Promise<void> {
  const receipt = buildReceipt(event);
  if (!receipt) return;

  try {
    const existing = parseReceipts(await AsyncStorage.getItem(MEANINGFUL_RETURN_STORAGE_KEY));
    const next = [receipt, ...existing.filter(item => item.id !== receipt.id)].slice(0, 80);
    await AsyncStorage.setItem(MEANINGFUL_RETURN_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    if (__DEV__) console.warn('[retention] receipt write failed', error);
  }
}

async function fetchCloudSnapshot(): Promise<Partial<MeaningfulReturnSnapshot> | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc('get_meaningful_return_snapshot');
    if (error || !data || typeof data !== 'object') return null;
    const row = data as Record<string, unknown>;
    return {
      activeDays8: Number(row.active_days_8 ?? 0),
      activeDays30: Number(row.active_days_30 ?? 0),
      meaningfulActions8: Number(row.meaningful_actions_8 ?? 0),
      meaningfulActions30: Number(row.meaningful_actions_30 ?? 0),
    };
  } catch {
    return null;
  }
}

export async function loadMeaningfulReturnSnapshot(): Promise<MeaningfulReturnSnapshot> {
  const [receiptRaw, seenId, cloud] = await Promise.all([
    AsyncStorage.getItem(MEANINGFUL_RETURN_STORAGE_KEY).catch(() => null),
    AsyncStorage.getItem(MEANINGFUL_RETURN_SEEN_KEY).catch(() => null),
    fetchCloudSnapshot(),
  ]);

  const receipts = parseReceipts(receiptRaw).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const recent8 = receipts.filter(item => withinDays(item.occurredAt, 8));
  const recent30 = receipts.filter(item => withinDays(item.occurredAt, 30));
  const categoryCounts = { ...EMPTY_CATEGORY_COUNTS };

  for (const receipt of recent30) categoryCounts[receipt.category] += 1;

  const localActiveDays8 = new Set(recent8.map(item => dayKey(item.occurredAt)).filter(Boolean)).size;
  const localActiveDays30 = new Set(recent30.map(item => dayKey(item.occurredAt)).filter(Boolean)).size;
  const activeDays8 = Math.max(localActiveDays8, cloud?.activeDays8 ?? 0);
  const activeDays30 = Math.max(localActiveDays30, cloud?.activeDays30 ?? 0);
  const latest = receipts[0] ?? null;

  return {
    activeDays8,
    activeDays30,
    meaningfulActions8: Math.max(recent8.length, cloud?.meaningfulActions8 ?? 0),
    meaningfulActions30: Math.max(recent30.length, cloud?.meaningfulActions30 ?? 0),
    categoryCounts,
    latest,
    isNew: Boolean(latest && latest.id !== seenId),
    stage: stageFor(activeDays8, activeDays30),
  };
}

export async function markMeaningfulReturnSeen(receiptId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(MEANINGFUL_RETURN_SEEN_KEY, receiptId);
  } catch {
    // Recognition is optional. It must never block the Room.
  }
}

export async function clearMeaningfulReturnReceipts(): Promise<void> {
  await AsyncStorage.multiRemove([
    MEANINGFUL_RETURN_STORAGE_KEY,
    MEANINGFUL_RETURN_SEEN_KEY,
  ]);
}

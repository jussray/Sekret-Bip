import { getSupabase, TABLES } from './supabase';
import { syncTeenActivitySummary as syncStoredSummary } from './sync';

export interface PointsHistoryEntry {
  captured_at: string;
  total: number;
}

async function userId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data?.user?.id ?? null;
}

export async function fetchPointsHistory(days = 30): Promise<PointsHistoryEntry[]> {
  const sb = getSupabase();
  const id = await userId();
  if (!sb || !id) return [];
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await sb.from(TABLES.bipPoints)
    .select('captured_at, total')
    .eq('user_id', id)
    .gte('captured_at', since)
    .order('captured_at', { ascending: true });
  return (data ?? []) as PointsHistoryEntry[];
}

export async function syncTeenActivitySummary(input?: {
  streakDays: number;
  sessionCount: number;
  pointsTier: string;
}): Promise<void> {
  if (!input) return syncStoredSummary();
  const sb = getSupabase();
  const id = await userId();
  if (!sb || !id) return;
  await sb.from('teen_activity_summary').upsert({
    user_id: id,
    streak_days: input.streakDays,
    session_count: input.sessionCount,
    points_tier: input.pointsTier,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

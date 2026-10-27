import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase, TABLES } from '@/utils/supabase';
import type { DailyIntention } from './dailyIntentions';

const CACHE_PREFIX = 'sekretbip:daily-intentions:v1';

interface DailyIntentionRow {
  user_id: string;
  intention_date: string;
  position: number;
  label: string;
  category: DailyIntention['category'];
  source_kind: DailyIntention['sourceKind'];
  source_label: DailyIntention['sourceLabel'];
  companion_key: DailyIntention['companionKey'] | null;
  generation_version: DailyIntention['generationVersion'];
  completed: boolean;
  dismissed: boolean;
}

interface PermanentAccount {
  userId: string;
}

async function permanentAccount(): Promise<PermanentAccount | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const user = data.session?.user;
  if (!user || user.is_anonymous) return null;
  return { userId: user.id };
}

function cacheKey(date: string, owner: string): string {
  return `${CACHE_PREFIX}:${owner}:${date}`;
}

async function cacheOwner(): Promise<string> {
  try {
    const account = await permanentAccount();
    return account?.userId ?? 'local-device';
  } catch {
    return 'local-device';
  }
}

function mapRow(row: DailyIntentionRow): DailyIntention {
  return {
    position: Number(row.position),
    label: row.label,
    category: row.category,
    sourceKind: row.source_kind,
    sourceLabel: row.source_label,
    companionKey: row.companion_key ?? undefined,
    generationVersion: row.generation_version,
    completed: row.completed === true,
    dismissed: row.dismissed === true,
  };
}

function toRow(userId: string, date: string, item: DailyIntention): DailyIntentionRow {
  return {
    user_id: userId,
    intention_date: date,
    position: item.position,
    label: item.label.slice(0, 120),
    category: item.category,
    source_kind: item.sourceKind,
    source_label: item.sourceLabel,
    companion_key: item.companionKey ?? null,
    generation_version: item.generationVersion,
    completed: item.completed,
    dismissed: item.dismissed,
  };
}

async function readLocal(date: string, owner: string): Promise<DailyIntention[]> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(date, owner));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DailyIntention[];
    return Array.isArray(parsed)
      ? parsed.filter(item => typeof item?.label === 'string').slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

async function writeLocal(date: string, owner: string, items: DailyIntention[]): Promise<void> {
  await AsyncStorage.setItem(cacheKey(date, owner), JSON.stringify(items.slice(0, 5)));
}

/**
 * Loads only the signed-in owner's final checklist. The cloud row deliberately
 * contains no journal text, excerpt, companion reply, voice transcript, or parent summary.
 */
export async function loadDailyIntentions(date: string): Promise<DailyIntention[]> {
  let account: PermanentAccount | null = null;
  try {
    account = await permanentAccount();
  } catch {
    account = null;
  }

  const owner = account?.userId ?? 'local-device';
  const local = await readLocal(date, owner);
  const supabase = getSupabase();
  if (!supabase || !account) return local;

  const { data, error } = await supabase
    .from(TABLES.dailyIntentions)
    .select('user_id,intention_date,position,label,category,source_kind,source_label,companion_key,generation_version,completed,dismissed')
    .eq('user_id', account.userId)
    .eq('intention_date', date)
    .order('position', { ascending: true });

  if (error) return local;
  const cloud = (data ?? []).map(row => mapRow(row as DailyIntentionRow));
  if (cloud.length === 0) return local;

  await writeLocal(date, owner, cloud);
  return cloud;
}

export async function saveDailyIntentions(
  date: string,
  items: DailyIntention[],
): Promise<void> {
  const owner = await cacheOwner();
  await writeLocal(date, owner, items);

  const supabase = getSupabase();
  const account = await permanentAccount().catch(() => null);
  if (!supabase || !account || items.length === 0) return;

  const rows = items.map(item => ({
    ...toRow(account.userId, date, item),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from(TABLES.dailyIntentions)
    .upsert(rows, { onConflict: 'user_id,intention_date,position' });

  if (error) throw error;
}

export async function setDailyIntentionCompleted(
  date: string,
  position: number,
  completed: boolean,
): Promise<void> {
  const owner = await cacheOwner();
  const local = await readLocal(date, owner);
  await writeLocal(
    date,
    owner,
    local.map(item => item.position === position ? { ...item, completed } : item),
  );

  const supabase = getSupabase();
  const account = await permanentAccount().catch(() => null);
  if (!supabase || !account) return;

  const { error } = await supabase
    .from(TABLES.dailyIntentions)
    .update({ completed, updated_at: new Date().toISOString() })
    .eq('user_id', account.userId)
    .eq('intention_date', date)
    .eq('position', position);

  if (error) throw error;
}

export async function clearDailyIntentions(date: string): Promise<void> {
  const owner = await cacheOwner();
  await AsyncStorage.removeItem(cacheKey(date, owner));

  const supabase = getSupabase();
  const account = await permanentAccount().catch(() => null);
  if (!supabase || !account) return;

  const { error } = await supabase
    .from(TABLES.dailyIntentions)
    .delete()
    .eq('user_id', account.userId)
    .eq('intention_date', date);

  if (error) throw error;
}

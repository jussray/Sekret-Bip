import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '@/utils/supabase';

const TABLE = 'private_reopen_reminders';
const CACHE_PREFIX = 'sekretbip:reopen-reminders:v1';

export type ReopenReminderStatus = 'pending' | 'completed' | 'dismissed';

export interface ReopenReminder {
  id?: string;
  clientKey: string;
  label: string;
  surfaceAfter: string;
  status: ReopenReminderStatus;
  shownAt?: string;
  completedAt?: string;
  createdAt: string;
}

type ReminderRow = {
  id: string;
  client_key: string;
  label: string;
  surface_after: string;
  status: ReopenReminderStatus;
  shown_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type PermanentAccount = { userId: string };

async function permanentAccount(): Promise<PermanentAccount | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data.session?.user;
  if (!user || user.is_anonymous) return null;
  return { userId: user.id };
}

function makeClientKey(): string {
  return `reopen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function cacheKey(owner: string): string {
  return `${CACHE_PREFIX}:${owner}`;
}

async function cacheOwner(): Promise<string> {
  const account = await permanentAccount().catch(() => null);
  return account?.userId ?? 'local-device';
}

function parseLocalCache(raw: string): ReopenReminder[] | null {
  try {
    const parsed = JSON.parse(raw) as ReopenReminder[];
    return Array.isArray(parsed)
      ? parsed.filter(item => typeof item?.label === 'string' && typeof item?.clientKey === 'string').slice(0, 50)
      : [];
  } catch {
    return null;
  }
}

async function readLocal(owner: string): Promise<ReopenReminder[]> {
  const raw = await AsyncStorage.getItem(cacheKey(owner)).catch(() => null);
  if (!raw) return [];
  return parseLocalCache(raw) ?? [];
}

async function writeLocal(owner: string, items: ReopenReminder[]): Promise<void> {
  await AsyncStorage.setItem(cacheKey(owner), JSON.stringify(items.slice(0, 50)));
}

function mapRow(row: ReminderRow): ReopenReminder {
  return {
    id: row.id,
    clientKey: row.client_key,
    label: row.label,
    surfaceAfter: row.surface_after,
    status: row.status,
    shownAt: row.shown_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
  };
}

function mergeByClientKey(local: ReopenReminder[], cloud: ReopenReminder[]): ReopenReminder[] {
  const merged = new Map<string, ReopenReminder>();
  for (const item of local) merged.set(item.clientKey, item);
  for (const item of cloud) merged.set(item.clientKey, item);
  return [...merged.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-50);
}

async function syncLocalPending(owner: string, items: ReopenReminder[]): Promise<ReopenReminder[]> {
  const supabase = getSupabase();
  const account = await permanentAccount().catch(() => null);
  if (!supabase || !account) return items;

  const unsynced = items.filter(item => !item.id && item.status === 'pending');
  if (unsynced.length === 0) return items;

  const rows = unsynced.map(item => ({
    user_id: account.userId,
    client_key: item.clientKey,
    label: item.label.slice(0, 160),
    surface_after: item.surfaceAfter,
    status: 'pending' as const,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: 'user_id,client_key' })
    .select('id,client_key,label,surface_after,status,shown_at,completed_at,created_at');

  if (error || !data) return items;
  const synced = (data as ReminderRow[]).map(mapRow);
  const next = mergeByClientKey(items, synced);
  await writeLocal(owner, next);
  return next;
}

/**
 * Captures a private reminder locally first, then best-effort syncs it to the
 * signed-in permanent account. No parent, Circle, points, approval, or analytics path exists.
 */
export async function createReopenReminder(
  label: string,
  surfaceAfter = new Date().toISOString(),
): Promise<ReopenReminder> {
  const trimmed = label.trim().slice(0, 160);
  if (!trimmed) throw new Error('reminder_label_required');

  const owner = await cacheOwner();
  const local = await readLocal(owner);
  const reminder: ReopenReminder = {
    clientKey: makeClientKey(),
    label: trimmed,
    surfaceAfter,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const next = [...local, reminder].slice(-50);
  await writeLocal(owner, next);
  const synced = await syncLocalPending(owner, next).catch(() => next);
  return synced.find(item => item.clientKey === reminder.clientKey) ?? reminder;
}

export async function loadPendingReopenReminders(
  now = new Date().toISOString(),
): Promise<ReopenReminder[]> {
  const owner = await cacheOwner();
  let local = await readLocal(owner);
  local = await syncLocalPending(owner, local).catch(() => local);

  const supabase = getSupabase();
  const account = await permanentAccount().catch(() => null);
  if (supabase && account) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id,client_key,label,surface_after,status,shown_at,completed_at,created_at')
      .eq('user_id', account.userId)
      .eq('status', 'pending')
      .lte('surface_after', now)
      .order('created_at', { ascending: true })
      .limit(50);

    if (!error && data) {
      local = mergeByClientKey(local, (data as ReminderRow[]).map(mapRow));
      await writeLocal(owner, local);
    }
  }

  return local.filter(item => item.status === 'pending' && item.surfaceAfter <= now);
}

async function updateReminder(
  clientKey: string,
  patch: Partial<Pick<ReopenReminder, 'status' | 'shownAt' | 'completedAt'>>,
): Promise<void> {
  const owner = await cacheOwner();
  const local = await readLocal(owner);
  const next = local.map(item => item.clientKey === clientKey ? { ...item, ...patch } : item);
  await writeLocal(owner, next);

  const supabase = getSupabase();
  const account = await permanentAccount().catch(() => null);
  if (!supabase || !account) return;

  const dbPatch: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if (patch.status) dbPatch.status = patch.status;
  if (patch.shownAt !== undefined) dbPatch.shown_at = patch.shownAt ?? null;
  if (patch.completedAt !== undefined) dbPatch.completed_at = patch.completedAt ?? null;

  const { error } = await supabase
    .from(TABLE)
    .update(dbPatch)
    .eq('user_id', account.userId)
    .eq('client_key', clientKey);
  if (error) throw error;
}

export function markReopenReminderShown(clientKey: string): Promise<void> {
  return updateReminder(clientKey, { shownAt: new Date().toISOString() });
}

export function completeReopenReminder(clientKey: string): Promise<void> {
  const now = new Date().toISOString();
  return updateReminder(clientKey, { status: 'completed', completedAt: now });
}

export function dismissReopenReminder(clientKey: string): Promise<void> {
  return updateReminder(clientKey, { status: 'dismissed' });
}

/**
 * src/features/consent/consentLayer.ts
 *
 * Consent Layer — Phase 2D
 *
 * The teen's privacy is the default. Every item starts as 'private'.
 * Sharing requires an explicit, reversible teen action.
 */

import { getSupabase } from '@/utils/supabase';
import type { TeenShareVisibility } from '../../../types/privacy';

export type ConsentableTable = 'journal_entries' | 'mood_history';
export type VisibilityLevel = TeenShareVisibility;

export interface ConsentRecord {
  id: number;
  table: ConsentableTable;
  visibility: VisibilityLevel;
  updatedAt: string;
}

export type SharedReadFailure = 'service-unavailable' | 'query-failed';
export type SharedReadResult<T extends object> =
  | { ok: true; items: T[] }
  | { ok: false; items: []; reason: SharedReadFailure };

export async function setItemVisibility(
  table: ConsentableTable,
  itemId: number,
  level: VisibilityLevel,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb
      .from(table)
      .update({ visibility: level })
      .eq('user_id', user.id)
      .eq('id', itemId);
  } catch (e) {
    if (__DEV__) console.warn('[consent] setItemVisibility failed:', e);
  }
}

export async function revokeShare(
  table: ConsentableTable,
  itemId: number,
): Promise<void> {
  return setItemVisibility(table, itemId, 'private');
}

export async function getItemVisibility(
  table: ConsentableTable,
  itemId: number,
): Promise<VisibilityLevel> {
  const sb = getSupabase();
  if (!sb) return 'private';
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return 'private';
    const { data, error } = await sb
      .from(table)
      .select('visibility')
      .eq('user_id', user.id)
      .eq('id', itemId)
      .maybeSingle();
    if (error || !data) return 'private';
    return (data.visibility as VisibilityLevel) ?? 'private';
  } catch {
    return 'private';
  }
}

export async function getTeenSharedItems(
  table: ConsentableTable,
): Promise<Array<{ id: number; visibility: VisibilityLevel }>> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data, error } = await sb
      .from(table)
      .select('id, visibility')
      .eq('user_id', user.id)
      .neq('visibility', 'private');
    if (error || !data) return [];
    return data.map(r => ({ id: r.id as number, visibility: r.visibility as VisibilityLevel }));
  } catch {
    return [];
  }
}

/**
 * Error-aware parent read. Raw provider errors never leave this module; callers
 * receive only a bounded status so a failed read cannot masquerade as an empty
 * sharing history and cannot leak backend details into UI/logs.
 */
export async function pullSharedWithParentResult<T extends object>(
  table: ConsentableTable,
  teenUserId: string,
): Promise<SharedReadResult<T>> {
  const sb = getSupabase();
  if (!sb) return { ok: false, items: [], reason: 'service-unavailable' };
  try {
    const { data, error } = await sb
      .from(table)
      .select('*')
      .eq('user_id', teenUserId)
      .eq('visibility', 'shared_with_parent')
      .order('created_at', { ascending: false });
    if (error) return { ok: false, items: [], reason: 'query-failed' };
    return { ok: true, items: (data ?? []) as T[] };
  } catch {
    return { ok: false, items: [], reason: 'query-failed' };
  }
}

/**
 * Compatibility helper for existing callers that intentionally accept graceful
 * degradation. User-facing truth surfaces should prefer the Result variant.
 */
export async function pullSharedWithParent<T extends object>(
  table: ConsentableTable,
  teenUserId: string,
): Promise<T[]> {
  const result = await pullSharedWithParentResult<T>(table, teenUserId);
  return result.items;
}

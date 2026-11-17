/**
 * src/features/consent/consentLayer.ts
 *
 * Consent Layer — Phase 2D
 *
 * The teen's privacy is the default. Every item starts as 'private'.
 * Sharing requires an explicit, reversible teen action.
 *
 * Public surface:
 *   setItemVisibility()    — teen sets or changes visibility on one item
 *   revokeShare()          — shorthand to reset any item back to 'private'
 *   getItemVisibility()    — read current visibility for one item
 *   pullSharedWithParent() — parent side: fetch items the teen shared
 *
 * Tables supported: 'journal_entries' | 'mood_history'
 * (voice_notes, comfort_sessions, circle_posts have their own audience model)
 *
 * Security constraints:
 *   - Never throws — degraded gracefully if Supabase is unavailable
 *   - Only the teen can write their own visibility rows (RLS enforced server-side)
 *   - Parents read via a separate policy; they cannot modify visibility
 */

import { getSupabase } from '@/utils/supabase';
import type { TeenShareVisibility } from '../../../types/privacy';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Tables where item-level visibility is supported.
 * Mirrors the tables altered in 20260628_consent_visibility.sql.
 */
export type ConsentableTable = 'journal_entries' | 'mood_history';

export type VisibilityLevel = TeenShareVisibility;

export interface ConsentRecord {
  id: number;
  table: ConsentableTable;
  visibility: VisibilityLevel;
  /** ISO timestamp of the last visibility change */
  updatedAt: string;
}

// ── Teen-side writes ───────────────────────────────────────────────────────────

/**
 * Set visibility on one item. The teen calls this when they tap
 * "share with parent" (or choose any other visibility level).
 *
 * Writes a PATCH to the item's own row — the visibility column is the
 * canonical record of consent.  Fire-and-forget; never throws.
 */
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

/**
 * Revoke a previous share — resets the item to 'private'.
 * The parent loses access immediately on their next pull.
 */
export async function revokeShare(
  table: ConsentableTable,
  itemId: number,
): Promise<void> {
  return setItemVisibility(table, itemId, 'private');
}

// ── Teen-side reads ────────────────────────────────────────────────────────────

/**
 * Returns the current visibility level for one item.
 * Falls back to 'private' if the row or Supabase is unavailable.
 */
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

/**
 * Returns all items the teen has explicitly marked as shared with parent.
 * Used in the teen's own UI to show what a parent can currently see.
 */
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

// ── Parent-side reads ─────────────────────────────────────────────────────────

/**
 * Parent-side: fetch items a linked teen has shared.
 * Supabase RLS (20260628_consent_visibility.sql) ensures only
 * 'shared_with_parent' rows from an actively-linked teen are returned.
 *
 * `teenUserId` must be the linked teen's auth.uid.
 * Returns an empty array if the link is inactive, Supabase is down, or
 * the teen has not shared anything.
 */
export async function pullSharedWithParent<T extends object>(
  table: ConsentableTable,
  teenUserId: string,
): Promise<T[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from(table)
      .select('*')
      .eq('user_id', teenUserId)
      .eq('visibility', 'shared_with_parent')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as T[];
  } catch (e) {
    if (__DEV__) console.warn('[consent] pullSharedWithParent failed:', e);
    return [];
  }
}

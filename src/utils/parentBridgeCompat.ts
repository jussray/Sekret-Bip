import { sendBridgePushAlert } from '@/services/pushAlerts';
import {
  loadBridgeResponsePreference,
  type BridgeResponsePreference,
} from '@/features/bridge/responsePreference';
import { getSupabase } from './supabase';
import {
  generateInviteCode,
  redeemInviteCode,
  fetchLinkedTeenId as fetchLinkedTeenIdBase,
} from './parentLink';

async function uid(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function createParentLink(): Promise<string | null> {
  return generateInviteCode();
}

export async function redeemParentLink(code: string): Promise<'ok' | 'not_found' | 'error'> {
  try {
    return (await redeemInviteCode(code)) ? 'ok' : 'not_found';
  } catch {
    return 'error';
  }
}

export async function fetchLinkedTeenId(): Promise<string | null> {
  return fetchLinkedTeenIdBase();
}

export type { BridgeResponsePreference } from '@/features/bridge/responsePreference';

export interface BridgeSignal {
  id: number;
  share_type: string;
  conv_mode: string | null;
  response_preference: BridgeResponsePreference | null;
  char_key: string;
  sent_at: string;
  created_at: string;
}

export interface ParentNote {
  id: string;
  content: string;
  sent_at: string;
  seen_by_teen: boolean;
}

export type ParentNotesReadFailure =
  | 'service-unavailable'
  | 'not-authenticated'
  | 'query-failed';

export type ParentNotesReadResult =
  | { ok: true; notes: ParentNote[] }
  | { ok: false; notes: []; reason: ParentNotesReadFailure };

export interface ParentEngagement {
  notesSent: number;
  tipsRead: number;
  daysActive: number;
  bridgeUsed: boolean;
}

export async function sendBridgeSignal(params: {
  shareType: string;
  convMode: string | null;
  responsePreference?: BridgeResponsePreference | null;
  charKey: 'raylene' | 'rylane';
}): Promise<void> {
  const sb = getSupabase();
  const userId = await uid();
  if (!sb || !userId) return;

  const responsePreference = params.responsePreference ?? await loadBridgeResponsePreference();
  await sb.from('bridge_signals').insert({
    teen_user_id: userId,
    char_key: params.charKey,
    share_type: params.shareType,
    conv_mode: params.convMode ?? null,
    response_preference: responsePreference,
    sent_at: new Date().toISOString(),
  });
}

async function readParentNotes(
  ownerColumn: 'teen_user_id' | 'parent_user_id',
  limit: number,
): Promise<ParentNotesReadResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, notes: [], reason: 'service-unavailable' };

  const userId = await uid();
  if (!userId) return { ok: false, notes: [], reason: 'not-authenticated' };

  try {
    const { data, error } = await sb
      .from('parent_notes')
      .select('id, content, sent_at, seen_by_teen')
      .eq(ownerColumn, userId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) return { ok: false, notes: [], reason: 'query-failed' };
    return { ok: true, notes: (data ?? []) as ParentNote[] };
  } catch {
    return { ok: false, notes: [], reason: 'query-failed' };
  }
}

export async function fetchParentNotesResult(): Promise<ParentNotesReadResult> {
  return readParentNotes('teen_user_id', 20);
}

export async function fetchParentSentNotesResult(): Promise<ParentNotesReadResult> {
  return readParentNotes('parent_user_id', 30);
}

/**
 * Compatibility helper for call sites that only need rows. New user-facing
 * surfaces should prefer fetchParentNotesResult() so a failed read cannot be
 * presented as a truthful empty inbox.
 */
export async function fetchParentNotes(): Promise<ParentNote[]> {
  const result = await fetchParentNotesResult();
  return result.notes;
}

/**
 * Compatibility helper for call sites that only need rows. New user-facing
 * surfaces should prefer fetchParentSentNotesResult() so a failed read cannot
 * be presented as a truthful empty history.
 */
export async function fetchParentSentNotes(): Promise<ParentNote[]> {
  const result = await fetchParentSentNotesResult();
  return result.notes;
}

export async function markParentNoteSeen(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('parent_notes').update({ seen_by_teen: true }).eq('id', id);
}

export async function subscribeToParentNotes(
  onNew: (note: ParentNote) => void,
): Promise<() => void> {
  const sb = getSupabase();
  const userId = await uid();
  if (!sb || !userId) return () => {};
  const channel = sb.channel(`parent-notes-${userId}`).on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'parent_notes', filter: `teen_user_id=eq.${userId}` },
    payload => onNew(payload.new as ParentNote),
  ).subscribe();
  return () => { void sb.removeChannel(channel); };
}

export async function fetchBridgeSignals(teenId: string): Promise<BridgeSignal[]> {
  const sb = getSupabase();
  if (!sb || !teenId) return [];
  const { data } = await sb
    .from('bridge_signals')
    .select('id, share_type, conv_mode, response_preference, char_key, sent_at, created_at')
    .eq('teen_user_id', teenId)
    .order('sent_at', { ascending: false })
    .limit(30);
  return (data ?? []) as BridgeSignal[];
}

export async function sendParentNote(teenId: string, content: string): Promise<boolean> {
  const sb = getSupabase();
  const userId = await uid();
  if (!sb || !userId || !teenId || !content.trim()) return false;
  const { error } = await sb.from('parent_notes').insert({
    teen_user_id: teenId,
    parent_user_id: userId,
    content: content.trim(),
    sent_at: new Date().toISOString(),
  });

  if (error) return false;

  void sendBridgePushAlert({
    event: 'parent_bridge_reply',
    teenId,
  });

  return true;
}

export async function fetchParentEngagement(): Promise<ParentEngagement | null> {
  const sb = getSupabase();
  const userId = await uid();
  if (!sb || !userId) return null;
  const [notesRes, engagementRes] = await Promise.all([
    sb.from('parent_notes').select('id', { count: 'exact', head: true }).eq('parent_user_id', userId),
    sb.from('parent_engagement').select('*').eq('parent_user_id', userId).maybeSingle(),
  ]);
  return {
    notesSent: notesRes.count ?? 0,
    tipsRead: (engagementRes.data as any)?.tips_read ?? 0,
    daysActive: (engagementRes.data as any)?.days_active ?? 0,
    bridgeUsed: (engagementRes.data as any)?.bridge_used ?? false,
  };
}

export async function subscribeToBridgeSignals(
  teenId: string,
  onNew: (signal: BridgeSignal) => void,
): Promise<() => void> {
  const sb = getSupabase();
  if (!sb || !teenId) return () => {};
  const channel = sb.channel(`bridge-signals-${teenId}`).on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'bridge_signals', filter: `teen_user_id=eq.${teenId}` },
    payload => onNew(payload.new as BridgeSignal),
  ).subscribe();
  return () => { void sb.removeChannel(channel); };
}

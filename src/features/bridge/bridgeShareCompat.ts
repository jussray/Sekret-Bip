import { sendBridgePushAlert } from '@/services/pushAlerts';
import { getSupabase } from '@/utils/supabase';

export interface BridgeShare {
  id: number;
  user_id: string;
  payload: {
    kind?: string;
    raw?: string;
    text?: string;
    rewrite?: string;
    tone?: string;
    shareType?: string;
  };
  shared_at: string;
}

export type BridgeSharesReadResult =
  | { ok: true; shares: BridgeShare[] }
  | { ok: false; shares: []; reason: 'service-unavailable' | 'query-failed' };

async function currentUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.auth.getUser();
    if (error) return null;
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function sendS2TellShare(params: {
  raw?: string;
  text: string;
  tone?: string;
  shareType?: string;
}): Promise<boolean> {
  const sb = getSupabase();
  const userId = await currentUserId();
  if (!sb || !userId || !params.text.trim()) return false;

  try {
    const { error } = await sb.from('bridge_shares').insert({
      user_id: userId,
      id: Date.now(),
      payload: {
        kind: 's2tell',
        raw: params.raw ?? null,
        rewrite: params.text.trim(),
        tone: params.tone ?? null,
        shareType: params.shareType ?? null,
      },
      shared_at: new Date().toISOString(),
    });

    if (error) return false;

    void sendBridgePushAlert({ event: 'parent_bridge_share' });
    return true;
  } catch {
    return false;
  }
}

export async function fetchBridgeSharesResult(teenId: string): Promise<BridgeSharesReadResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, shares: [], reason: 'service-unavailable' };
  if (!teenId) return { ok: true, shares: [] };

  try {
    const { data, error } = await sb
      .from('bridge_shares')
      .select('id,user_id,payload,shared_at')
      .eq('user_id', teenId)
      .order('shared_at', { ascending: false })
      .limit(50);

    if (error) return { ok: false, shares: [], reason: 'query-failed' };
    return { ok: true, shares: (data ?? []) as BridgeShare[] };
  } catch {
    return { ok: false, shares: [], reason: 'query-failed' };
  }
}

/** Compatibility wrapper for legacy callers. Live Bridge surfaces use the result-aware API. */
export async function fetchBridgeShares(teenId: string): Promise<BridgeShare[]> {
  const result = await fetchBridgeSharesResult(teenId);
  return result.shares;
}

export async function subscribeToBridgeShares(
  teenId: string,
  onNew: (share: BridgeShare) => void,
): Promise<() => void> {
  const sb = getSupabase();
  if (!sb || !teenId) return () => {};
  const channel = sb.channel(`bridge-shares-${teenId}`).on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'bridge_shares', filter: `user_id=eq.${teenId}` },
    payload => onNew(payload.new as BridgeShare),
  ).subscribe();
  return () => { void sb.removeChannel(channel); };
}

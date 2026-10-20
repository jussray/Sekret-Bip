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
  };
  shared_at: string;
}

async function currentUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

export async function sendS2TellShare(params: {
  raw?: string;
  text: string;
  tone?: string;
}): Promise<boolean> {
  const sb = getSupabase();
  const userId = await currentUserId();
  if (!sb || !userId || !params.text.trim()) return false;

  const { error } = await sb.from('bridge_shares').insert({
    user_id: userId,
    id: Date.now(),
    payload: {
      kind: 's2tell',
      raw: params.raw ?? null,
      rewrite: params.text.trim(),
      tone: params.tone ?? null,
    },
    shared_at: new Date().toISOString(),
  });

  if (error) return false;

  void sendBridgePushAlert({ event: 'parent_bridge_share' });
  return true;
}

export async function fetchBridgeShares(teenId: string): Promise<BridgeShare[]> {
  const sb = getSupabase();
  if (!sb || !teenId) return [];
  const { data } = await sb
    .from('bridge_shares')
    .select('id,user_id,payload,shared_at')
    .eq('user_id', teenId)
    .order('shared_at', { ascending: false })
    .limit(50);
  return (data ?? []) as BridgeShare[];
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

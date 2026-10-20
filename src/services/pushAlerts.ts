import { getSupabase } from '@/utils/supabase';

type BridgePushEvent = 'parent_bridge_share' | 'parent_bridge_reply';

export async function sendBridgePushAlert(params: {
  event: BridgePushEvent;
  teenId?: string;
}): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.functions.invoke('send-push', {
    body: {
      event: params.event,
      teenId: params.teenId,
    },
  });

  if (error) {
    if (__DEV__) console.info('[push-alerts] send failed', error.message);
    return false;
  }

  return true;
}

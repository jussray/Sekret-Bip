import { getSupabase } from '@/utils/supabase';

/**
 * Fire-and-forget event logger → app_events table.
 * Silent no-op if user is not authenticated.
 */
export async function logEvent(
  event_type: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('app_events').insert({
      user_id: user.id,
      event_type,
      metadata,
    });
  } catch {
    // never let analytics crash the app
  }
}

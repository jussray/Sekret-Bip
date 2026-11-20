import { disableCurrentPushToken } from '@/services/pushTokenSync';
import { getSupabase } from '@/utils/supabase';

// Authentication canon (founder ruling, 2026-10-30): account authentication
// and anonymous participation are two completely separate systems.
// This service only ever resolves PERMANENT accounts — it never creates a
// session, and there is no anonymous-login path anywhere in the client.
// Anonymous participation lives in Circle (public identity), never in
// sign-in, and it never creates or replaces an account.
export async function getCurrentSessionUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const user = data.session?.user;
  if (!user || user.is_anonymous) return null;

  return user.id;
}

export async function endAuthenticatedSession(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');

  await disableCurrentPushToken();

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

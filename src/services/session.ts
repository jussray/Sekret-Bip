import { disableCurrentPushToken } from '@/services/pushTokenSync';
import { clearPrivateAccountCache } from '@/utils/storage';
import { getSupabase } from '@/utils/supabase';

export async function getCurrentSessionUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  return data.session?.user.id ?? null;
}

export async function ensureAnonymousSession(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const currentUserId = await getCurrentSessionUserId();
  if (currentUserId) return currentUserId;

  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;

  return signed.user?.id ?? null;
}

export async function endAuthenticatedSession(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');

  // Keep the authenticated context long enough to disable the account-owned
  // push token, then clear private device state before ending authentication.
  // If local removal fails, do not report a secure sign-out while old private
  // data is still readable by the next user of the device.
  await disableCurrentPushToken();
  await clearPrivateAccountCache();

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

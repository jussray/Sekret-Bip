import { clearProfileIdentityCache } from '@/features/identity/clearProfileIdentityCache';
import { consentService } from '@/services/consentService';
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

  // Keep authenticated authority long enough to disable the account-owned push
  // token. Then clear all existing identity/private caches before auth ends. A
  // failed clear stops the transition instead of leaving private data behind
  // for the next person using the device.
  await disableCurrentPushToken();
  await clearProfileIdentityCache();
  await clearPrivateAccountCache();
  consentService.reset();

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

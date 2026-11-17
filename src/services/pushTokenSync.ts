import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getSupabase } from '@/utils/supabase';
import { clearStoredExpoPushToken, getStoredExpoPushToken } from '@/services/notifications';

function getAppVariant(): 'teen' | 'parent' {
  return Constants.expoConfig?.extra?.appVariant === 'parent' ? 'parent' : 'teen';
}

export async function syncExpoPushToken(token: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || Platform.OS === 'web') return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc('claim_push_token', {
    p_expo_push_token: token,
    p_platform: Platform.OS,
    p_app_variant: getAppVariant(),
  });

  if (error) throw error;
}

export async function disableCurrentPushToken(): Promise<void> {
  const supabase = getSupabase();
  const token = await getStoredExpoPushToken();
  if (!token) return;
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase.rpc('disable_push_token', {
    p_expo_push_token: token,
  });
  if (error) throw error;

  await clearStoredExpoPushToken();
}

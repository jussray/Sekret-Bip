/**
 * utils/supabase/client.ts
 *
 * Browser / React Native client — uses SecureStore for secure session
 * persistence on native, AsyncStorage on web (Expo 51 + supabase-js 2.x).
 *
 * Usage:
 *   import { supabase } from '@/utils/supabase/client'
 *   const { data, error } = await supabase.from('mood_history').select()
 */
import 'react-native-url-polyfill/auto';
import { createClient as _createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ── env vars ──────────────────────────────────────────────────────────────────
// Expo uses EXPO_PUBLIC_* prefix (not NEXT_PUBLIC_*).
// These must exist in .env.local locally and in the deployment environment.
const env = process.env as Record<string, string | undefined>;
const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[supabase/client] Missing EXPO_PUBLIC_SUPABASE_URL and a Supabase client key.\n' +
    'Set EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) or EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

// ── SecureStore adapter (native) / AsyncStorage fallback (web) ───────────────
//
// supabase-js stores JWT tokens in localStorage on web and AsyncStorage on RN
// by default. Using SecureStore on native gives hardware-backed encryption.
// AsyncStorage fallback is used on web (SecureStore is unavailable there).
//
// Key length limit: SecureStore max key length is 256 bytes — supabase-js
// uses long keys like `sb-<project>-auth-token` which are well within limit.
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

// ── singleton client ──────────────────────────────────────────────────────────
export const supabase = _createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Must be false in React Native
  },
});

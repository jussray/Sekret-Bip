// utils/supabase.ts
// Se'kret Bip — Supabase client (scaffold for Phase 2)
//
// PHASE 1 (now): screen polish. Supabase is OPTIONAL — if env vars are
// missing, the exported client is a safe no-op so nothing crashes and
// every screen keeps working off AsyncStorage via utils/storage.ts.
//
// PHASE 2 (next): wire real journal / mood / circle / bridge / voice
// tables. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
// to .env.local (NEVER commit them — .env.local is gitignored).
//
// IMPORTANT: only use EXPO_PUBLIC_* env vars on the client. NEVER expose
// the service_role key on the device — that key stays server-side only.

import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL  = (process.env as Record<string, string | undefined>).EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = (process.env as Record<string, string | undefined>).EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON);

let _client: SupabaseClient | null = null;

/**
 * Returns the configured Supabase client, or null if env vars are missing.
 * Screen code should treat null as "offline mode" — fall back to AsyncStorage
 * via utils/storage.ts and continue without errors.
 *
 * Usage:
 *   const sb = getSupabase();
 *   if (!sb) return; // offline mode — skip cloud sync
 *   await sb.from('journal_entries').insert(payload);
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (_client) return _client;

  _client = createClient(SUPABASE_URL!, SUPABASE_ANON!, {
    auth: {
      storage:        AsyncStorage,
      autoRefreshToken: true,
      persistSession:   true,
      detectSessionInUrl: false, // RN / Expo — no URL session detection
    },
  });

  return _client;
}

// ── Table name constants ────────────────────────────────────────────────────
// Centralized so Phase 2 wiring touches one file when schema names change.
// These match the planned Supabase schema — do not rename without migrating.
export const TABLES = {
  accounts:         'accounts',
  journalEntries:   'journal_entries',
  moodHistory:      'mood_history',
  circlePosts:      'circle_posts',
  parentCirclePosts:'parent_circle_posts',
  voiceNotes:       'voice_notes',
  bridgeShares:     'bridge_shares',
  roomMemory:       'room_memory',
  periodDays:       'period_days',
  comfortSessions:  'comfort_sessions',
  crewMembers:      'crew_members',
  crewCheckIns:     'crew_check_ins',
  bipPoints:        'bip_points',
  parentTeenInvites:'parent_teen_invites',
  parentTeenLinks:  'parent_teen_links',
  teenGuardianShares:'teen_guardian_shares',
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];

// src/utils/supabase.ts
// Se'kret Bip — Supabase client
//
// Env vars are sourced from utils/env.ts (single source of truth).
// If SUPABASE_URL or SUPABASE_ANON are blank, getSupabase() returns null
// and every caller falls back gracefully to local AsyncStorage.
//
// IMPORTANT: only EXPO_PUBLIC_* vars are used here.
// NEVER reference service_role keys in client code.

import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON, isSupabaseReady } from '@/utils/env';

export const isSupabaseConfigured = isSupabaseReady;

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      storage:            AsyncStorage,
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: false,
    },
  });
  return _client;
}

export const TABLES = {
  // ── Private per-user tables (0001_init.sql) ─────────────────────────────
  journalEntries:     'journal_entries',
  moodHistory:        'mood_history',
  voiceNotes:         'voice_notes',
  bridgeShares:       'bridge_shares',
  roomMemory:         'room_memory',
  periodDays:         'period_days',
  comfortSessions:    'comfort_sessions',
  crewMembers:        'crew_members',
  crewCheckIns:       'crew_check_ins',
  bipPoints:          'bip_points',
  circlePosts:        'circle_posts',
  parentCirclePosts:  'parent_circle_posts',
  // ── Shared Circle V1 tables (0002_circle_v1.sql) ────────────────────────
  publicCirclePosts:   'public_circle_posts',
  friendsCirclePosts:  'friends_circle_posts',
  crewCirclePosts:     'crew_circle_posts',
  circleReactions:     'circle_reactions',
  circleProfiles:      'circle_profiles',
  circleFriendships:   'circle_friendships',
  crewMemberships:     'crew_memberships',
  // ── Supplemental tables (0003_supplemental_tables.sql) ──────────────────
  circles:             'circles',
  posts:               'posts',
  circleMembers:       'circle_members',
  parentLinks:         'parent_links',
  postReactions:       'post_reactions',
  postComments:        'post_comments',
  moods:               'moods',
  parentMoodSummaries: 'parent_mood_summaries',
  safetyAlerts:        'safety_alerts',
  crews:               'crews',
  friendships:         'friendships',
  // ── Oracle tables (0003_oracle_parentlinks_period_safety.sql) ───────────
  oracleSessions:      'oracle_sessions',
  // ── Bridge tables (20260618 + 20260621 migrations) ───────────────────────
  bridgeSignals:       'bridge_signals',
  parentNotes:         'parent_notes',
  circleReplies:       'circle_replies',
  // ── Parent repair + voice reflection (20261117 migration) ───────────────
  parentRepairWins:       'parent_repair_wins',
  parentVoiceReflections: 'parent_voice_reflections',
  // ── S2Tell cross-device delivery (20261117 migration) ───────────────────
  s2tellShares:           's2tell_shares',
  // Growth milestones (20261117 migration)
  growthMilestones:       'growth_milestones',
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];

// Legacy nullable singleton export for older screens. Prefer getSupabase() in new code.
export const supabase = getSupabase();

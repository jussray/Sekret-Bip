// src/utils/sync.ts
// Se'kret Bip — Cloud sync layer (Phase 2 + Phase 3 backend)
//
// All cloud writes go through here. Every helper is a SAFE NO-OP when
// Supabase isn't configured — the app keeps working off AsyncStorage, no
// errors thrown. This lets us ship the UI now and add credentials later.
//
// Auth model: each row is scoped to auth.uid() via RLS. If there's no
// signed-in user yet, writes are silently skipped (kept locally only).
// ensureAnonymousSession() is called from useAppEffects on mount.
//
// IMPORTANT: never throw. The user's local experience must never break
// because the cloud is down. Errors are logged and swallowed.

import { getSupabase, TABLES } from './supabase';
import { ensureAnonymousSession as startAnonymousSession, getCurrentSessionUserId } from '@/services/session';
import { loadState } from './storage';
import { emitEvent } from '@/features/activity/events';
import type {
  JournalEntry, MoodEntry, CirclePost, ParentCirclePost, VoiceNote,
  ComfortSession, CrewMember, CrewCheckIn,
} from '../types/index';
import type {
  CircleTab,
  PublicCirclePost,
  FriendsCirclePost,
  CrewCirclePost,
  ParentCirclePost as CircleParentPost,
} from '../../types/circle';


type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type SyncRow = Record<string, JsonValue | undefined>;
type ReactionCounts = Record<string, number>;
const EMPTY_PARENT_REACTIONS: ReactionCounts = {
  beenThere: 0, solidarity: 0, reminder: 0, needed: 0, strength: 0,
};
function compactReactions(reactions: Record<string, number | undefined> | undefined): ReactionCounts {
  if (!reactions) return {};
  return Object.fromEntries(
    Object.entries(reactions).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
  );
}
type SupabaseErrorLike = { message?: string; code?: string };
type SupabaseDataResult<T> = { data: T | null; error: SupabaseErrorLike | null };
type ParentCirclePostRow = {
  id: number; text: string; date: string; time: string;
  reactions: ReactionCounts | null; circle_tag: string | null;
};
type PublicCirclePostRow = {
  id: string | number; text: string; post_mood: string | null; media_kind: string | null;
  reactions: ReactionCounts | null; created_at: string;
};
type SharedCirclePostRow = PublicCirclePostRow & { user_id: string };
type CircleProfileRow = { user_id: string; nickname: string; avatar_emoji: string };
type RoomMemoryRow = {
  character: string; last_visit: string | null; last_hotspot: string | null;
  last_summon: string | null; visit_count: number | null;
};
type MoodHistoryRow = Pick<MoodEntry, 'id' | 'mood' | 'date' | 'time'>;
type JournalEntryRow = Pick<JournalEntry, 'id' | 'text' | 'mood' | 'date' | 'time'> & { sekret_reply: string | null };
type CirclePostRow = Pick<CirclePost, 'id' | 'text' | 'date' | 'time' | 'reactions'> & { circle_tag: string | null; post_mood: string | null; media_kind: string | null };
type VoiceNoteRow = Pick<VoiceNote, 'id' | 'title' | 'date' | 'time' | 'duration'>;
type ComfortSessionRow = Pick<ComfortSession, 'id' | 'type' | 'date' | 'time'> & { mood: string | null };
type CrewMemberRow = Pick<CrewMember, 'id' | 'name' | 'emoji' | 'commitment' | 'cadence'> & {
  invite_code: string | null | undefined; added_at: string | null;
};
type CrewCheckInRow = {
  id: number; member_id: string | number; note: string | undefined;
  mood: string | null; date: string; time: string;
};

// ── Internal helpers ──────────────────────────────────────────────
async function currentUserId(): Promise<string | null> {
  try {
    return await getCurrentSessionUserId();
  } catch {
    return null;
  }
}

async function safeUpsert(table: string, payload: SyncRow | SyncRow[]): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  try {
    const rows = Array.isArray(payload) ? payload : [payload];
    const withUser = rows.map(r => ({ ...r, user_id: uid }));
    const { error } = await sb.from(table).upsert(withUser, { onConflict: 'id,user_id' });
    if (error) {
      console.warn('[sync] safeUpsert failed:', error.message, error.code);
    }
  } catch (e) {
    if (__DEV__) console.warn(`[sync] upsert ${table} failed`, e);
  }
}

async function safeDelete(table: string, id: number | string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  try {
    const { error } = await sb.from(table).delete().match({ id, user_id: uid });
    if (error) {
      console.warn('[sync] safeDelete failed:', error.message, error.code);
    }
  } catch (e) {
    if (__DEV__) console.warn(`[sync] delete ${table} failed`, e);
  }
}

// ── Anonymous sign-in ────────────────────────────────────────────
export async function ensureAnonymousSession(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const uid = await startAnonymousSession();
    if (uid) return uid;
    return null;
  } catch (e) {
    if (__DEV__) console.warn('[sync] ensureAnonymousSession threw', e);
    return null;
  }
}

// ── Mood ───────────────────────────────────────────────────────────
export function syncMood(entry: MoodEntry): void {
  emitEvent('mood_logged', { mood: entry.mood });
  void safeUpsert(TABLES.moodHistory, {
    id:   entry.id,
    mood: entry.mood,
    date: entry.date,
    time: entry.time,
  });
}

// ── Journal ─────────────────────────────────────────────────────────
export function syncJournal(entry: JournalEntry): void {
  emitEvent('journal_saved', {
    mood:      entry.mood,
    wordCount: entry.text ? entry.text.trim().split(/\s+/).filter(Boolean).length : 0,
  });
  void safeUpsert(TABLES.journalEntries, {
    id:           entry.id,
    text:         entry.text,
    mood:         entry.mood,
    date:         entry.date,
    time:         entry.time,
    sekret_reply: entry.sekretReply ?? null,
  });
}

// ── Circle (legacy drain path) ───────────────────────────────────────
export function syncCirclePost(post: CirclePost): void {
  void safeUpsert(TABLES.circlePosts, {
    id:         post.id,
    text:       post.text,
    date:       post.date,
    time:       post.time,
    reactions:  compactReactions(post.reactions),
    circle_tag: post.circleTag ?? null,
    post_mood:  post.postMood  ?? null,
    media_kind: post.mediaKind ?? null,
  });
}

export function syncParentCirclePost(post: ParentCirclePost): void {
  void safeUpsert(TABLES.parentCirclePosts, {
    id:         post.id,
    text:       post.text,
    date:       post.date,
    time:       post.time,
    reactions:  compactReactions(post.reactions),
    circle_tag: post.circleTag ?? null,
  });
}

// ── Parent Circle: personal post history ────────────────────────────────────
export async function loadParentCircleFeed(
  limit = 50,
): Promise<ParentCirclePost[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const uid = await currentUserId();
  if (!uid) return [];
  try {
    const { data, error } = await sb
      .from(TABLES.parentCirclePosts)
      .select('id, text, date, time, reactions, circle_tag')
      .eq('user_id', uid)
      .order('id', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: ParentCirclePostRow) => ({
      id:        r.id,
      text:      r.text,
      date:      r.date,
      time:      r.time,
      reactions: r.reactions ?? EMPTY_PARENT_REACTIONS,
      circleTag: r.circle_tag ?? undefined,
    })) as ParentCirclePost[];
  } catch (e) {
    if (__DEV__) console.warn('[sync] loadParentCircleFeed failed', e);
    return [];
  }
}

// ── Circle V1: Live feed reads ────────────────────────────────────────────────
export async function loadCircleFeed(
  tab: CircleTab,
  limit = 30,
): Promise<PublicCirclePost[] | FriendsCirclePost[] | CrewCirclePost[] | CircleParentPost[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    if (tab === 'public') {
      const { data, error } = await sb
        .from(TABLES.publicCirclePosts)
        .select('id, text, post_mood, media_kind, reactions, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((r: PublicCirclePostRow) => ({
        id: r.id, text: r.text, post_mood: r.post_mood ?? null,
        media_kind: r.media_kind ?? null, reactions: r.reactions ?? {},
        created_at: r.created_at,
      })) as PublicCirclePost[];
    }
    if (tab === 'friends' || tab === 'crew') {
      const table = tab === 'friends' ? TABLES.friendsCirclePosts : TABLES.crewCirclePosts;
      const { data: posts, error } = await sb
        .from(table)
        .select('id, user_id, text, post_mood, media_kind, reactions, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = posts ?? [];
      let profileMap: Record<string, { nickname: string; avatar_emoji: string }> = {};
      const userIds = [...new Set(rows.map((r: SharedCirclePostRow) => r.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await sb
          .from(TABLES.circleProfiles)
          .select('user_id, nickname, avatar_emoji')
          .in('user_id', userIds);
        profileMap = Object.fromEntries(
          (profiles ?? []).map((p: CircleProfileRow) => [p.user_id, { nickname: p.nickname, avatar_emoji: p.avatar_emoji }]),
        );
      }
      return rows.map((r: SharedCirclePostRow) => ({
        id: r.id, user_id: r.user_id,
        nickname:     profileMap[r.user_id]?.nickname     ?? 'Anonymous',
        avatar_emoji: profileMap[r.user_id]?.avatar_emoji ?? '🌙',
        text: r.text, post_mood: r.post_mood ?? null,
        media_kind: r.media_kind ?? null, reactions: r.reactions ?? {},
        created_at: r.created_at,
      })) as FriendsCirclePost[] | CrewCirclePost[];
    }
    if (tab === 'parent') {
      const { data, error } = await sb
        .from(TABLES.parentCirclePosts)
        .select('id, text, reactions, circle_tag, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((r: Pick<ParentCirclePostRow, 'id' | 'text' | 'reactions' | 'circle_tag'> & { created_at: string }) => ({
        id:               r.id,
        user_id:          '',
        text:             r.text,
        reactions:        r.reactions ?? EMPTY_PARENT_REACTIONS,
        circle_tag:       r.circle_tag ?? null,
        created_at:       r.created_at,
        identity_revealed: false,
      })) as CircleParentPost[];
    }
    return null;
  } catch (e) {
    if (__DEV__) console.warn(`[sync] loadCircleFeed(${tab}) failed`, e);
    return null;
  }
}

// ── Circle V1: Reaction sync ──────────────────────────────────────────────────
export async function syncCircleReaction(
  postId: string | number,
  tabOrReaction: string,
  reaction?: string,
): Promise<void> {
  const postType = reaction != null ? tabOrReaction : 'public';
  const emoji    = reaction ?? tabOrReaction;
  emitEvent('circle_reaction', { reactionKey: emoji });
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  try {
    const { error } = await sb
      .from(TABLES.circleReactions)
      .upsert(
        { post_id: postId, post_type: postType, user_id: uid, emoji },
        { onConflict: 'post_id,post_type,user_id', ignoreDuplicates: true },
      );
    if (error) {
      console.warn('[sync] syncCircleReaction failed:', error.message, error.code);
    }
  } catch (e) {
    if (__DEV__) console.warn('[sync] syncCircleReaction failed', e);
  }
}

// ── Circle V1: Post write ───────────────────────────────────────────────
export async function writeCirclePost(
  tab: CircleTab,
  text: string,
  opts: { postMood?: string; circleTag?: string; mediaKind?: string; revealIdentity?: boolean } = {},
): Promise<void> {
  emitEvent('circle_post');
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  const tableMap: Record<CircleTab, string> = {
    public:  TABLES.publicCirclePosts,
    friends: TABLES.friendsCirclePosts,
    crew:    TABLES.crewCirclePosts,
    parent:  TABLES.parentCirclePosts,
  };
  const tableName = tableMap[tab];
  const defaultReactions = tab === 'parent'
    ? { beenThere: 0, solidarity: 0, reminder: 0, needed: 0, strength: 0 }
    : { felt: 0, comfort: 0, proud: 0, stay: 0 };
  try {
    const { error } = await sb.from(tableName).insert({
      user_id:    uid,
      text,
      post_mood:  opts.postMood  ?? null,
      media_kind: opts.mediaKind ?? null,
      circle_tag: opts.circleTag ?? null,
      reactions:  defaultReactions,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[sync] writeCirclePost failed:', error.message, error.code);
    }
  } catch (e) {
    if (__DEV__) console.warn(`[sync] writeCirclePost(${tab}) failed`, e);
  }
}

// ── Voice ─────────────────────────────────────────────────────────────
export function syncVoiceNote(note: VoiceNote): void {
  emitEvent('voice_completed', { durationSecs: note.duration ? Number(note.duration) : undefined });
  void safeUpsert(TABLES.voiceNotes, {
    id: note.id, title: note.title, date: note.date,
    time: note.time, duration: note.duration,
  });
}

// ── Comfort sessions ─────────────────────────────────────────────────────
export function syncComfortSession(session: ComfortSession): void {
  emitEvent(session.type === 'breathe' ? 'breathe_completed' : 'comfort_completed');
  void safeUpsert(TABLES.comfortSessions, {
    id: session.id, type: session.type,
    mood: session.mood ?? null, date: session.date, time: session.time,
  });
}

// ── Crew ─────────────────────────────────────────────────────────────
export function syncCrewMember(m: CrewMember): void {
  void safeUpsert(TABLES.crewMembers, {
    id: m.id, name: m.name, emoji: m.emoji,
    commitment: m.commitment, cadence: m.cadence,
    invite_code: m.inviteCode, added_at: m.addedAt ? new Date(m.addedAt).toISOString() : null,
  });
}

export function deleteCrewMember(id: number | string): void {
  void safeDelete(TABLES.crewMembers, id);
}

export function syncCrewCheckIn(c: CrewCheckIn): void {
  emitEvent('crew_checkin');
  void safeUpsert(TABLES.crewCheckIns, {
    id: c.id, member_id: c.memberId, note: c.note,
    mood: c.mood ?? null, date: c.date, time: c.time,
  });
}

// ── Room memory ───────────────────────────────────────────────────────────────
export async function syncRoomMemory(rm: {
  character: string; lastVisit: string; lastHotspot: string;
  lastSummon: string; visitCount: number;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  try {
    const { error } = await sb.from(TABLES.roomMemory).upsert(
      {
        user_id:      uid,
        character:    rm.character,
        last_visit:   rm.lastVisit    || null,
        last_hotspot: rm.lastHotspot  || null,
        last_summon:  rm.lastSummon   || null,
        visit_count:  rm.visitCount,
        updated_at:   new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) {
      console.warn('[sync] syncRoomMemory failed:', error.message, error.code);
    }
  } catch (e) {
    if (__DEV__) console.warn('[sync] syncRoomMemory failed', e);
  }
}

// ── Points snapshot ───────────────────────────────────────────────────────────
export async function snapshotPoints(total: number): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  try {
    const { error } = await sb.from(TABLES.bipPoints).insert({
      user_id: uid, total, captured_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[sync] snapshotPoints failed:', error.message, error.code);
    }
  } catch (e) {
    if (__DEV__) console.warn('[sync] snapshotPoints failed', e);
  }
}

// ── Period calendar ──────────────────────────────────────────────────────

/** Upsert a single period day (ISO date string, e.g. '2026-06-17'). */
export async function syncPeriodDay(day: string, note?: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  try {
    const { error } = await sb.from(TABLES.periodDays).upsert(
      { user_id: uid, day, note: note ?? null },
      { onConflict: 'user_id,day' },
    );
    if (error) {
      console.warn('[sync] syncPeriodDay failed:', error.message, error.code);
    }
  } catch (e) {
    if (__DEV__) console.warn('[sync] syncPeriodDay failed', e);
  }
}

/** Remove a period day (un-mark). */
export async function deletePeriodDay(day: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  try {
    const { error } = await sb.from(TABLES.periodDays).delete().match({ user_id: uid, day });
    if (error) {
      console.warn('[sync] deletePeriodDay failed:', error.message, error.code);
    }
  } catch (e) {
    if (__DEV__) console.warn('[sync] deletePeriodDay failed', e);
  }
}

/** Pull all period days from cloud. Returns array of ISO date strings. */
export async function loadPeriodDays(): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const uid = await currentUserId();
  if (!uid) return [];
  try {
    const { data, error } = await sb
      .from(TABLES.periodDays)
      .select('day')
      .eq('user_id', uid)
      .order('day', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r: { day: string }) => r.day);
  } catch (e) {
    if (__DEV__) console.warn('[sync] loadPeriodDays failed', e);
    return [];
  }
}

// ── Oracle / companion memory ───────────────────────────────────────────────

export async function syncOracleSession(
  personalityId: string,
  memory: Record<string, unknown>,
  sessionCount: number,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  try {
    const { error } = await sb.from(TABLES.oracleSessions).upsert(
      {
        user_id:        uid,
        personality_id: personalityId,
        memory,
        session_count:  sessionCount,
        last_synced:    new Date().toISOString(),
      },
      { onConflict: 'user_id,personality_id' },
    );
    if (error) {
      console.warn('[sync] syncOracleSession failed:', error.message, error.code);
    }
  } catch (e) {
    if (__DEV__) console.warn('[sync] syncOracleSession failed', e);
  }
}

export async function loadOracleSession(
  personalityId: string,
): Promise<{ memory: Record<string, unknown>; sessionCount: number } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const uid = await currentUserId();
  if (!uid) return null;
  try {
    const { data, error } = await sb
      .from(TABLES.oracleSessions)
      .select('memory, session_count')
      .eq('user_id', uid)
      .eq('personality_id', personalityId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      memory:       (data.memory) ?? {},
      sessionCount: (data.session_count) ?? 0,
    };
  } catch (e) {
    if (__DEV__) console.warn('[sync] loadOracleSession failed', e);
    return null;
  }
}

// ── Teen activity summary — parent-facing snapshot ─────────────────────────

export interface TeenActivitySummary {
  streak_days: number;
  session_count: number;
  points_tier: string;
}

function deriveTier(sessionCount: number): string {
  if (sessionCount >= 50) return 't4';
  if (sessionCount >= 25) return 't3';
  if (sessionCount >= 10) return 't2';
  if (sessionCount >= 3)  return 't1';
  return 't0';
}

export async function syncTeenActivitySummary(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  try {
    const state = await loadState();
    const streakDays: number = parseInt(state.streakDays ?? '0', 10) || 0;
    const comfortSessions: ComfortSession[] = Array.isArray(state.comfortSessions)
      ? state.comfortSessions
      : [];
    const sessionCount = comfortSessions.length;
    const pointsTier = deriveTier(sessionCount);

    const { error } = await sb.from('teen_activity_summary').upsert(
      {
        user_id:       uid,
        streak_days:   streakDays,
        session_count: sessionCount,
        points_tier:   pointsTier,
        last_active_at: new Date().toISOString(),
        updated_at:    new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (error) {
      console.warn('[sync] syncTeenActivitySummary failed:', error.message, error.code);
    }
  } catch (e) {
    if (__DEV__) console.warn('[sync] syncTeenActivitySummary failed', e);
  }
}

export function initTeenActivitySync(): () => void {
  void syncTeenActivitySummary();
  const interval = setInterval(() => {
    void syncTeenActivitySummary();
  }, 10 * 60 * 1000);
  return () => clearInterval(interval);
}

export async function fetchTeenActivitySummary(
  teenId: string,
): Promise<TeenActivitySummary | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('parent_teen_activity_snapshot')
      .select('streak_days, session_count, points_tier')
      .eq('user_id', teenId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      streak_days:   data.streak_days,
      session_count: data.session_count,
      points_tier:   data.points_tier,
    };
  } catch (e) {
    if (__DEV__) console.warn('[sync] fetchTeenActivitySummary failed', e);
    return null;
  }
}

// ── Bulk pull ──────────────────────────────────────────────────────────────

export async function pullAll(): Promise<{
  moodHistory:       MoodEntry[];
  journalEntries:    JournalEntry[];
  circlePosts:       CirclePost[];
  voiceNotes:        VoiceNote[];
  comfortSessions:   ComfortSession[];
  crewMembers:       CrewMember[];
  crewCheckIns:      CrewCheckIn[];
  parentCirclePosts: ParentCirclePost[];
  roomMemory: {
    character: string; lastVisit: string; lastHotspot: string;
    lastSummon: string; visitCount: number;
  } | null;
} | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const uid = await currentUserId();
  if (!uid) return null;

  try {
    const [
      moodRes, journalRes, circleRes, voiceRes, comfortRes,
      crewMemberRes, crewCheckInRes, parentCircleRes, roomRes,
    ] = await Promise.allSettled([
      sb.from(TABLES.moodHistory).select('id, mood, date, time').eq('user_id', uid).order('id'),
      sb.from(TABLES.journalEntries).select('id, text, mood, date, time, sekret_reply').eq('user_id', uid).order('id'),
      sb.from(TABLES.circlePosts).select('id, text, date, time, reactions, circle_tag, post_mood, media_kind').eq('user_id', uid).order('id'),
      sb.from(TABLES.voiceNotes).select('id, title, date, time, duration').eq('user_id', uid).order('id'),
      sb.from(TABLES.comfortSessions).select('id, type, mood, date, time').eq('user_id', uid).order('id'),
      sb.from(TABLES.crewMembers).select('id, name, emoji, commitment, cadence, invite_code, added_at').eq('user_id', uid),
      sb.from(TABLES.crewCheckIns).select('id, member_id, note, mood, date, time').eq('user_id', uid).order('id'),
      sb.from(TABLES.parentCirclePosts).select('id, text, date, time, reactions, circle_tag').eq('user_id', uid).order('id'),
      sb.from(TABLES.roomMemory).select('character, last_visit, last_hotspot, last_summon, visit_count').eq('user_id', uid).maybeSingle(),
    ]);

    function settled<T>(res: PromiseSettledResult<SupabaseDataResult<T>>): T | null {
      if (res.status === 'rejected') return null;
      if (res.value.error) { console.warn('[sync] pullAll partial error:', res.value.error.message); return null; }
      return res.value.data;
    }

    const moods       = settled<MoodHistoryRow[]>(moodRes as PromiseSettledResult<SupabaseDataResult<MoodHistoryRow[]>>)         ?? [];
    const journals    = settled<JournalEntryRow[]>(journalRes as PromiseSettledResult<SupabaseDataResult<JournalEntryRow[]>>)      ?? [];
    const circles     = settled<CirclePostRow[]>(circleRes as PromiseSettledResult<SupabaseDataResult<CirclePostRow[]>>)       ?? [];
    const voices      = settled<VoiceNoteRow[]>(voiceRes as PromiseSettledResult<SupabaseDataResult<VoiceNoteRow[]>>)        ?? [];
    const comforts    = settled<ComfortSessionRow[]>(comfortRes as PromiseSettledResult<SupabaseDataResult<ComfortSessionRow[]>>)      ?? [];
    const crewMs      = settled<CrewMemberRow[]>(crewMemberRes as PromiseSettledResult<SupabaseDataResult<CrewMemberRow[]>>)   ?? [];
    const crewCIs     = settled<CrewCheckInRow[]>(crewCheckInRes as PromiseSettledResult<SupabaseDataResult<CrewCheckInRow[]>>)  ?? [];
    const parentPosts = settled<ParentCirclePostRow[]>(parentCircleRes as PromiseSettledResult<SupabaseDataResult<ParentCirclePostRow[]>>) ?? [];
    const room        = settled<RoomMemoryRow>(roomRes as PromiseSettledResult<SupabaseDataResult<RoomMemoryRow>>);

    return {
      moodHistory: moods.map(r => ({ id: r.id, mood: r.mood, date: r.date, time: r.time })) as MoodEntry[],
      journalEntries: journals.map(r => ({ id: r.id, text: r.text, mood: r.mood, date: r.date, time: r.time, sekretReply: r.sekret_reply ?? undefined })) as JournalEntry[],
      circlePosts: circles.map(r => ({ id: r.id, text: r.text, date: r.date, time: r.time, reactions: r.reactions ?? {}, circleTag: r.circle_tag ?? undefined, postMood: r.post_mood ?? undefined, mediaKind: r.media_kind ?? undefined })) as CirclePost[],
      voiceNotes: voices.map(r => ({ id: r.id, title: r.title, date: r.date, time: r.time, duration: r.duration })) as VoiceNote[],
      comfortSessions: comforts.map(r => ({ id: r.id, type: r.type, mood: r.mood ?? undefined, date: r.date, time: r.time })) as ComfortSession[],
      crewMembers: crewMs.map(r => ({ id: r.id, name: r.name, emoji: r.emoji, commitment: r.commitment, cadence: r.cadence, inviteCode: r.invite_code, addedAt: r.added_at ? new Date(r.added_at).getTime() : undefined })) as CrewMember[],
      crewCheckIns: crewCIs.map(r => ({ id: r.id, memberId: r.member_id, note: r.note, mood: r.mood ?? undefined, date: r.date, time: r.time })) as CrewCheckIn[],
      parentCirclePosts: parentPosts.map(r => ({ id: r.id, text: r.text, date: r.date, time: r.time, reactions: r.reactions ?? {}, circleTag: r.circle_tag ?? undefined })) as ParentCirclePost[],
      roomMemory: room ? { character: room.character, lastVisit: room.last_visit ?? '', lastHotspot: room.last_hotspot ?? '', lastSummon: room.last_summon ?? '', visitCount: room.visit_count ?? 0 } : null,
    };
  } catch (e) {
    if (__DEV__) console.warn('[sync] pullAll failed', e);
    return null;
  }
}

// ── Re-export compat modules so all @/utils/sync imports keep working ────────
export * from './parentBridgeCompat';
export * from './pointsCompat';

// src/utils/sync.ts
// Se'kret Bip — Cloud sync layer (Phase 2 + Phase 3 backend)
//
// All cloud writes go through here. Every helper is a SAFE NO-OP when
// Supabase isn’t configured — the app keeps working off AsyncStorage, no
// errors thrown. This lets us ship the UI now and add credentials later.
//
// Auth model: each row is scoped to auth.uid() via RLS. If there’s no
// signed-in user yet, writes are silently skipped (kept locally only).
// ensureAnonymousSession() is called from useAppEffects on mount.
//
// IMPORTANT: never throw. The user’s local experience must never break
// because the cloud is down. Errors are logged and swallowed.

import { getSupabase, TABLES } from './supabase';
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

// ── Internal helpers ──────────────────────────────────────────────
async function currentUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function safeUpsert(table: string, payload: any | any[]): Promise<void> {
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
    const { data } = await sb.auth.getUser();
    if (data?.user?.id) return data.user.id;
    const { data: signed, error } = await sb.auth.signInAnonymously();
    if (error) {
      if (__DEV__) console.warn('[sync] anon sign-in failed', error);
      return null;
    }
    return signed?.user?.id ?? null;
  } catch (e) {
    if (__DEV__) console.warn('[sync] ensureAnonymousSession threw', e);
    return null;
  }
}

// ── Mood ───────────────────────────────────────────────────────────
export function syncMood(entry: MoodEntry): void {
  void safeUpsert(TABLES.moodHistory, {
    id:   entry.id,
    mood: entry.mood,
    date: entry.date,
    time: entry.time,
  });
}

// ── Journal ─────────────────────────────────────────────────────────
export function syncJournal(entry: JournalEntry): void {
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
    reactions:  post.reactions,
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
    reactions:  post.reactions,
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
    return (data ?? []).map((r: any) => ({
      id:        r.id,
      text:      r.text,
      date:      r.date,
      time:      r.time,
      reactions: r.reactions ?? { beenThere: 0, solidarity: 0, reminder: 0, needed: 0, strength: 0 },
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
      return (data ?? []).map((r: any) => ({
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
      // Fetch display names for each author (two-step; no FK from post→circle_profiles)
      let profileMap: Record<string, { nickname: string; avatar_emoji: string }> = {};
      const userIds = [...new Set(rows.map((r: any) => r.user_id as string))];
      if (userIds.length > 0) {
        const { data: profiles } = await sb
          .from(TABLES.circleProfiles)
          .select('user_id, nickname, avatar_emoji')
          .in('user_id', userIds);
        profileMap = Object.fromEntries(
          (profiles ?? []).map((p: any) => [p.user_id, { nickname: p.nickname, avatar_emoji: p.avatar_emoji }]),
        );
      }
      return rows.map((r: any) => ({
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
      return (data ?? []).map((r: any) => ({
        id:               r.id,
        user_id:          '',
        text:             r.text,
        reactions:        r.reactions ?? { beenThere: 0, solidarity: 0, reminder: 0, needed: 0, strength: 0 },
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
// Call signature: syncCircleReaction(postId, postType, emoji)
// Back-compat 2-arg form: syncCircleReaction(postId, emoji) — defaults postType to 'public'.
export async function syncCircleReaction(
  postId: string | number,
  tabOrReaction: string,
  reaction?: string,
): Promise<void> {
  const postType = reaction != null ? tabOrReaction : 'public';
  const emoji    = reaction ?? tabOrReaction;
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
  opts: { postMood?: string; circleTag?: string; mediaKind?: string; mediaUrl?: string; revealIdentity?: boolean } = {},
): Promise<void> {
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
      media_url:  opts.mediaUrl  ?? null,
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

// ── Circle replies ────────────────────────────────────────────────────
export async function writeCircleReply(
  postId: number,
  postType: 'public' | 'friends' | 'crew' | 'parent',
  replyMode: 'comfort' | 'voice' | 'support' | 'stay',
  opts: { text?: string; voiceUrl?: string; durationSecs?: number } = {},
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  try {
    const { error } = await sb.from(TABLES.circleReplies).insert({
      post_id:      postId,
      post_type:    postType,
      user_id:      uid,
      reply_mode:   replyMode,
      text:         opts.text        ?? null,
      voice_url:    opts.voiceUrl    ?? null,
      duration_secs: opts.durationSecs ?? null,
      created_at:   new Date().toISOString(),
    });
    if (error) console.warn('[sync] writeCircleReply failed:', error.message, error.code);
  } catch (e) {
    if (__DEV__) console.warn('[sync] writeCircleReply failed', e);
  }
}

import type { CirclePostReply } from '../types/index';

export async function loadCircleReplies(
  postId: number,
  postType: string,
): Promise<CirclePostReply[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from(TABLES.circleReplies)
      .select('id, post_id, post_type, reply_mode, text, voice_url, duration_secs, created_at')
      .eq('post_id', postId)
      .eq('post_type', postType)
      .order('created_at', { ascending: true });
    if (error) { console.warn('[sync] loadCircleReplies failed:', error.message); return []; }
    return (data ?? []).map(r => ({
      id:           r.id,
      postId:       r.post_id,
      postType:     r.post_type,
      replyMode:    r.reply_mode as CirclePostReply['replyMode'],
      text:         r.text         ?? undefined,
      voiceUrl:     r.voice_url    ?? undefined,
      durationSecs: r.duration_secs ?? undefined,
      createdAt:    r.created_at,
    }));
  } catch {
    return [];
  }
}

// ── Voice ─────────────────────────────────────────────────────────────
export function syncVoiceNote(note: VoiceNote): void {
  void safeUpsert(TABLES.voiceNotes, {
    id:         note.id,
    title:      note.title,
    date:       note.date,
    time:       note.time,
    duration:   note.duration,
    video_url:  (note.videoUrl  as string | undefined) ?? null,
    type:       (note.type      as string | undefined) ?? null,
    cloud_text: (note.cloudText as string | undefined) ?? null,
  });
}

// ── Comfort sessions ─────────────────────────────────────────────────────
export function syncComfortSession(session: ComfortSession): void {
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

/** Upsert a single period day (ISO date string, e.g. ‘2026-06-17’). */
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
    return (data ?? []).map((r: any) => r.day as string);
  } catch (e) {
    if (__DEV__) console.warn('[sync] loadPeriodDays failed', e);
    return [];
  }
}

// ── Oracle / companion memory ───────────────────────────────────────────────

/**
 * Upsert the full oracle memory snapshot for a personality.
 * personality_id: ‘teen’ | ‘parent’
 */
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

/**
 * Load the latest oracle memory snapshot for a personality.
 * Returns null if not found or Supabase not configured.
 */
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
      memory:       (data.memory as Record<string, unknown>) ?? {},
      sessionCount: (data.session_count as number) ?? 0,
    };
  } catch (e) {
    if (__DEV__) console.warn('[sync] loadOracleSession failed', e);
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
    const tables = [
      TABLES.moodHistory, TABLES.journalEntries, TABLES.circlePosts,
      TABLES.voiceNotes, TABLES.comfortSessions, TABLES.crewMembers,
      TABLES.crewCheckIns, TABLES.parentCirclePosts,
    ];
    const results = await Promise.all(
      tables.map(t => sb.from(t).select('*').eq('user_id', uid).order('id', { ascending: false })),
    );
    const [mood, journal, circle, voice, comfort, crew, check, parentCircle] =
      results.map(r => r.data || []);
    const { data: roomRow } = await sb
      .from(TABLES.roomMemory).select('*').eq('user_id', uid).maybeSingle();
    return {
      moodHistory:    mood as MoodEntry[],
      journalEntries: (journal as any[]).map(r => ({
        ...r, sekretReply: r.sekret_reply ?? undefined,
      })) as JournalEntry[],
      circlePosts:     circle  as CirclePost[],
      voiceNotes:      voice   as VoiceNote[],
      comfortSessions: comfort as ComfortSession[],
      crewMembers: (crew as any[]).map(r => ({
        id: String(r.id), name: r.name, emoji: r.emoji, relation: r.relation ?? '',
        commitment: r.commitment, cadence: r.cadence, inviteCode: r.invite_code, addedAt: r.added_at,
      })),
      crewCheckIns: (check as any[]).map(r => ({
        id: r.id, memberId: r.member_id, note: r.note,
        mood: r.mood, date: r.date, time: r.time,
      })),
      parentCirclePosts: (parentCircle as any[]).map(r => ({
        id: r.id, text: r.text, date: r.date, time: r.time,
        reactions: r.reactions ?? { beenThere: 0, solidarity: 0, reminder: 0, needed: 0, strength: 0 },
        circleTag: r.circle_tag ?? undefined,
        mood: r.mood ?? undefined,
      })) as ParentCirclePost[],
      roomMemory: roomRow ? {
        character:   roomRow.character    ?? 'raylene',
        lastVisit:   roomRow.last_visit   ?? '',
        lastHotspot: roomRow.last_hotspot ?? '',
        lastSummon:  roomRow.last_summon  ?? '',
        visitCount:  roomRow.visit_count  ?? 0,
      } : null,
    };
  } catch (e) {
    if (__DEV__) console.warn('[sync] pullAll failed', e);
    return null;
  }
}

// ── Parent ↔ Teen Link ────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createParentLink(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const uid = await currentUserId();
  if (!uid) return null;
  try {
    const { data: existing } = await sb
      .from('parent_links')
      .select('invite_code')
      .eq('teen_user_id', uid)
      .eq('status', 'pending')
      .maybeSingle();
    if (existing?.invite_code) return existing.invite_code as string;
    const code = generateInviteCode();
    const { error } = await sb.from('parent_links').insert({ teen_user_id: uid, invite_code: code });
    if (error) throw error;
    return code;
  } catch (e) {
    if (__DEV__) console.warn('[sync] createParentLink failed', e);
    return null;
  }
}

export async function redeemParentLink(
  code: string,
): Promise<'ok' | 'not_found' | 'error'> {
  const sb = getSupabase();
  if (!sb) return 'error';
  const uid = await currentUserId();
  if (!uid) return 'error';
  try {
    const { data, error } = await sb
      .from('parent_links')
      .update({ parent_user_id: uid, status: 'active', linked_at: new Date().toISOString() })
      .eq('invite_code', code.toUpperCase().trim())
      .eq('status', 'pending')
      .select('id')
      .single();
    if (error || !data) return 'not_found';
    return 'ok';
  } catch (e) {
    if (__DEV__) console.warn('[sync] redeemParentLink failed', e);
    return 'error';
  }
}

// ── Bridge: signal + notes ────────────────────────────────────────────────────

export interface BridgeSignal {
  id:          number;
  share_type:  string;
  conv_mode:   string | null;
  char_key:    string;
  sent_at:     string;
  created_at:  string;
}

export interface ParentNote {
  id:           string;
  content:      string;
  sent_at:      string;
  seen_by_teen: boolean;
}

/** Teen sends metadata signal — message content stays local. */
export async function sendBridgeSignal(params: {
  shareType: string;
  convMode:  string | null;
  charKey:   'raylene' | 'rylane';
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  try {
    await sb.from('bridge_signals').insert({
      teen_user_id: uid,
      char_key:     params.charKey,
      share_type:   params.shareType,
      conv_mode:    params.convMode ?? null,
      sent_at:      new Date().toISOString(),
    });
  } catch (e) {
    if (__DEV__) console.warn('[sync] sendBridgeSignal failed', e);
  }
}

/** Teen fetches parent warm notes addressed to them. */
export async function fetchParentNotes(): Promise<ParentNote[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const uid = await currentUserId();
  if (!uid) return [];
  try {
    const { data } = await sb
      .from('parent_notes')
      .select('id, content, sent_at, seen_by_teen')
      .eq('teen_user_id', uid)
      .order('sent_at', { ascending: false })
      .limit(20);
    return (data ?? []) as ParentNote[];
  } catch (e) {
    if (__DEV__) console.warn('[sync] fetchParentNotes failed', e);
    return [];
  }
}

/** Parent fetches the notes they have sent to their linked teen. */
export async function fetchParentSentNotes(): Promise<ParentNote[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const uid = await currentUserId();
  if (!uid) return [];
  try {
    const { data } = await sb
      .from('parent_notes')
      .select('id, content, sent_at, seen_by_teen')
      .eq('parent_user_id', uid)
      .order('sent_at', { ascending: false })
      .limit(30);
    return (data ?? []) as ParentNote[];
  } catch (e) {
    if (__DEV__) console.warn('[sync] fetchParentSentNotes failed', e);
    return [];
  }
}

/** Teen marks a parent note as seen. */
export async function markParentNoteSeen(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from('parent_notes').update({ seen_by_teen: true }).eq('id', id);
  } catch (e) {
    if (__DEV__) console.warn('[sync] markParentNoteSeen failed', e);
  }
}

/** Teen subscribes to new parent notes via Realtime. Returns unsubscribe fn. */
export async function subscribeToParentNotes(
  onNew: (note: ParentNote) => void,
): Promise<() => void> {
  const sb = getSupabase();
  if (!sb) return () => {};
  const uid = await currentUserId();
  if (!uid) return () => {};

  const channel = sb
    .channel('parent-notes-' + uid)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'parent_notes', filter: `teen_user_id=eq.${uid}` },
      (payload) => onNew(payload.new as ParentNote),
    )
    .subscribe();

  return () => { sb.removeChannel(channel); };
}

/** Parent gets the linked teen's user_id (null if not linked). */
export async function fetchLinkedTeenId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const uid = await currentUserId();
  if (!uid) return null;
  try {
    const { data } = await sb
      .from('parent_links')
      .select('teen_user_id')
      .eq('parent_user_id', uid)
      .eq('status', 'active')
      .maybeSingle();
    return data?.teen_user_id ?? null;
  } catch (e) {
    if (__DEV__) console.warn('[sync] fetchLinkedTeenId failed', e);
    return null;
  }
}

/** Parent fetches bridge signals from their linked teen. */
export async function fetchBridgeSignals(teenId: string): Promise<BridgeSignal[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data } = await sb
      .from('bridge_signals')
      .select('id, share_type, conv_mode, char_key, sent_at, created_at')
      .eq('teen_user_id', teenId)
      .order('sent_at', { ascending: false })
      .limit(30);
    return (data ?? []) as BridgeSignal[];
  } catch (e) {
    if (__DEV__) console.warn('[sync] fetchBridgeSignals failed', e);
    return [];
  }
}

export function syncRepairWin(entry: { id: number; text: string; date: string; ritual?: string }): void {
  void safeUpsert(TABLES.parentRepairWins, {
    id: entry.id, text: entry.text, date: entry.date, ritual: entry.ritual ?? null,
  });
}

export function syncVoiceReflection(entry: { id: number; prompt: string; text: string; date: string; lens: string }): void {
  void safeUpsert(TABLES.parentVoiceReflections, {
    id: entry.id, prompt: entry.prompt, text: entry.text, date: entry.date, lens: entry.lens,
  });
}

// ── S2Tell cross-device delivery ─────────────────────────────────────────────

/** Teen shares a rewrite with their linked parent. raw is NEVER passed or stored. */
export async function shareS2Tell(entry: {
  id: string; rewrite: string; tone: string; savedAt: string;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  try {
    const { data: link } = await sb
      .from('parent_links')
      .select('parent_user_id')
      .eq('teen_user_id', uid)
      .eq('status', 'active')
      .maybeSingle();
    if (!link?.parent_user_id) return;
    const { error } = await sb.from(TABLES.s2tellShares).upsert(
      {
        teen_user_id:   uid,
        parent_user_id: link.parent_user_id,
        id:             entry.id,
        rewrite:        entry.rewrite,
        tone:           entry.tone,
        saved_at:       entry.savedAt,
      },
      { onConflict: 'teen_user_id,id' },
    );
    if (error) console.warn('[sync] shareS2Tell failed:', error.message);
  } catch (e) {
    if (__DEV__) console.warn('[sync] shareS2Tell failed', e);
  }
}

/** Parent fetches all S2Tell shares addressed to them. */
export async function fetchS2TellShares(): Promise<Array<{
  id: string; rewrite: string; tone: string; savedAt: string;
}>> {
  const sb = getSupabase();
  if (!sb) return [];
  const uid = await currentUserId();
  if (!uid) return [];
  try {
    const { data, error } = await sb
      .from(TABLES.s2tellShares)
      .select('id, rewrite, tone, saved_at')
      .eq('parent_user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id:      r.id,
      rewrite: r.rewrite,
      tone:    r.tone,
      savedAt: r.saved_at,
    }));
  } catch (e) {
    if (__DEV__) console.warn('[sync] fetchS2TellShares failed', e);
    return [];
  }
}

/** Parent sends a warm note to their linked teen. */
export async function sendParentNote(teenId: string, content: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const uid = await currentUserId();
  if (!uid) return false;
  try {
    const { error } = await sb.from('parent_notes').insert({
      teen_user_id:   teenId,
      parent_user_id: uid,
      content,
      sent_at: new Date().toISOString(),
    });
    return !error;
  } catch (e) {
    if (__DEV__) console.warn('[sync] sendParentNote failed', e);
    return false;
  }
}

export interface ParentEngagement {
  notesSent:  number;
  tipsRead:   number;
  daysActive: number;
  bridgeUsed: boolean;
}

/** Fetch the parent's own engagement stats within Bip. */
export async function fetchParentEngagement(): Promise<ParentEngagement | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const uid = await currentUserId();
  if (!uid) return null;
  try {
    const [notesRes, engRes] = await Promise.all([
      sb.from('parent_notes').select('id', { count: 'exact', head: true }).eq('parent_user_id', uid),
      sb.from('parent_engagement').select('*').eq('parent_user_id', uid).maybeSingle(),
    ]);
    return {
      notesSent:  notesRes.count ?? 0,
      tipsRead:   (engRes.data as any)?.tips_read ?? 0,
      daysActive: (engRes.data as any)?.days_active ?? 0,
      bridgeUsed: (engRes.data as any)?.bridge_used ?? false,
    };
  } catch (e) {
    if (__DEV__) console.warn('[sync] fetchParentEngagement failed', e);
    return null;
  }
}

// ── Growth milestones ─────────────────────────────────────────────────────────

/** Record one track completion. Safe no-op when Supabase isn't configured. */
export async function syncGrowthMilestone(trackKey: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  try {
    const { error } = await sb.from(TABLES.growthMilestones).insert({
      user_id:      uid,
      track_key:    trackKey,
      completed_at: new Date().toISOString(),
    });
    if (error) console.warn('[sync] syncGrowthMilestone failed:', error.message);
  } catch (e) {
    if (__DEV__) console.warn('[sync] syncGrowthMilestone failed', e);
  }
}

/** Parent subscribes to new bridge signals from their teen via Realtime. */
export async function subscribeToBridgeSignals(
  teenId:  string,
  onNew:   (signal: BridgeSignal) => void,
): Promise<() => void> {
  const sb = getSupabase();
  if (!sb) return () => {};

  const channel = sb
    .channel('bridge-signals-' + teenId)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'bridge_signals', filter: `teen_user_id=eq.${teenId}` },
      (payload) => onNew(payload.new as BridgeSignal),
    )
    .subscribe();

  return () => { sb.removeChannel(channel); };
}

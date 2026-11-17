// utils/sync.ts
// Se'kret Bip — Cloud sync layer (Phase 2 backend)
//
// All cloud writes go through here. Every helper is a SAFE NO-OP when
// Supabase isn’t configured — the app keeps working off AsyncStorage, no
// errors thrown. This lets us ship the UI now and add credentials later.
//
// Auth model: each row is scoped to auth.uid() via RLS. If there’s no
// signed-in user yet, writes are silently skipped (kept locally only). We’ll
// add anonymous sign-in (supabase.auth.signInAnonymously) once we’re ready
// to flip the switch in app/index.tsx.
//
// IMPORTANT: never throw. The user’s local experience must never break
// because the cloud is down. Errors are logged and swallowed.

import { getSupabase, TABLES } from './supabase';
import type {
  JournalEntry, MoodEntry, CirclePost, ParentCirclePost, VoiceNote,
  ComfortSession, CrewMember, CrewCheckIn,
} from '../types/index';

// ── Internal helpers ────────────────────────────────────────────────────────
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
    await sb.from(table).upsert(withUser, { onConflict: 'id,user_id' });
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
    await sb.from(table).delete().match({ id, user_id: uid });
  } catch (e) {
    if (__DEV__) console.warn(`[sync] delete ${table} failed`, e);
  }
}

// ── Anonymous sign-in (call once on app boot if desired) ────────────────────
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

// ── Mood ────────────────────────────────────────────────────────────────────
export function syncMood(entry: MoodEntry): void {
  void safeUpsert(TABLES.moodHistory, {
    id:   entry.id,
    mood: entry.mood,
    date: entry.date,
    time: entry.time,
  });
}

// ── Journal ────────────────────────────────────────────────────────────────
// sekret_reply is written when present so the reply survives device migration.
// The column is nullable — older rows without a reply write NULL, which is safe.
// MIGRATION REQUIRED before this field persists to Supabase:
//   supabase/migrations/add_sekret_reply.sql
//   ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS sekret_reply text;
export function syncJournal(entry: JournalEntry): void {
  void safeUpsert(TABLES.journalEntries, {
    id:           entry.id,
    text:         entry.text,
    mood:         entry.mood,
    date:         entry.date,
    time:         entry.time,
    // sekretTyping is transient — never persisted.
    sekret_reply: entry.sekretReply ?? null,
  });
}

// ── Circle (Teen) ──────────────────────────────────────────────────────────
export function syncCirclePost(post: CirclePost): void {
  void safeUpsert(TABLES.circlePosts, {
    id:         post.id,
    text:       post.text,
    date:       post.date,
    time:       post.time,
    reactions:  post.reactions,
    circle_tag: post.circleTag ?? null,
    post_mood:  post.postMood ?? null,
    media_kind: post.mediaKind ?? null,
    anonymous_name: post.anonymousName ?? null,
    avatar_key: post.avatarKey ?? null,
    visibility: post.visibility ?? 'public_circle',
    identity_context: post.identityContext ?? 'public_circle',
  });
}

// ── Circle (Parent) ────────────────────────────────────────────────────────
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

// ── Voice ──────────────────────────────────────────────────────────────────
export function syncVoiceNote(note: VoiceNote): void {
  void safeUpsert(TABLES.voiceNotes, {
    id:       note.id,
    title:    note.title,
    date:     note.date,
    time:     note.time,
    duration: note.duration,
  });
}

// ── Comfort sessions ───────────────────────────────────────────────────────
export function syncComfortSession(session: ComfortSession): void {
  void safeUpsert(TABLES.comfortSessions, {
    id:   session.id,
    type: session.type,
    mood: session.mood ?? null,
    date: session.date,
    time: session.time,
  });
}

// ── Crew ───────────────────────────────────────────────────────────────────
export function syncCrewMember(m: CrewMember): void {
  void safeUpsert(TABLES.crewMembers, {
    id:          m.id,
    name:        m.name,
    emoji:       m.emoji,
    commitment:  m.commitment,
    cadence:     m.cadence,
    invite_code: m.inviteCode,
    bip_id:      m.bipId ?? null,
    connection_status: m.connectionStatus ?? 'pending',
    added_at:    new Date(m.addedAt).toISOString(),
  });
}

export function deleteCrewMember(id: number): void {
  void safeDelete(TABLES.crewMembers, id);
}

export function syncCrewCheckIn(c: CrewCheckIn): void {
  void safeUpsert(TABLES.crewCheckIns, {
    id:        c.id,
    member_id: c.memberId,
    note:      c.note,
    mood:      c.mood ?? null,
    date:      c.date,
    time:      c.time,
  });
}

// ── Points snapshot (optional — derived in UI, can also be stored) ────────
export async function snapshotPoints(total: number): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;
  try {
    await sb.from(TABLES.bipPoints).insert({
      user_id:     uid,
      total,
      captured_at: new Date().toISOString(),
    });
  } catch (e) {
    if (__DEV__) console.warn('[sync] snapshotPoints failed', e);
  }
}

// ── Bulk pull (initial restore — optional, opt-in from app boot) ───────────
// Reads cloud rows for the signed-in user. Useful when migrating a fresh
// install. Returns null if offline — caller falls back to local state.
//
// Mapping notes:
//   journal_entries     : sekret_reply   → sekretReply
//   crew_members        : invite_code    → inviteCode, added_at → addedAt
//   crew_check_ins      : member_id      → memberId
//   parent_circle_posts : circle_tag     → circleTag
//                         reactions passes through as-is (JSONB keys match type)
//   room_memory         : last_visit     → lastVisit
//                         last_hotspot   → lastHotspot
//                         last_summon    → lastSummon
//                         visit_count    → visitCount
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
    character:   string;
    lastVisit:   string;
    lastHotspot: string;
    lastSummon:  string;
    visitCount:  number;
  } | null;
} | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const uid = await currentUserId();
  if (!uid) return null;
  try {
    const tables = [
      TABLES.moodHistory, TABLES.journalEntries, TABLES.circlePosts,
      TABLES.voiceNotes, TABLES.comfortSessions, TABLES.crewMembers, TABLES.crewCheckIns,
      TABLES.parentCirclePosts,
    ];
    const results = await Promise.all(
      tables.map(t => sb.from(t).select('*').eq('user_id', uid).order('id', { ascending: false })),
    );
    const [mood, journal, circle, voice, comfort, crew, check, parentCircle] =
      results.map(r => r.data || []);

    // room_memory is a single-row-per-user table (PK is user_id only), so
    // query it separately without ordering by id.
    const { data: roomRow } = await sb
      .from(TABLES.roomMemory)
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    return {
      moodHistory:    mood as MoodEntry[],
      // Map snake_case sekret_reply back to the camelCase JournalEntry field.
      // Rows created before the migration have no sekret_reply column — the
      // select returns undefined for those rows, which the nullish coalesce
      // converts to undefined, leaving sekretReply absent (correct behavior).
      journalEntries: (journal as any[]).map(r => ({
        ...r,
        sekretReply: r.sekret_reply ?? undefined,
      })) as JournalEntry[],
      circlePosts:     (circle as any[]).map(r => ({
        id: r.id, text: r.text, date: r.date, time: r.time,
        reactions: r.reactions, circleTag: r.circle_tag ?? undefined, postMood: r.post_mood ?? undefined,
        mediaKind: r.media_kind ?? undefined, anonymousName: r.anonymous_name ?? undefined,
        avatarKey: r.avatar_key ?? undefined, visibility: r.visibility ?? 'public_circle',
        identityContext: r.identity_context ?? 'public_circle',
      })) as CirclePost[],
      voiceNotes:      voice   as VoiceNote[],
      comfortSessions: comfort as ComfortSession[],
      crewMembers:     (crew as any[]).map(r => ({
        id: r.id, name: r.name, bipId: r.bip_id ?? undefined, connectionStatus: r.connection_status ?? 'pending', emoji: r.emoji, commitment: r.commitment,
        cadence: r.cadence, inviteCode: r.invite_code, addedAt: r.added_at,
      })),
      crewCheckIns:    (check as any[]).map(r => ({
        id: r.id, memberId: r.member_id, note: r.note,
        mood: r.mood, date: r.date, time: r.time,
      })),
      // Map snake_case DB columns back to the local ParentCirclePost shape.
      // reactions is stored as JSONB and passes through as-is (keys match the
      // ParentCirclePost type: beenThere, solidarity, reminder, needed, strength).
      parentCirclePosts: (parentCircle as any[]).map(r => ({
        id:        r.id,
        text:      r.text,
        date:      r.date,
        time:      r.time,
        reactions: r.reactions ?? {
          beenThere: 0, solidarity: 0, reminder: 0, needed: 0, strength: 0,
        },
        circleTag: r.circle_tag ?? undefined,
      })) as ParentCirclePost[],
      // room_memory is a single row per user. Map snake_case → camelCase.
      // Returns null if the user has no room_memory row yet (first install).
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

import { getSupabase } from '@/utils/supabase';
import type { JournalEntry } from '@/types';

export type JournalOwnerSide = 'teen' | 'parent';

type JournalRow = {
  id: number;
  text: string;
  mood: string;
  date: string;
  time: string;
  sekret_reply: string | null;
  source: string | null;
  entry_mode: string | null;
  mood_tag: string | null;
  locked: boolean | null;
  media_type: string | null;
  sekret_avatar_state: string | null;
};

async function permanentUserId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const user = data.session?.user;
  if (!user || user.is_anonymous) return null;
  return user.id;
}

function mapRow(row: JournalRow): JournalEntry {
  const mediaType = row.media_type === 'photo' || row.media_type === 'video'
    ? row.media_type
    : undefined;

  return {
    id: Number(row.id),
    text: row.text,
    mood: row.mood,
    date: row.date,
    time: row.time,
    source: row.source ?? undefined,
    activeTab: row.source ?? undefined,
    entryMode: row.entry_mode ?? undefined,
    moodTag: row.mood_tag ?? undefined,
    locked: row.locked === true,
    mediaType,
    sekretReply: row.sekret_reply ?? undefined,
    sekretAvatarState: row.sekret_avatar_state ?? undefined,
  };
}

export async function upsertJournalEntry(
  entry: JournalEntry,
  ownerSide: JournalOwnerSide,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const userId = await permanentUserId();
  if (!userId) return;

  const { error } = await supabase.from('journal_entries').upsert({
    user_id: userId,
    id: entry.id,
    text: entry.text,
    mood: entry.mood,
    date: entry.date,
    time: entry.time,
    sekret_reply: entry.sekretReply ?? null,
    owner_side: ownerSide,
    source: entry.source ?? entry.activeTab ?? null,
    entry_mode: entry.entryMode ?? null,
    mood_tag: entry.moodTag ?? null,
    locked: entry.locked === true,
    media_type: entry.mediaType ?? null,
    sekret_avatar_state: entry.sekretAvatarState ?? null,
  }, { onConflict: 'user_id,id' });

  if (error) throw error;
}

export async function loadJournalEntries(
  ownerSide: JournalOwnerSide,
  limit = 250,
): Promise<JournalEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const userId = await permanentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('journal_entries')
    .select('id,text,mood,date,time,sekret_reply,source,entry_mode,mood_tag,locked,media_type,sekret_avatar_state')
    .eq('user_id', userId)
    .eq('owner_side', ownerSide)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(row => mapRow(row as JournalRow));
}

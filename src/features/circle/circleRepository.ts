import { emitEvent } from '@/features/activity/events';
import { reportPost } from '@/utils/circleModeration';
import { getSupabase } from '@/utils/supabase';

export type CircleReactionKey = 'felt' | 'comfort' | 'proud' | 'stay';
export type CircleReactionCounts = Record<CircleReactionKey, number>;

export interface PublicCircleFeedItem {
  id: number;
  userId: string;
  nickname: string;
  avatarEmoji: string;
  text: string;
  postMood: string | null;
  mediaKind: string | null;
  reactions: CircleReactionCounts;
  viewerReaction: CircleReactionKey | null;
  isOwnPost: boolean;
  createdAt: string;
}

type PublicFeedRpcRow = {
  post_id: number;
  author_user_id: string;
  post_text: string;
  post_mood: string | null;
  media_kind: string | null;
  created_at: string;
  reaction_counts: Partial<CircleReactionCounts> | null;
  viewer_reaction: string | null;
  is_own_post: boolean;
};

type CircleProfileRow = {
  user_id: string;
  nickname: string;
  avatar_emoji: string;
};

const EMPTY_REACTIONS: CircleReactionCounts = {
  felt: 0,
  comfort: 0,
  proud: 0,
  stay: 0,
};

function normalizeReactions(value: unknown): CircleReactionCounts {
  const source = value && typeof value === 'object'
    ? value as Partial<Record<CircleReactionKey, unknown>>
    : {};

  return {
    felt: Number(source.felt ?? 0),
    comfort: Number(source.comfort ?? 0),
    proud: Number(source.proud ?? 0),
    stay: Number(source.stay ?? 0),
  };
}

function normalizeViewerReaction(value: unknown): CircleReactionKey | null {
  return value === 'felt' || value === 'comfort' || value === 'proud' || value === 'stay'
    ? value
    : null;
}

async function currentPermanentUser(): Promise<{ id: string } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const user = data.session?.user;
  if (!user || user.is_anonymous) return null;
  return { id: user.id };
}

async function loadProfileMap(userIds: string[]): Promise<Map<string, CircleProfileRow>> {
  const supabase = getSupabase();
  if (!supabase || userIds.length === 0) return new Map();

  const uniqueUserIds = [...new Set(userIds)].slice(0, 100);
  const { data, error } = await supabase.rpc('get_public_circle_profiles', {
    p_user_ids: uniqueUserIds,
  });

  if (error) throw error;

  return new Map(
    (data ?? []).map(row => {
      const profile = row as CircleProfileRow;
      return [profile.user_id, profile];
    }),
  );
}

function mapFeedItem(
  row: PublicFeedRpcRow,
  profiles: Map<string, CircleProfileRow>,
): PublicCircleFeedItem {
  const profile = profiles.get(row.author_user_id);
  return {
    id: Number(row.post_id),
    userId: row.author_user_id,
    nickname: profile?.nickname?.trim() || 'anonymous bip',
    avatarEmoji: profile?.avatar_emoji?.trim() || '🌙',
    text: row.post_text,
    postMood: row.post_mood,
    mediaKind: row.media_kind,
    // The RPC returns aggregate counts only when the viewer owns the post.
    reactions: row.is_own_post ? normalizeReactions(row.reaction_counts) : EMPTY_REACTIONS,
    viewerReaction: normalizeViewerReaction(row.viewer_reaction),
    isOwnPost: row.is_own_post === true,
    createdAt: row.created_at,
  };
}

export async function loadPublicCircleFeed(limit = 40): Promise<PublicCircleFeedItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const user = await currentPermanentUser();
  if (!user) throw new Error('Create a permanent Bip account before opening Circle.');

  const { data, error } = await supabase.rpc('get_public_circle_feed', {
    p_limit: limit,
  });

  if (error) throw error;

  const rows = (data ?? []) as PublicFeedRpcRow[];
  const profiles = await loadProfileMap(rows.map(row => row.author_user_id));
  return rows.map(row => mapFeedItem(row, profiles));
}

export async function createPublicCirclePost(
  text: string,
  postMood?: string | null,
): Promise<PublicCircleFeedItem> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Circle is unavailable while Supabase is disconnected.');

  const user = await currentPermanentUser();
  if (!user) throw new Error('Create a permanent Bip account before posting to Circle.');

  const { data, error } = await supabase.rpc('create_public_circle_post', {
    p_text: text.trim(),
    p_post_mood: postMood ?? null,
  });

  const row = ((data ?? []) as PublicFeedRpcRow[])[0];
  if (error || !row) throw error ?? new Error('Circle did not return the saved post.');

  emitEvent('circle_post');
  const profiles = await loadProfileMap([row.author_user_id]);
  return mapFeedItem(row, profiles);
}

export async function reactToPublicCirclePost(
  postId: number,
  reaction: CircleReactionKey,
): Promise<CircleReactionKey> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Circle reactions are unavailable while offline.');

  const user = await currentPermanentUser();
  if (!user) throw new Error('Create a permanent Bip account before reacting.');

  const { data, error } = await supabase.rpc('react_to_public_circle_post', {
    p_post_id: postId,
    p_emoji: reaction,
  });

  if (error) throw error;
  const savedReaction = normalizeViewerReaction(
    data && typeof data === 'object' && !Array.isArray(data)
      ? (data as { reaction?: unknown }).reaction
      : null,
  );
  if (!savedReaction) throw new Error('Circle did not confirm the support reaction.');

  emitEvent('circle_reaction', { reactionKey: savedReaction });
  return savedReaction;
}

export async function reportPublicCirclePost(postId: number): Promise<void> {
  const reported = await reportPost(postId, 'public');
  if (!reported) throw new Error('The report could not be submitted. Try again.');
}

export function isHeavyCircleText(text: string): boolean {
  const value = text.toLowerCase();
  return [
    'alone', 'hurt', 'numb', 'scared', 'crying', 'hopeless', 'empty',
    'hate myself', 'want to die', 'dying', 'pain',
  ].some(term => value.includes(term));
}

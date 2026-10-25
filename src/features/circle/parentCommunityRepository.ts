import { getSupabase } from '@/utils/supabase';
import type { ParentCirclePost } from '@/types';

export type ParentCommunityReactionKey =
  | 'beenThere'
  | 'solidarity'
  | 'reminder'
  | 'needed'
  | 'strength';

export type ParentCommunityReactionCounts = Record<ParentCommunityReactionKey, number>;

type ParentCommunityFeedRow = {
  post_id: string;
  post_text: string;
  circle_tag: string | null;
  created_at: string;
  reaction_counts: Partial<Record<ParentCommunityReactionKey, unknown>> | null;
  quiet_reply_count: number | string | null;
};

const EMPTY_REACTIONS: ParentCommunityReactionCounts = {
  beenThere: 0,
  solidarity: 0,
  reminder: 0,
  needed: 0,
  strength: 0,
};

function normalizeReactionCounts(value: unknown): ParentCommunityReactionCounts {
  const source = value && typeof value === 'object'
    ? value as Partial<Record<ParentCommunityReactionKey, unknown>>
    : {};

  return {
    beenThere: Number(source.beenThere ?? 0),
    solidarity: Number(source.solidarity ?? 0),
    reminder: Number(source.reminder ?? 0),
    needed: Number(source.needed ?? 0),
    strength: Number(source.strength ?? 0),
  };
}

function mapFeedRow(row: ParentCommunityFeedRow): ParentCirclePost {
  const createdAt = new Date(row.created_at);
  const validCreatedAt = !Number.isNaN(createdAt.getTime());
  return {
    id: row.post_id,
    text: row.post_text,
    date: validCreatedAt ? createdAt.toLocaleDateString() : row.created_at,
    time: validCreatedAt
      ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '',
    circleTag: row.circle_tag ?? undefined,
    anonymousName: 'anonymous parent',
    quietRepliesCount: Number(row.quiet_reply_count ?? 0),
    reactions: normalizeReactionCounts(row.reaction_counts),
  };
}

async function requirePermanentParentSession() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Parent Circle is unavailable while Supabase is disconnected.');
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const user = data.session?.user;
  if (!user || user.is_anonymous) {
    throw new Error('A permanent parent account is required for Parent Circle.');
  }

  return { supabase, user };
}

function firstRow(data: unknown): ParentCommunityFeedRow | null {
  if (Array.isArray(data)) return (data[0] as ParentCommunityFeedRow | undefined) ?? null;
  return data && typeof data === 'object' ? data as ParentCommunityFeedRow : null;
}

export async function loadParentCommunityFeed(limit = 50): Promise<ParentCirclePost[]> {
  const { supabase } = await requirePermanentParentSession();
  const { data, error } = await supabase.rpc('get_parent_community_feed', {
    p_limit: limit,
  });
  if (error) throw error;

  return ((data ?? []) as ParentCommunityFeedRow[]).map(mapFeedRow);
}

export async function createParentCommunityPost(
  text: string,
  circleTag?: string,
): Promise<ParentCirclePost> {
  const value = text.trim();
  if (!value) throw new Error('Parent Circle posts cannot be empty.');

  const { supabase } = await requirePermanentParentSession();
  const { data, error } = await supabase.rpc('create_parent_community_post', {
    p_text: value,
    p_circle_tag: circleTag?.trim() || null,
  });
  if (error) throw error;

  const row = firstRow(data);
  if (!row) throw new Error('Parent Circle did not return the saved post.');
  return mapFeedRow(row);
}

export async function reactToParentCommunityPost(
  postId: string,
  reaction: ParentCommunityReactionKey,
): Promise<ParentCommunityReactionCounts> {
  const { supabase } = await requirePermanentParentSession();
  const { data, error } = await supabase.rpc('react_to_parent_community_post', {
    p_post_id: postId,
    p_reaction: reaction,
  });
  if (error) throw error;
  return normalizeReactionCounts(data ?? EMPTY_REACTIONS);
}

export async function replyToParentCommunityPost(
  postId: string,
  body: string,
): Promise<number> {
  const value = body.trim();
  if (!value) throw new Error('Quiet replies cannot be empty.');

  const { supabase } = await requirePermanentParentSession();
  const { data, error } = await supabase.rpc('reply_to_parent_community_post', {
    p_post_id: postId,
    p_body: value,
  });
  if (error) throw error;

  const count = Number(data ?? 0);
  if (!Number.isFinite(count)) throw new Error('Parent Circle returned an invalid reply count.');
  return count;
}

export async function reportParentCommunityPost(
  postId: string,
  reason?: string,
): Promise<void> {
  const { supabase } = await requirePermanentParentSession();
  const { data, error } = await supabase.rpc('report_parent_community_post', {
    p_post_id: postId,
    p_reason: reason?.trim() || null,
  });
  if (error) throw error;
  if (data !== true) throw new Error('Parent Circle did not confirm the report.');
}

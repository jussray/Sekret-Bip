// src/utils/circleModeration.ts
//
// Circle moderation — report-a-post only. Every Circle post (public,
// friends, crew, and parent) renders without an author identity, so
// block-by-user isn't safely buildable on the current client data model.
// See supabase/migrations/20260703200000_circle_moderation.sql.

import { getSupabase } from './supabase';

export type ReportablePostType = 'public' | 'friends' | 'crew' | 'parent';

async function uid(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function reportPost(
  postId: number,
  postType: ReportablePostType,
  reason?: string,
): Promise<boolean> {
  const sb = getSupabase();
  const reporterId = await uid();
  if (!sb || !reporterId) return false;
  const { error } = await sb.from('reported_posts').insert({
    reporter_id: reporterId,
    post_id: postId,
    post_type: postType,
    reason: reason ?? null,
  });
  return !error;
}

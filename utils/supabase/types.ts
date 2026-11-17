/**
 * utils/supabase/types.ts
 *
 * Hand-maintained lightweight row types that mirror the DB schema.
 * Run `npx supabase gen types typescript --project-id tbsevonvegdnlyjgplmm`
 * to auto-generate a full Database type and replace this file.
 */

export type MoodHistory = {
  user_id: string;
  id: number;
  mood: string;
  date: string;
  time: string;
  created_at: string;
};

export type JournalEntry = {
  user_id: string;
  id: number;
  text: string;
  mood: string;
  date: string;
  time: string;
  sekret_reply?: string | null;
  created_at: string;
};

export type CirclePost = {
  user_id: string;
  id: number;
  text: string;
  date: string;
  time: string;
  reactions: { felt: number; comfort: number; proud: number; stay: number };
  circle_tag?: string | null;
  post_mood?: string | null;
  media_kind?: string | null;
  created_at: string;
};

export type CircleProfile = {
  user_id: string;
  nickname: string;
  avatar_emoji: string;
  account_type: 'teen' | 'parent';
  created_at: string;
  updated_at: string;
};

export type FriendRequest = {
  id: number;
  from_user: string;
  to_user: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
};

export type Friendship = {
  id: number;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
};

export type PublicCirclePost = {
  id: number;
  user_id: string;
  text: string;
  post_mood?: string | null;
  media_kind?: string | null;
  reactions: { felt: number; comfort: number; proud: number; stay: number };
  created_at: string;
};

export type BipPoints = {
  id: number;
  user_id: string;
  total: number;
};

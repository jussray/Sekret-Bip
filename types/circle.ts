// Se'kret Bip — Circle V1 Types
// These types enforce identity rules per circle at the TypeScript layer.
// Public posts strip user_id before rendering. Parent posts are fully isolated.

export type CircleTab = 'public' | 'friends' | 'crew' | 'parent';

export type AccountType = 'teen' | 'parent';

export interface CircleProfile {
  user_id: string;
  nickname: string;
  avatar_emoji: string;
  account_type: AccountType;
  created_at: string;
  updated_at: string;
}

// Public post: user_id is NEVER exposed to the UI.
export interface PublicCirclePost {
  id: number;
  // user_id intentionally omitted — never render or store in component state
  text: string;
  post_mood: string | null;
  media_kind: string | null;
  reactions: Record<string, number>;
  created_at: string;
}

// Friends post: shows nickname + avatar only, never real name.
export interface FriendsCirclePost {
  id: number;
  user_id: string;
  nickname: string;        // from circle_profiles join
  avatar_emoji: string;   // from circle_profiles join
  text: string;
  post_mood: string | null;
  media_kind: string | null;
  reactions: Record<string, number>;
  created_at: string;
}

// Crew post: identity fully visible.
export interface CrewCirclePost {
  id: number;
  user_id: string;
  nickname: string;
  avatar_emoji: string;
  text: string;
  post_mood: string | null;
  media_kind: string | null;
  reactions: Record<string, number>;
  created_at: string;
}

// Parent post: anonymous by default.
// identity_revealed is true only when the viewer is an accepted parent connection.
export interface ParentCirclePost {
  id: number;
  user_id: string;
  text: string;
  reactions: Record<string, number>;
  circle_tag: string | null;
  created_at: string;
  identity_revealed: boolean; // true only inside parent connections
  nickname?: string;          // only present when identity_revealed === true
  avatar_emoji?: string;
}

export interface CircleComment {
  id: number;
  post_id: number;
  post_type: Exclude<CircleTab, 'public'>; // comments never allowed on public
  user_id: string;
  nickname: string;
  avatar_emoji: string;
  text: string;
  created_at: string;
}

export interface CircleReaction {
  id: number;
  post_id: number;
  post_type: CircleTab;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface CircleFriendRequest {
  id: number;
  from_user: string;
  to_user: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  // Se'kret Bip language: "Add To My Circle" = friend request
  // "My Circle" = friends list
  // "Shared Circles" = mutual friends
  // "People Who Bip With Me" = followers
}

export interface BlockedUser {
  id: number;
  user_id: string;
  blocked_id: string;
  created_at: string;
}

export interface ReportedPost {
  id: number;
  reporter_id: string;
  post_id: number;
  post_type: CircleTab;
  reason: string | null;
  created_at: string;
}

// Composer destination — used in CircleScreen composer flow.
// Identity resolves automatically from destination.
export interface ComposerDestination {
  tab: CircleTab;
  label: string;       // e.g. '🌎 Public Circle'
  identityLabel: string; // e.g. 'Posting anonymously'
  identityValue: string; // actual value shown (nickname or 'Anonymous')
  allowComments: boolean;
  anonymousOnly: boolean;
}

export const COMPOSER_DESTINATIONS: ComposerDestination[] = [
  {
    tab: 'public',
    label: '🌎 Public Circle',
    identityLabel: 'Posting anonymously',
    identityValue: 'Anonymous',
    allowComments: false,
    anonymousOnly: true,
  },
  {
    tab: 'friends',
    label: '💜 Friends Circle',
    identityLabel: 'Posting as:',
    identityValue: '', // filled at runtime from circle_profiles.nickname
    allowComments: true,
    anonymousOnly: false,
  },
  {
    tab: 'crew',
    label: '🤝 Crew Circle',
    identityLabel: 'Posting as:',
    identityValue: '', // filled at runtime from circle_profiles.nickname
    allowComments: true,
    anonymousOnly: false,
  },
  {
    tab: 'parent',
    label: '🌿 Parent Circle',
    identityLabel: 'Posting anonymously',
    identityValue: 'Anonymous',
    allowComments: true,
    anonymousOnly: true,
  },
];

// Se'kret Bip language map — replace generic social terms app-wide.
export const CIRCLE_TERMS = {
  friendRequest: 'Add To My Circle',
  friends: 'My Circle',
  mutualFriends: 'Shared Circles',
  followers: 'People Who Bip With Me',
} as const;

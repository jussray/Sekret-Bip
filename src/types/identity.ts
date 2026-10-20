import type { ParentLinkState, VerificationState } from './verification';

export type AccountRole = 'teen' | 'parent' | 'helper';
export type AgeBand = 'under13' | '13-15' | '16-17' | '18plus';
export type CircleScope = 'public' | 'friends' | 'crew' | 'parent';
export type VisibilityRule = 'anonymous' | 'trusted' | 'linked_parent' | 'private';
export type CompanionPreference = 'raylene' | 'rylane' | 'cloud' | 'night' | 'oracle' | null;
export type ThemePreference = string;

export interface AvatarConfig {
  avatarKey: string;
  imageUri?: string;
  stickerIds?: string[];
}

export interface AccountIdentity {
  userId: string;
  role: AccountRole;
  ageBand: AgeBand;
  verificationState: VerificationState;
  parentLinkState: ParentLinkState;
  companionPreference: CompanionPreference;
  themePreference: ThemePreference;
  realDisplayName?: string;
}

export interface CircleIdentity {
  accountId: string;
  circle: CircleScope;
  displayName: string;
  avatar: AvatarConfig;
  moodStatus?: string;
  visibility: VisibilityRule;
  discoverable: boolean;
}

export type SupportPreference =
  | 'listen_only'
  | 'check_in_later'
  | 'memes_help'
  | 'no_calls'
  | 'voice_notes_ok'
  | 'advice_if_asked';

export interface CrewIdentity {
  circleIdentityId: string;
  supportPreferences: SupportPreference[];
  crewRole: 'member' | 'lead' | 'invited';
  sharedGoals: string[];
}

export type ProfileMemoryType = 'journal' | 'voice' | 'image' | 'milestone' | 'prompt' | 'mood';
export type ProfileMemoryVisibility = 'private' | 'profile' | 'parent_shared';

export interface ProfileMemory {
  memoryId: string;
  accountId: string;
  type: ProfileMemoryType;
  timestamp: string;
  sourceSurface: string;
  visibility: ProfileMemoryVisibility;
}

export const PRIVATE_ONLY_MEMORY_TYPES: ReadonlySet<ProfileMemoryType> = new Set([
  'journal',
  'voice',
]);

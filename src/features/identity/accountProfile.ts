import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '@/utils/supabase';

export const ACCOUNT_PROFILE_CACHE_KEY = 'bip_account_profile_cache';

export type AccountSide = 'teen' | 'parent';
export type AgeRange = '13-15' | '16-17' | '18-19';
export type ProfileGender = 'girl' | 'boy' | 'other';
export type Companion = 'raylene' | 'rylane' | 'cloud' | 'night';
export type ParentRoomStyle = 'mom' | 'dad';
export type ParentFocus = 'support' | 'listen' | 'repair' | 'learn';

export interface AccountProfile {
  userId: string;
  accountSide: AccountSide;
  privateDisplayName: string;
  onboardingComplete: boolean;
  ageRange: AgeRange | null;
  gender: ProfileGender | null;
  selectedCompanion: Companion | null;
  parentRoomStyle: ParentRoomStyle | null;
  parentFocus: ParentFocus | null;
  circleNickname: string;
  circleAvatarEmoji: string;
  profileUpdatedAt: string | null;
}

export interface SaveAccountProfileInput {
  accountSide: AccountSide;
  privateDisplayName: string;
  onboardingComplete?: boolean;
  ageRange?: AgeRange | null;
  gender?: ProfileGender | null;
  selectedCompanion?: Companion | null;
  parentRoomStyle?: ParentRoomStyle | null;
  parentFocus?: ParentFocus | null;
  circleNickname?: string;
  circleAvatarEmoji?: string;
}

type AppProfileRow = {
  user_id: string;
  account_side: string | null;
  private_display_name: string | null;
  onboarding_complete: boolean | null;
  age_range: string | null;
  gender: string | null;
  selected_companion: string | null;
  parent_room_style: string | null;
  parent_focus: string | null;
  profile_updated_at: string | null;
};

type CircleProfileRow = {
  nickname: string | null;
  avatar_emoji: string | null;
};

const COMPANION_EMOJI: Record<Companion, string> = {
  raylene: '💜',
  rylane: '💙',
  cloud: '☁️',
  night: '🌙',
};

function isAccountSide(value: unknown): value is AccountSide {
  return value === 'teen' || value === 'parent';
}

function isAgeRange(value: unknown): value is AgeRange {
  return value === '13-15' || value === '16-17' || value === '18-19';
}

function isGender(value: unknown): value is ProfileGender {
  return value === 'girl' || value === 'boy' || value === 'other';
}

function isCompanion(value: unknown): value is Companion {
  return value === 'raylene' || value === 'rylane' || value === 'cloud' || value === 'night';
}

function isParentRoomStyle(value: unknown): value is ParentRoomStyle {
  return value === 'mom' || value === 'dad';
}

function isParentFocus(value: unknown): value is ParentFocus {
  return value === 'support' || value === 'listen' || value === 'repair' || value === 'learn';
}

function defaultCircleNickname(side: AccountSide): string {
  return side === 'parent' ? 'Guardian Bip' : 'anonymous bip';
}

function defaultCircleAvatar(input: SaveAccountProfileInput): string {
  if (input.circleAvatarEmoji?.trim()) return input.circleAvatarEmoji.trim();
  if (input.accountSide === 'parent') return input.parentRoomStyle === 'dad' ? '👑' : '💜';
  return COMPANION_EMOJI[input.selectedCompanion ?? 'raylene'];
}

function sanitizeCircleNickname(value: string | undefined, side: AccountSide): string {
  const trimmed = value?.trim().slice(0, 40) ?? '';
  return trimmed || defaultCircleNickname(side);
}

async function readJsonObject(key: string): Promise<Record<string, unknown>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

async function mergeJsonObject(
  key: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const current = await readJsonObject(key);
  await AsyncStorage.setItem(key, JSON.stringify({ ...current, ...patch }));
}

function parseCachedProfile(raw: string | null): AccountProfile | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AccountProfile>;
    if (!isAccountSide(value.accountSide)) return null;
    const privateDisplayName = typeof value.privateDisplayName === 'string'
      ? value.privateDisplayName.trim()
      : '';
    if (!privateDisplayName) return null;
    return {
      userId: typeof value.userId === 'string' ? value.userId : '',
      accountSide: value.accountSide,
      privateDisplayName,
      onboardingComplete: value.onboardingComplete === true,
      ageRange: isAgeRange(value.ageRange) ? value.ageRange : null,
      gender: isGender(value.gender) ? value.gender : null,
      selectedCompanion: isCompanion(value.selectedCompanion) ? value.selectedCompanion : null,
      parentRoomStyle: isParentRoomStyle(value.parentRoomStyle) ? value.parentRoomStyle : null,
      parentFocus: isParentFocus(value.parentFocus) ? value.parentFocus : null,
      circleNickname: typeof value.circleNickname === 'string' && value.circleNickname.trim()
        ? value.circleNickname.trim().slice(0, 40)
        : defaultCircleNickname(value.accountSide),
      circleAvatarEmoji: typeof value.circleAvatarEmoji === 'string' && value.circleAvatarEmoji.trim()
        ? value.circleAvatarEmoji.trim().slice(0, 16)
        : value.accountSide === 'parent' ? '💜' : '🌙',
      profileUpdatedAt: typeof value.profileUpdatedAt === 'string' ? value.profileUpdatedAt : null,
    };
  } catch {
    return null;
  }
}

async function loadLegacyProfile(preferredSide?: AccountSide | null): Promise<AccountProfile | null> {
  const values = await AsyncStorage.multiGet([
    'teen_profile_done',
    'teen_profile_data',
    'teen_circle_identity',
    'parent_profile_done',
    'parent_profile_data',
    'parent_circle_identity',
  ]);
  const map = new Map(values);
  const teenDone = map.get('teen_profile_done') === 'true';
  const parentDone = map.get('parent_profile_done') === 'true';
  const side = preferredSide === 'parent' && parentDone
    ? 'parent'
    : preferredSide === 'teen' && teenDone
      ? 'teen'
      : parentDone && !teenDone
        ? 'parent'
        : teenDone
          ? 'teen'
          : null;
  if (!side) return null;

  try {
    if (side === 'parent') {
      const data = JSON.parse(map.get('parent_profile_data') ?? '{}') as Record<string, unknown>;
      const circle = JSON.parse(map.get('parent_circle_identity') ?? '{}') as Record<string, unknown>;
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      const roomStyle = isParentRoomStyle(data.roomStyle) ? data.roomStyle : null;
      const focus = isParentFocus(data.focus) ? data.focus : null;
      if (!name || !roomStyle || !focus) return null;
      const circleName = typeof circle.circleName === 'string' ? circle.circleName.trim().slice(0, 40) : '';
      return {
        userId: '',
        accountSide: 'parent',
        privateDisplayName: name,
        onboardingComplete: true,
        ageRange: null,
        gender: null,
        selectedCompanion: null,
        parentRoomStyle: roomStyle,
        parentFocus: focus,
        circleNickname: circleName || 'Guardian Bip',
        circleAvatarEmoji: roomStyle === 'dad' ? '👑' : '💜',
        profileUpdatedAt: null,
      };
    }

    const data = JSON.parse(map.get('teen_profile_data') ?? '{}') as Record<string, unknown>;
    const circle = JSON.parse(map.get('teen_circle_identity') ?? '{}') as Record<string, unknown>;
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const ageRange = isAgeRange(data.age) ? data.age : null;
    const gender = isGender(data.gender) ? data.gender : null;
    const companion = isCompanion(data.choice) ? data.choice : null;
    if (!name || !ageRange || !gender || !companion) return null;
    const legacyCircleName = typeof circle.circleName === 'string' ? circle.circleName.trim() : '';
    const circleNickname = legacyCircleName && legacyCircleName.toLowerCase() !== name.toLowerCase()
      ? legacyCircleName.slice(0, 40)
      : 'anonymous bip';
    return {
      userId: '',
      accountSide: 'teen',
      privateDisplayName: name,
      onboardingComplete: true,
      ageRange,
      gender,
      selectedCompanion: companion,
      parentRoomStyle: null,
      parentFocus: null,
      circleNickname,
      circleAvatarEmoji: COMPANION_EMOJI[companion],
      profileUpdatedAt: null,
    };
  } catch {
    return null;
  }
}

export async function loadCachedAccountProfile(
  preferredSide?: AccountSide | null,
): Promise<AccountProfile | null> {
  const cached = parseCachedProfile(await AsyncStorage.getItem(ACCOUNT_PROFILE_CACHE_KEY));
  if (cached && (!preferredSide || cached.accountSide === preferredSide)) return cached;
  return loadLegacyProfile(preferredSide);
}

async function cacheLegacyShape(profile: AccountProfile): Promise<void> {
  if (profile.accountSide === 'teen') {
    await AsyncStorage.setItem('teen_profile_done', profile.onboardingComplete ? 'true' : 'false');
    await mergeJsonObject('teen_profile_data', {
      name: profile.privateDisplayName,
      age: profile.ageRange,
      gender: profile.gender,
      choice: profile.selectedCompanion,
    });
    await mergeJsonObject('teen_circle_identity', {
      circleName: profile.circleNickname,
    });
    return;
  }

  await AsyncStorage.setItem('parent_profile_done', profile.onboardingComplete ? 'true' : 'false');
  await mergeJsonObject('parent_profile_data', {
    name: profile.privateDisplayName,
    roomStyle: profile.parentRoomStyle,
    focus: profile.parentFocus,
  });
  await mergeJsonObject('parent_circle_identity', {
    circleName: profile.circleNickname,
  });
}

export async function cacheAccountProfile(profile: AccountProfile): Promise<void> {
  await AsyncStorage.setItem(ACCOUNT_PROFILE_CACHE_KEY, JSON.stringify(profile));
  await cacheLegacyShape(profile);
}

function mapRemoteProfile(
  row: AppProfileRow,
  circle: CircleProfileRow | null,
): AccountProfile | null {
  if (!isAccountSide(row.account_side)) return null;
  const privateDisplayName = row.private_display_name?.trim() ?? '';
  if (!privateDisplayName) return null;
  return {
    userId: row.user_id,
    accountSide: row.account_side,
    privateDisplayName,
    onboardingComplete: row.onboarding_complete === true,
    ageRange: isAgeRange(row.age_range) ? row.age_range : null,
    gender: isGender(row.gender) ? row.gender : null,
    selectedCompanion: isCompanion(row.selected_companion) ? row.selected_companion : null,
    parentRoomStyle: isParentRoomStyle(row.parent_room_style) ? row.parent_room_style : null,
    parentFocus: isParentFocus(row.parent_focus) ? row.parent_focus : null,
    circleNickname: circle?.nickname?.trim() || defaultCircleNickname(row.account_side),
    circleAvatarEmoji: circle?.avatar_emoji?.trim() || (row.account_side === 'parent' ? '💜' : '🌙'),
    profileUpdatedAt: row.profile_updated_at,
  };
}

export async function loadServerAccountProfile(): Promise<AccountProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user || user.is_anonymous) return null;

  const { data: profileData, error: profileError } = await supabase
    .from('app_profiles')
    .select('user_id,account_side,private_display_name,onboarding_complete,age_range,gender,selected_companion,parent_room_style,parent_focus,profile_updated_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profileData) return null;

  const { data: circleData, error: circleError } = await supabase
    .from('circle_profiles')
    .select('nickname,avatar_emoji')
    .eq('user_id', user.id)
    .maybeSingle();
  if (circleError) throw circleError;

  return mapRemoteProfile(profileData as AppProfileRow, circleData as CircleProfileRow | null);
}

export async function saveAccountProfile(
  input: SaveAccountProfileInput,
): Promise<AccountProfile> {
  const privateDisplayName = input.privateDisplayName.trim();
  if (!privateDisplayName) throw new Error('A private display name is required.');

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user || user.is_anonymous) throw new Error('A permanent signed-in account is required.');

  const onboardingComplete = input.onboardingComplete !== false;
  const circleNickname = sanitizeCircleNickname(input.circleNickname, input.accountSide);
  const circleAvatarEmoji = defaultCircleAvatar(input).slice(0, 16);

  const { error: profileError } = await supabase.rpc('upsert_own_bip_profile', {
    p_account_side: input.accountSide,
    p_private_display_name: privateDisplayName,
    p_onboarding_complete: onboardingComplete,
    p_age_range: input.accountSide === 'teen' ? input.ageRange ?? null : null,
    p_gender: input.accountSide === 'teen' ? input.gender ?? null : null,
    p_selected_companion: input.accountSide === 'teen' ? input.selectedCompanion ?? null : null,
    p_parent_room_style: input.accountSide === 'parent' ? input.parentRoomStyle ?? null : null,
    p_parent_focus: input.accountSide === 'parent' ? input.parentFocus ?? null : null,
  });
  if (profileError) throw profileError;

  const { error: circleError } = await supabase.from('circle_profiles').upsert({
    user_id: user.id,
    nickname: circleNickname,
    avatar_emoji: circleAvatarEmoji,
    account_type: input.accountSide === 'parent' ? 'guardian' : 'teen',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (circleError) throw circleError;

  const profile: AccountProfile = {
    userId: user.id,
    accountSide: input.accountSide,
    privateDisplayName,
    onboardingComplete,
    ageRange: input.accountSide === 'teen' && isAgeRange(input.ageRange) ? input.ageRange : null,
    gender: input.accountSide === 'teen' && isGender(input.gender) ? input.gender : null,
    selectedCompanion: input.accountSide === 'teen' && isCompanion(input.selectedCompanion)
      ? input.selectedCompanion
      : null,
    parentRoomStyle: input.accountSide === 'parent' && isParentRoomStyle(input.parentRoomStyle)
      ? input.parentRoomStyle
      : null,
    parentFocus: input.accountSide === 'parent' && isParentFocus(input.parentFocus)
      ? input.parentFocus
      : null,
    circleNickname,
    circleAvatarEmoji,
    profileUpdatedAt: new Date().toISOString(),
  };

  await cacheAccountProfile(profile);
  return profile;
}

export async function hydrateAccountProfile(
  preferredSide?: AccountSide | null,
): Promise<AccountProfile | null> {
  const local = await loadCachedAccountProfile(preferredSide);
  const supabase = getSupabase();
  if (!supabase) return local;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user || user.is_anonymous) return null;

  const remote = await loadServerAccountProfile();
  if (remote) {
    await cacheAccountProfile(remote);
    return remote;
  }

  // One-time migration for existing installations: if this device has a complete
  // legacy profile but Supabase does not, promote that cache to the account.
  if (local?.onboardingComplete) {
    return saveAccountProfile({
      accountSide: local.accountSide,
      privateDisplayName: local.privateDisplayName,
      onboardingComplete: true,
      ageRange: local.ageRange,
      gender: local.gender,
      selectedCompanion: local.selectedCompanion,
      parentRoomStyle: local.parentRoomStyle,
      parentFocus: local.parentFocus,
      circleNickname: local.circleNickname,
      circleAvatarEmoji: local.circleAvatarEmoji,
    });
  }

  return local;
}

export async function submitGuardianVerification(): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('submit_guardian_verification');
  if (error) throw error;
  return typeof data === 'string' ? data : 'PENDING_GUARDIAN_REVIEW';
}

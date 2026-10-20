import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_IDENTITY_KEYS: string[] = [
  'bip_account_profile_cache',
  'teen_profile_done',
  'teen_profile_data',
  'teen_circle_identity',
  'parent_profile_done',
  'parent_profile_data',
  'parent_circle_identity',
  'bip_onboarding_age',
  'bip_onboarding_name',
  'bip_onboarding_gender',
  'bip_onboarding_companion',
  'bip_onboarding_reflection',
  'sekret_self_discovery_profile',
];

export async function clearProfileIdentityCache(): Promise<void> {
  await AsyncStorage.multiRemove(PROFILE_IDENTITY_KEYS);
}

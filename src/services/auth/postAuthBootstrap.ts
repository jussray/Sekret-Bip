import AsyncStorage from '@react-native-async-storage/async-storage';

import { hydrateAccountProfile, type AccountProfile, type AccountSide } from '@/features/identity/accountProfile';
import { fetchProfessionalBridgeCapability } from '@/services/bridgeFamilyVisitService';
import { getCurrentFounderProfileForRouting, isFounderProfile } from '@/services/founderAudit';
import { getSupabase } from '@/utils/supabase';
import { consentService } from '../../../services/consentService';

export const ONBOARDING_SIDE_KEY = 'bip_onboarding_side';

export interface PostAuthBootstrapResult {
  userId: string;
  profile: AccountProfile | null;
  accountSide: AccountSide;
  requiredConsentsComplete: boolean;
  professionalBridgeAvailable: boolean;
  nextRoute: string;
}

function isAccountSide(value: unknown): value is AccountSide {
  return value === 'teen' || value === 'parent';
}

async function resolvePreferredSide(preferredSide?: AccountSide | null): Promise<AccountSide> {
  if (preferredSide) return preferredSide;
  const stored = await AsyncStorage.getItem(ONBOARDING_SIDE_KEY);
  return isAccountSide(stored) ? stored : 'teen';
}

function routeForBootstrap(
  side: AccountSide,
  profile: AccountProfile | null,
  requiredConsentsComplete: boolean,
  professionalBridgeAvailable: boolean,
): string {
  if (!requiredConsentsComplete) return `/(onboarding)/consent?side=${side}`;
  if (!profile?.onboardingComplete) {
    return side === 'parent' ? '/(onboarding)/parent-setup' : '/(onboarding)/name';
  }
  if (side === 'parent' && professionalBridgeAvailable) return '/bridge-family-visit';
  return '/';
}

async function hydrateAccountProfileForRouting(
  preferredSide: AccountSide,
): Promise<AccountProfile | null> {
  try {
    return await hydrateAccountProfile(preferredSide);
  } catch {
    return null;
  }
}

async function resolveProfessionalBridgeAvailability(
  accountSide: AccountSide,
  profile: AccountProfile | null,
  requiredConsentsComplete: boolean,
): Promise<boolean> {
  if (accountSide !== 'parent' || !profile?.onboardingComplete || !requiredConsentsComplete) return false;
  const capability = await fetchProfessionalBridgeCapability();
  return capability.ok && capability.value?.verificationStatus === 'verified';
}

export async function fetchPostAuthBootstrap(
  preferredSide?: AccountSide | null,
  prehydratedProfile?: AccountProfile | null,
): Promise<PostAuthBootstrapResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase account service is unavailable.');

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data.session?.user;
  if (!user || user.is_anonymous) throw new Error('A permanent signed-in account is required.');

  // Authentication and founder authorization are separate facts. The strict
  // routing lookup throws on provider/read failure so a successful token exchange
  // can never be mistaken for a verified non-founder result.
  const founderProfile = await getCurrentFounderProfileForRouting();
  if (isFounderProfile(founderProfile)) {
    const accountSide = await resolvePreferredSide(preferredSide);
    await AsyncStorage.setItem(ONBOARDING_SIDE_KEY, accountSide);
    return {
      userId: user.id,
      profile: prehydratedProfile ?? null,
      accountSide,
      requiredConsentsComplete: false,
      professionalBridgeAvailable: false,
      nextRoute: '/(dev)/control-room',
    };
  }

  const requestedSide = await resolvePreferredSide(preferredSide);
  const profile = prehydratedProfile === undefined
    ? await hydrateAccountProfileForRouting(requestedSide)
    : prehydratedProfile;
  const accountSide = profile?.accountSide ?? requestedSide;

  await AsyncStorage.setItem(ONBOARDING_SIDE_KEY, accountSide);
  await consentService.load(user.id);
  const requiredConsentsComplete = consentService.hasCompletedOnboarding();
  const professionalBridgeAvailable = await resolveProfessionalBridgeAvailability(
    accountSide,
    profile,
    requiredConsentsComplete,
  );

  return {
    userId: user.id,
    profile,
    accountSide,
    requiredConsentsComplete,
    professionalBridgeAvailable,
    nextRoute: routeForBootstrap(
      accountSide,
      profile,
      requiredConsentsComplete,
      professionalBridgeAvailable,
    ),
  };
}

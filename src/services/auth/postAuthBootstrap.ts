import AsyncStorage from '@react-native-async-storage/async-storage';

import { hydrateAccountProfile, type AccountProfile, type AccountSide } from '@/features/identity/accountProfile';
import { getCurrentFounderProfile, isFounderProfile } from '@/services/founderAudit';
import { getSupabase } from '@/utils/supabase';
import { consentService } from '../../../services/consentService';

export const ONBOARDING_SIDE_KEY = 'bip_onboarding_side';

export interface PostAuthBootstrapResult {
  userId: string;
  profile: AccountProfile | null;
  accountSide: AccountSide;
  requiredConsentsComplete: boolean;
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
): string {
  if (!requiredConsentsComplete) return `/(onboarding)/consent?side=${side}`;
  if (!profile?.onboardingComplete) {
    return side === 'parent' ? '/(onboarding)/parent-setup' : '/(onboarding)/name';
  }
  return '/';
}

async function hydrateAccountProfileForRouting(
  preferredSide: AccountSide,
): Promise<AccountProfile | null> {
  try {
    return await hydrateAccountProfile(preferredSide);
  } catch {
    // Authentication already succeeded. A transient profile/schema read failure
    // must not be presented as bad credentials or bypass consent. Returning null
    // keeps routing fail-closed through the required onboarding path.
    return null;
  }
}

/**
 * Fetches the signed-in account facts that routing depends on after login,
 * signup, email confirmation, or account restoration. The caller must wait for
 * this result instead of navigating on the auth response alone.
 *
 * Founder-authorized accounts route to the founder-only Control Room before
 * public onboarding checks. This does not record consent or open any public
 * teen/parent data path; the destination still enforces the founder profile.
 *
 * Root boot may pass a profile it already hydrated from Supabase so the durable
 * profile is fetched once. Auth screens omit it and use the canonical hydrator.
 */
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

  const founderProfile = await getCurrentFounderProfile();
  if (isFounderProfile(founderProfile)) {
    const accountSide = await resolvePreferredSide(preferredSide);
    await AsyncStorage.setItem(ONBOARDING_SIDE_KEY, accountSide);
    return {
      userId: user.id,
      profile: prehydratedProfile ?? null,
      accountSide,
      requiredConsentsComplete: false,
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

  return {
    userId: user.id,
    profile,
    accountSide,
    requiredConsentsComplete,
    nextRoute: routeForBootstrap(accountSide, profile, requiredConsentsComplete),
  };
}

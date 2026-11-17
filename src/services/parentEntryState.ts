import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDevTestFamily } from '@/features/testing/devTestFamily';
import { captureRuntimeError } from '@/services/runtimeAudit';
import { getSupabase } from '@/utils/supabase';

export type ParentEntryState =
  | { state: 'signed_out' }
  | { state: 'wrong_side'; side: 'teen' }
  | { state: 'profile_required' }
  | { state: 'guardian_verification_required'; verificationState: string }
  | { state: 'parent_link_required' }
  | { state: 'ready'; teenUserId: string; source: 'supabase' | 'dev' };

type ParentProfileRow = {
  account_side: string | null;
  onboarding_complete: boolean | null;
};

type VerificationRow = {
  verification_state: string;
};

type ActiveLinkRow = {
  teen_user_id: string;
};

async function recordResolutionFailure(error: unknown): Promise<void> {
  await captureRuntimeError('parent_window', error, {
    event_type: 'entry_resolution_failed',
    screen: 'parentEntryState.resolveParentEntryState',
    severity: 'error',
  }).catch(() => {});
}

async function clearRelationshipHints(): Promise<void> {
  await AsyncStorage.removeItem('linked_teen_id');
}

async function cacheReadyParent(teenUserId: string): Promise<void> {
  await AsyncStorage.multiSet([
    ['parent_profile_done', 'true'],
    ['linked_teen_id', teenUserId],
  ]);
}

export async function resolveParentEntryState(): Promise<ParentEntryState> {
  const devFamily = await getDevTestFamily();
  if (devFamily) {
    await cacheReadyParent(devFamily.teenId);
    return { state: 'ready', teenUserId: devFamily.teenId, source: 'dev' };
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase account service is unavailable.');

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const user = sessionData.session?.user;
    if (!user || user.is_anonymous) {
      await clearRelationshipHints();
      return { state: 'signed_out' };
    }

    const { data: profileData, error: profileError } = await supabase
      .from('app_profiles')
      .select('account_side,onboarding_complete')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const profile = profileData as ParentProfileRow | null;
    if (profile?.account_side === 'teen') {
      await clearRelationshipHints();
      return { state: 'wrong_side', side: 'teen' };
    }

    if (profile?.account_side !== 'parent' || profile.onboarding_complete !== true) {
      await AsyncStorage.multiRemove(['parent_profile_done', 'linked_teen_id']);
      return { state: 'profile_required' };
    }

    // This is a cache hint only. Routing continues to depend on the server rows
    // below, never on this local value.
    await AsyncStorage.setItem('parent_profile_done', 'true');

    const { data: verificationData, error: verificationError } = await supabase
      .from('account_verification')
      .select('verification_state')
      .eq('user_id', user.id)
      .maybeSingle();
    if (verificationError) throw verificationError;

    const verification = verificationData as VerificationRow | null;
    if (verification?.verification_state !== 'VERIFIED_GUARDIAN') {
      await clearRelationshipHints();
      return {
        state: 'guardian_verification_required',
        verificationState: verification?.verification_state ?? 'UNVERIFIED',
      };
    }

    const { data: linkData, error: linkError } = await supabase
      .from('parent_links')
      .select('teen_user_id')
      .eq('parent_user_id', user.id)
      .eq('status', 'active')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (linkError) throw linkError;

    const link = linkData as ActiveLinkRow | null;
    if (!link?.teen_user_id) {
      await clearRelationshipHints();
      return { state: 'parent_link_required' };
    }

    await cacheReadyParent(link.teen_user_id);
    return { state: 'ready', teenUserId: link.teen_user_id, source: 'supabase' };
  } catch (error) {
    await recordResolutionFailure(error);
    throw error;
  }
}

export function routeForParentEntryState(state: ParentEntryState): string {
  switch (state.state) {
    case 'signed_out':
      return '/(auth)/login';
    case 'wrong_side':
      return '/(teen)/room';
    case 'profile_required':
      return '/(onboarding)/parent-welcome';
    case 'guardian_verification_required':
      return '/(auth)/guardian-verification';
    case 'parent_link_required':
      return '/(onboarding)/parent-link';
    case 'ready':
      return '/(parent)/room';
  }
}

import type { VerificationState } from '@/types/verification';
import { canUnlockSocial, getVerificationRouteTarget, isGuardianVerified } from './verificationState';
import { getSupabase } from '@/utils/supabase';
import { captureRuntimeError } from '@/services/runtimeAudit';

export type AppRouteArea =
  | '(auth)'
  | '(teen)'
  | '(parent)'
  | '(profile)'
  | '(safety)'
  | '(social)'
  | '(dev)'
  | 'unknown';

export interface RouteAccessDecision {
  allowed: boolean;
  redirectTo?: string;
  reason?:
    | 'wrong_user_side'
    | 'verification_required'
    | 'guardian_verification_required'
    | 'manual_review'
    | 'suspended';
}

export interface RouteAccessCheck {
  allowed: boolean;
  reason?: string;
}

const routeAreaFromSegment = (segment?: string): AppRouteArea => {
  switch (segment) {
    case '(auth)':
    case '(teen)':
    case '(parent)':
    case '(profile)':
    case '(safety)':
    case '(social)':
    case '(dev)':
      return segment;
    default:
      return 'unknown';
  }
};

export function decideRouteAccess(options: {
  firstSegment?: string;
  userSide: 'teen' | 'parent' | null;
  verificationState: VerificationState;
}): RouteAccessDecision {
  const area = routeAreaFromSegment(options.firstSegment);

  if (area === '(safety)' || area === '(auth)' || area === '(dev)' || area === 'unknown') {
    return { allowed: true };
  }

  if (options.verificationState === 'SUSPENDED' || options.verificationState === 'GUARDIAN_SUSPENDED') {
    return {
      allowed: false,
      redirectTo: '/(auth)/suspended',
      reason: 'suspended',
    };
  }

  if (options.verificationState === 'MANUAL_REVIEW') {
    return {
      allowed: false,
      redirectTo: '/(safety)/manual-review',
      reason: 'manual_review',
    };
  }

  if (area === '(parent)') {
    if (options.userSide !== 'parent') {
      return {
        allowed: false,
        redirectTo: '/(teen)/room',
        reason: 'wrong_user_side',
      };
    }

    // Guardian verification is account authorization. parent_links are a
    // separate teen-controlled consent boundary and are intentionally absent.
    if (!isGuardianVerified(options.verificationState)) {
      return {
        allowed: false,
        redirectTo: '/(auth)/guardian-verification',
        reason: 'guardian_verification_required',
      };
    }

    return { allowed: true };
  }

  if (options.userSide === 'parent' && (area === '(teen)' || area === '(social)')) {
    return {
      allowed: false,
      redirectTo: isGuardianVerified(options.verificationState)
        ? '/(parent)/room'
        : '/(auth)/guardian-verification',
      reason: isGuardianVerified(options.verificationState)
        ? 'wrong_user_side'
        : 'guardian_verification_required',
    };
  }

  if (area === '(social)' && !canUnlockSocial(options.verificationState)) {
    return {
      allowed: false,
      redirectTo: getVerificationRouteTarget(options.verificationState),
      reason: 'verification_required',
    };
  }

  return { allowed: true };
}

export async function canAccessFounderDev(userId: string): Promise<RouteAccessCheck> {
  const sb = getSupabase();
  if (!sb) {
    await captureRuntimeError('supabase', new Error('Supabase not configured'), {
      event_type: 'profile_lookup_failed',
      screen: 'routeAccess.canAccessFounderDev',
      severity: 'warning',
      metadata: { userId },
    });
    return { allowed: false, reason: 'Missing Supabase client' };
  }

  try {
    const { data, error } = await sb
      .from('app_profiles')
      .select('role,can_view_audits')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    const allowed = Boolean(data?.can_view_audits && ['founder', 'admin', 'developer'].includes(data.role));
    return {
      allowed,
      reason: allowed ? undefined : 'Founder-only route',
    };
  } catch (error) {
    await captureRuntimeError('supabase', error, {
      event_type: 'profile_lookup_failed',
      screen: 'routeAccess.canAccessFounderDev',
      severity: 'warning',
      metadata: { userId },
    });
    return { allowed: false, reason: 'Profile lookup failed' };
  }
}

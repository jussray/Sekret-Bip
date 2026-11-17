import type {
  ParentLinkState,
  VerificationEvent,
  VerificationSnapshot,
  VerificationState,
} from '@/types/verification';

export type VerificationRouteTarget =
  | '/(auth)/welcome'
  | '/(auth)/parent-link-verify'
  | '/(auth)/limited-mode'
  | '/(auth)/guardian-verification'
  | '/(teen)/home'
  | '/(parent)/room'
  | '/(safety)/manual-review'
  | '/(auth)/suspended';

export interface VerificationTransitionResult {
  previous: VerificationSnapshot;
  current: VerificationSnapshot;
  changed: boolean;
}

type Transition = {
  to: VerificationState;
  parentLinkState?: ParentLinkState;
};

export const INITIAL_VERIFICATION_SNAPSHOT: VerificationSnapshot = {
  state: 'UNVERIFIED',
  parentLinkState: 'none',
  updatedAt: new Date(0).toISOString(),
};

// Verification and relationship consent are deliberately orthogonal.
// Parent-link events may change parentLinkState, but they never grant or remove
// VERIFIED_TEEN. Only verification-specific evidence/review events change the
// teen verification authority state.
const TRANSITIONS: Partial<
  Record<VerificationState, Partial<Record<VerificationEvent, Transition>>>
> = {
  UNVERIFIED: {
    SUBMIT_SIGNUP: { to: 'UNVERIFIED' },
    START_PARENT_LINK: { to: 'UNVERIFIED', parentLinkState: 'pending' },
    START_TRUSTED_ADULT_LINK: { to: 'UNVERIFIED', parentLinkState: 'pending' },
    PARENT_APPROVED: { to: 'UNVERIFIED', parentLinkState: 'active' },
    TRUSTED_ADULT_APPROVED: { to: 'UNVERIFIED', parentLinkState: 'active' },
    VERIFICATION_CONFIRMED: { to: 'VERIFIED_TEEN' },
    SUBMIT_GUARDIAN_REVIEW: { to: 'PENDING_GUARDIAN_REVIEW' },
    EMERGENCY_SHUTOFF: { to: 'SUSPENDED' },
    SUSPEND_ACCOUNT: { to: 'SUSPENDED' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  PENDING_PARENT: {
    PARENT_APPROVED: { to: 'PENDING_PARENT', parentLinkState: 'active' },
    VERIFICATION_CONFIRMED: { to: 'VERIFIED_TEEN' },
    PARENT_TIMEOUT: { to: 'PENDING_PARENT', parentLinkState: 'expired' },
    START_TRUSTED_ADULT_LINK: { to: 'PENDING_PARENT', parentLinkState: 'pending' },
    TRUSTED_ADULT_APPROVED: { to: 'PENDING_PARENT', parentLinkState: 'active' },
    INVITE_SENT: { to: 'PENDING_PARENT', parentLinkState: 'pending' },
    EMERGENCY_SHUTOFF: { to: 'SUSPENDED' },
    SUSPEND_ACCOUNT: { to: 'SUSPENDED' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  PENDING_TRUSTED_ADULT: {
    TRUSTED_ADULT_APPROVED: { to: 'PENDING_TRUSTED_ADULT', parentLinkState: 'active' },
    PARENT_APPROVED: { to: 'PENDING_TRUSTED_ADULT', parentLinkState: 'active' },
    VERIFICATION_CONFIRMED: { to: 'VERIFIED_TEEN' },
    INVITE_SENT: { to: 'PENDING_TRUSTED_ADULT', parentLinkState: 'pending' },
    EMERGENCY_SHUTOFF: { to: 'SUSPENDED' },
    SUSPEND_ACCOUNT: { to: 'SUSPENDED' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  LIMITED_MODE: {
    PARENT_LATE_APPROVED: { to: 'LIMITED_MODE', parentLinkState: 'active' },
    PARENT_APPROVED: { to: 'LIMITED_MODE', parentLinkState: 'active' },
    TRUSTED_ADULT_APPROVED: { to: 'LIMITED_MODE', parentLinkState: 'active' },
    VERIFICATION_CONFIRMED: { to: 'VERIFIED_TEEN' },
    TOKEN_EXPIRED: { to: 'EXPIRED' },
    VERIFICATION_EXPIRED: { to: 'EXPIRED' },
    SAFETY_FLAG_TRIGGERED: { to: 'MANUAL_REVIEW' },
    SAFETY_REVIEW_OPENED: { to: 'MANUAL_REVIEW' },
    EMERGENCY_SHUTOFF: { to: 'SUSPENDED' },
    SUSPEND_ACCOUNT: { to: 'SUSPENDED' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  VERIFIED_TEEN: {
    START_PARENT_LINK: { to: 'VERIFIED_TEEN', parentLinkState: 'pending' },
    START_TRUSTED_ADULT_LINK: { to: 'VERIFIED_TEEN', parentLinkState: 'pending' },
    PARENT_APPROVED: { to: 'VERIFIED_TEEN', parentLinkState: 'active' },
    PARENT_LATE_APPROVED: { to: 'VERIFIED_TEEN', parentLinkState: 'active' },
    TRUSTED_ADULT_APPROVED: { to: 'VERIFIED_TEEN', parentLinkState: 'active' },
    PARENT_TIMEOUT: { to: 'VERIFIED_TEEN', parentLinkState: 'expired' },
    TOKEN_EXPIRED: { to: 'EXPIRED' },
    VERIFICATION_EXPIRED: { to: 'EXPIRED' },
    SAFETY_FLAG_TRIGGERED: { to: 'MANUAL_REVIEW' },
    SAFETY_REVIEW_OPENED: { to: 'MANUAL_REVIEW' },
    EMERGENCY_SHUTOFF: { to: 'SUSPENDED' },
    SUSPEND_ACCOUNT: { to: 'SUSPENDED' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  EXPIRED: {
    REVERIFY: { to: 'UNVERIFIED' },
    START_PARENT_LINK: { to: 'EXPIRED', parentLinkState: 'pending' },
    START_TRUSTED_ADULT_LINK: { to: 'EXPIRED', parentLinkState: 'pending' },
    PARENT_APPROVED: { to: 'EXPIRED', parentLinkState: 'active' },
    TRUSTED_ADULT_APPROVED: { to: 'EXPIRED', parentLinkState: 'active' },
    VERIFICATION_CONFIRMED: { to: 'VERIFIED_TEEN' },
    SAFETY_REVIEW_OPENED: { to: 'MANUAL_REVIEW' },
    EMERGENCY_SHUTOFF: { to: 'SUSPENDED' },
    SUSPEND_ACCOUNT: { to: 'SUSPENDED' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  MANUAL_REVIEW: {
    ADMIN_RESTORED: { to: 'VERIFIED_TEEN' },
    VERIFICATION_CONFIRMED: { to: 'VERIFIED_TEEN' },
    ADMIN_SUSPENDED: { to: 'SUSPENDED' },
    EMERGENCY_SHUTOFF: { to: 'SUSPENDED' },
    SUSPEND_ACCOUNT: { to: 'SUSPENDED' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  SUSPENDED: {
    APPEAL_OPENED: { to: 'MANUAL_REVIEW' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  PENDING_GUARDIAN_REVIEW: {
    GUARDIAN_APPROVED: { to: 'VERIFIED_GUARDIAN' },
    GUARDIAN_REVIEW_REJECTED: { to: 'GUARDIAN_REJECTED' },
    GUARDIAN_REVIEW_SUSPENDED: { to: 'GUARDIAN_SUSPENDED' },
    ADMIN_SUSPENDED: { to: 'GUARDIAN_SUSPENDED' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  VERIFIED_GUARDIAN: {
    GUARDIAN_REVIEW_SUSPENDED: { to: 'GUARDIAN_SUSPENDED' },
    ADMIN_SUSPENDED: { to: 'GUARDIAN_SUSPENDED' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  GUARDIAN_REJECTED: {
    SUBMIT_GUARDIAN_REVIEW: { to: 'PENDING_GUARDIAN_REVIEW' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  GUARDIAN_SUSPENDED: {
    ADMIN_RESTORED: { to: 'PENDING_GUARDIAN_REVIEW' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
};

export function canTransitionVerification(
  state: VerificationState,
  event: VerificationEvent,
): boolean {
  return Boolean(TRANSITIONS[state]?.[event]);
}

export function transitionVerification(
  snapshot: VerificationSnapshot,
  event: VerificationEvent,
  options?: { now?: string; reason?: string },
): VerificationTransitionResult {
  const transition = TRANSITIONS[snapshot.state]?.[event];

  if (!transition) {
    return {
      previous: snapshot,
      current: snapshot,
      changed: false,
    };
  }

  const current: VerificationSnapshot = {
    state: transition.to,
    parentLinkState: transition.parentLinkState ?? snapshot.parentLinkState,
    updatedAt: options?.now ?? new Date().toISOString(),
    reason: options?.reason,
  };

  return {
    previous: snapshot,
    current,
    changed: current.state !== snapshot.state
      || current.parentLinkState !== snapshot.parentLinkState
      || current.reason !== snapshot.reason,
  };
}

export function transitionVerificationState(
  snapshot: VerificationSnapshot,
  event: VerificationEvent,
  now = new Date().toISOString(),
): VerificationSnapshot {
  return transitionVerification(snapshot, event, { now }).current;
}

export function createInitialVerificationSnapshot(
  now = new Date().toISOString(),
): VerificationSnapshot {
  return {
    state: 'UNVERIFIED',
    parentLinkState: 'none',
    updatedAt: now,
  };
}

export function isTeenVerified(state: VerificationState): boolean {
  return state === 'VERIFIED_TEEN';
}

export function isGuardianVerified(state: VerificationState): boolean {
  return state === 'VERIFIED_GUARDIAN';
}

export function isGuardianReviewPending(state: VerificationState): boolean {
  return state === 'PENDING_GUARDIAN_REVIEW';
}

export function isLimitedMode(state: VerificationState): boolean {
  return state === 'UNVERIFIED'
    || state === 'PENDING_PARENT'
    || state === 'PENDING_TRUSTED_ADULT'
    || state === 'LIMITED_MODE'
    || state === 'EXPIRED';
}

export function canUnlockSocial(state: VerificationState): boolean {
  return state === 'VERIFIED_TEEN';
}

export function shouldShowLimitedMode(state: VerificationState): boolean {
  return isLimitedMode(state);
}

export function getVerificationRouteTarget(
  state: VerificationState,
): VerificationRouteTarget {
  switch (state) {
    case 'UNVERIFIED':
      return '/(auth)/limited-mode';
    case 'PENDING_PARENT':
    case 'PENDING_TRUSTED_ADULT':
      return '/(auth)/parent-link-verify';
    case 'LIMITED_MODE':
    case 'EXPIRED':
      return '/(auth)/limited-mode';
    case 'VERIFIED_TEEN':
      return '/(teen)/home';
    case 'MANUAL_REVIEW':
      return '/(safety)/manual-review';
    case 'SUSPENDED':
    case 'GUARDIAN_SUSPENDED':
      return '/(auth)/suspended';
    case 'PENDING_GUARDIAN_REVIEW':
    case 'GUARDIAN_REJECTED':
      return '/(auth)/guardian-verification';
    case 'VERIFIED_GUARDIAN':
      return '/(parent)/room';
  }
}

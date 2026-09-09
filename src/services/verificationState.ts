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

const TRANSITIONS: Partial<
  Record<VerificationState, Partial<Record<VerificationEvent, Transition>>>
> = {
  UNVERIFIED: {
    SUBMIT_SIGNUP: { to: 'PENDING_PARENT', parentLinkState: 'pending' },
    START_PARENT_LINK: { to: 'PENDING_PARENT', parentLinkState: 'pending' },
    START_TRUSTED_ADULT_LINK: {
      to: 'PENDING_TRUSTED_ADULT',
      parentLinkState: 'pending',
    },
    SUBMIT_GUARDIAN_REVIEW: { to: 'PENDING_GUARDIAN_REVIEW', parentLinkState: 'none' },
    EMERGENCY_SHUTOFF: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    SUSPEND_ACCOUNT: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  PENDING_PARENT: {
    PARENT_APPROVED: { to: 'VERIFIED_TEEN', parentLinkState: 'active' },
    VERIFICATION_CONFIRMED: { to: 'VERIFIED_TEEN', parentLinkState: 'active' },
    PARENT_TIMEOUT: {
      to: 'PENDING_TRUSTED_ADULT',
      parentLinkState: 'pending',
    },
    START_TRUSTED_ADULT_LINK: {
      to: 'PENDING_TRUSTED_ADULT',
      parentLinkState: 'pending',
    },
    INVITE_SENT: { to: 'LIMITED_MODE', parentLinkState: 'pending' },
    EMERGENCY_SHUTOFF: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    SUSPEND_ACCOUNT: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  PENDING_TRUSTED_ADULT: {
    TRUSTED_ADULT_APPROVED: { to: 'LIMITED_MODE', parentLinkState: 'pending' },
    PARENT_APPROVED: { to: 'VERIFIED_TEEN', parentLinkState: 'active' },
    VERIFICATION_CONFIRMED: { to: 'VERIFIED_TEEN', parentLinkState: 'active' },
    INVITE_SENT: { to: 'LIMITED_MODE', parentLinkState: 'pending' },
    EMERGENCY_SHUTOFF: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    SUSPEND_ACCOUNT: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  LIMITED_MODE: {
    PARENT_LATE_APPROVED: { to: 'VERIFIED_TEEN', parentLinkState: 'active' },
    PARENT_APPROVED: { to: 'VERIFIED_TEEN', parentLinkState: 'active' },
    VERIFICATION_CONFIRMED: { to: 'VERIFIED_TEEN', parentLinkState: 'active' },
    TOKEN_EXPIRED: { to: 'EXPIRED', parentLinkState: 'expired' },
    VERIFICATION_EXPIRED: { to: 'EXPIRED', parentLinkState: 'expired' },
    SAFETY_FLAG_TRIGGERED: { to: 'MANUAL_REVIEW' },
    SAFETY_REVIEW_OPENED: { to: 'MANUAL_REVIEW' },
    EMERGENCY_SHUTOFF: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    SUSPEND_ACCOUNT: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  VERIFIED_TEEN: {
    TOKEN_EXPIRED: { to: 'EXPIRED', parentLinkState: 'expired' },
    VERIFICATION_EXPIRED: { to: 'EXPIRED', parentLinkState: 'expired' },
    SAFETY_FLAG_TRIGGERED: { to: 'MANUAL_REVIEW' },
    SAFETY_REVIEW_OPENED: { to: 'MANUAL_REVIEW' },
    EMERGENCY_SHUTOFF: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    SUSPEND_ACCOUNT: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  EXPIRED: {
    REVERIFY: { to: 'PENDING_PARENT', parentLinkState: 'pending' },
    START_PARENT_LINK: { to: 'PENDING_PARENT', parentLinkState: 'pending' },
    START_TRUSTED_ADULT_LINK: {
      to: 'PENDING_TRUSTED_ADULT',
      parentLinkState: 'pending',
    },
    SAFETY_REVIEW_OPENED: { to: 'MANUAL_REVIEW' },
    EMERGENCY_SHUTOFF: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    SUSPEND_ACCOUNT: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  MANUAL_REVIEW: {
    ADMIN_RESTORED: { to: 'VERIFIED_TEEN', parentLinkState: 'active' },
    VERIFICATION_CONFIRMED: { to: 'VERIFIED_TEEN', parentLinkState: 'active' },
    ADMIN_SUSPENDED: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    EMERGENCY_SHUTOFF: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    SUSPEND_ACCOUNT: { to: 'SUSPENDED', parentLinkState: 'revoked' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  SUSPENDED: {
    APPEAL_OPENED: { to: 'MANUAL_REVIEW' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  PENDING_GUARDIAN_REVIEW: {
    GUARDIAN_APPROVED: { to: 'VERIFIED_GUARDIAN', parentLinkState: 'none' },
    GUARDIAN_REVIEW_REJECTED: { to: 'GUARDIAN_REJECTED', parentLinkState: 'none' },
    GUARDIAN_REVIEW_SUSPENDED: { to: 'GUARDIAN_SUSPENDED', parentLinkState: 'none' },
    ADMIN_SUSPENDED: { to: 'GUARDIAN_SUSPENDED', parentLinkState: 'none' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  VERIFIED_GUARDIAN: {
    GUARDIAN_REVIEW_SUSPENDED: { to: 'GUARDIAN_SUSPENDED', parentLinkState: 'none' },
    ADMIN_SUSPENDED: { to: 'GUARDIAN_SUSPENDED', parentLinkState: 'none' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  GUARDIAN_REJECTED: {
    SUBMIT_GUARDIAN_REVIEW: { to: 'PENDING_GUARDIAN_REVIEW', parentLinkState: 'none' },
    RESET: { to: 'UNVERIFIED', parentLinkState: 'none' },
  },
  GUARDIAN_SUSPENDED: {
    ADMIN_RESTORED: { to: 'PENDING_GUARDIAN_REVIEW', parentLinkState: 'none' },
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
    changed: true,
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

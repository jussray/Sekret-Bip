import type { AgeBand, AgeEvidence, GuardianApproval } from './jurisdictionPolicy';

export type AgeSignalNormalizationReason =
  | 'not_shared'
  | 'verification_required'
  | 'provider_unavailable'
  | 'invalid_range'
  | 'insufficient_precision';

export type AgeSignalNormalizationResult =
  | {
      status: 'normalized';
      evidence: AgeEvidence;
    }
  | {
      status: 'needs_review';
      reason: AgeSignalNormalizationReason;
    };

export type AppleAgeRangeDeclaration =
  | 'self_declared'
  | 'guardian_declared'
  | 'confirmed'
  | 'unknown';

export type AppleSignificantChangeStatus =
  | 'not_applicable'
  | 'required'
  | 'approved'
  | 'declined'
  | 'unknown';

export interface AppleAgeRangeSignal {
  response: 'shared' | 'declined_sharing' | 'unavailable';
  lowerBound: number | null;
  upperBound: number | null;
  declaration: AppleAgeRangeDeclaration;
  significantChangeStatus: AppleSignificantChangeStatus;
}

export type GooglePlayAgeRangeSource = 'tier_a' | 'tier_b' | 'tier_c' | 'tier_d' | 'unknown';

export type GooglePlaySignificantChangeStatus =
  | 'approved'
  | 'pending'
  | 'declined'
  | 'not_applicable'
  | 'unknown';

export interface GooglePlayAgeSignal {
  accessStatus: 'shared' | 'not_shared' | 'verification_required' | 'unknown';
  ageLower: number | null;
  ageUpper: number | null;
  ageRangeSource: GooglePlayAgeRangeSource;
  significantChangeStatus: GooglePlaySignificantChangeStatus;
}

function isValidBound(value: number | null): boolean {
  return value === null || (Number.isInteger(value) && value >= 0);
}

export function ageBandFromProviderBounds(
  lowerBound: number | null,
  upperBound: number | null,
): AgeBand | null {
  if (!isValidBound(lowerBound) || !isValidBound(upperBound)) return null;
  if (lowerBound !== null && upperBound !== null && lowerBound > upperBound) return null;

  if (lowerBound === null && upperBound !== null && upperBound <= 12) return 'under-13';
  if (lowerBound !== null && lowerBound >= 13 && upperBound !== null && upperBound <= 15) {
    return '13-15';
  }
  if (lowerBound !== null && lowerBound >= 16 && upperBound !== null && upperBound <= 17) {
    return '16-17';
  }
  if (lowerBound !== null && lowerBound >= 18 && upperBound !== null && upperBound <= 19) {
    return '18-19';
  }

  // A provider range such as 18+ does not prove Bip's narrower 18-19 band.
  // Likewise, a range crossing Bip boundaries cannot be silently narrowed.
  return null;
}

function rangeFailureReason(
  lowerBound: number | null,
  upperBound: number | null,
): AgeSignalNormalizationReason {
  if (!isValidBound(lowerBound) || !isValidBound(upperBound)) return 'invalid_range';
  if (lowerBound !== null && upperBound !== null && lowerBound > upperBound) return 'invalid_range';
  return 'insufficient_precision';
}

function appleGuardianApproval(status: AppleSignificantChangeStatus): GuardianApproval {
  switch (status) {
    case 'approved':
      return 'granted';
    case 'declined':
      return 'denied';
    case 'required':
      return 'required';
    case 'not_applicable':
      return 'not_required';
    default:
      return 'unknown';
  }
}

function googleGuardianApproval(status: GooglePlaySignificantChangeStatus): GuardianApproval {
  switch (status) {
    case 'approved':
      return 'granted';
    case 'declined':
      return 'denied';
    case 'pending':
      return 'required';
    case 'not_applicable':
      return 'not_required';
    default:
      return 'unknown';
  }
}

export function normalizeAppleAgeRange(
  signal: AppleAgeRangeSignal,
): AgeSignalNormalizationResult {
  if (signal.response === 'declined_sharing') {
    return { status: 'needs_review', reason: 'not_shared' };
  }
  if (signal.response === 'unavailable') {
    return { status: 'needs_review', reason: 'provider_unavailable' };
  }

  const ageBand = ageBandFromProviderBounds(signal.lowerBound, signal.upperBound);
  if (!ageBand) {
    return {
      status: 'needs_review',
      reason: rangeFailureReason(signal.lowerBound, signal.upperBound),
    };
  }

  return {
    status: 'normalized',
    evidence: {
      source: 'apple_declared_age_range',
      ageBand,
      guardianApproval: appleGuardianApproval(signal.significantChangeStatus),
      rawEvidenceStored: false,
    },
  };
}

export function normalizeGooglePlayAgeSignal(
  signal: GooglePlayAgeSignal,
): AgeSignalNormalizationResult {
  if (signal.accessStatus === 'not_shared') {
    return { status: 'needs_review', reason: 'not_shared' };
  }
  if (signal.accessStatus === 'verification_required') {
    return { status: 'needs_review', reason: 'verification_required' };
  }
  if (signal.accessStatus === 'unknown') {
    return { status: 'needs_review', reason: 'provider_unavailable' };
  }

  const ageBand = ageBandFromProviderBounds(signal.ageLower, signal.ageUpper);
  if (!ageBand) {
    return {
      status: 'needs_review',
      reason: rangeFailureReason(signal.ageLower, signal.ageUpper),
    };
  }

  return {
    status: 'normalized',
    evidence: {
      source: 'google_play_age_signals',
      ageBand,
      guardianApproval: googleGuardianApproval(signal.significantChangeStatus),
      rawEvidenceStored: false,
    },
  };
}

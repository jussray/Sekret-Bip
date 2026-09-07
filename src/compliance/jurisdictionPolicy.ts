export type AgeBand = 'under-13' | '13-15' | '16-17' | '18-19';

export type AgeEvidenceSource =
  | 'self_declared_age_band'
  | 'apple_declared_age_range'
  | 'google_play_age_signals'
  | 'guardian_confirmation'
  | 'third_party_age_assurance';

export type GuardianApproval = 'unknown' | 'not_required' | 'required' | 'granted' | 'denied';

export type JurisdictionKey =
  | 'us-general'
  | 'us-texas'
  | 'uk'
  | 'eu'
  | 'australia'
  | 'brazil'
  | 'other';

export type LaunchDisposition = 'allowed' | 'review_required' | 'market_hold';

export interface AgeEvidence {
  source: AgeEvidenceSource;
  ageBand: AgeBand;
  guardianApproval: GuardianApproval;
  /**
   * Bip stores the normalized result, not raw age-assurance material.
   * Raw provider evidence remains provider-controlled unless a separately
   * reviewed requirement proves collection is necessary.
   */
  rawEvidenceStored: false;
}

export interface JurisdictionPolicy {
  jurisdiction: JurisdictionKey;
  launchDisposition: LaunchDisposition;
  providerAgeSignal: 'optional' | 'review_required';
  significantChangeReview: boolean;
}

export interface FeaturePermissions {
  teenAccount: 'blocked' | 'guardian_required' | 'allowed';
  teenMode: 'blocked' | 'guardian_required' | 'allowed';
  guardianFlow: 'required' | 'available';
  rawAgeEvidenceStorage: 'forbidden';
  distribution: LaunchDisposition;
  significantChangeReview: boolean;
}

const JURISDICTION_POLICIES: Record<JurisdictionKey, JurisdictionPolicy> = {
  'us-general': {
    jurisdiction: 'us-general',
    launchDisposition: 'allowed',
    providerAgeSignal: 'optional',
    significantChangeReview: false,
  },
  'us-texas': {
    jurisdiction: 'us-texas',
    launchDisposition: 'review_required',
    providerAgeSignal: 'review_required',
    significantChangeReview: true,
  },
  uk: {
    jurisdiction: 'uk',
    launchDisposition: 'review_required',
    providerAgeSignal: 'review_required',
    significantChangeReview: false,
  },
  eu: {
    jurisdiction: 'eu',
    launchDisposition: 'review_required',
    providerAgeSignal: 'review_required',
    significantChangeReview: false,
  },
  australia: {
    jurisdiction: 'australia',
    launchDisposition: 'review_required',
    providerAgeSignal: 'review_required',
    significantChangeReview: false,
  },
  brazil: {
    jurisdiction: 'brazil',
    launchDisposition: 'market_hold',
    providerAgeSignal: 'review_required',
    significantChangeReview: false,
  },
  other: {
    jurisdiction: 'other',
    launchDisposition: 'review_required',
    providerAgeSignal: 'review_required',
    significantChangeReview: false,
  },
};

export function getJurisdictionPolicy(jurisdiction: JurisdictionKey): JurisdictionPolicy {
  return JURISDICTION_POLICIES[jurisdiction];
}

export function resolveFeaturePermissions(
  evidence: AgeEvidence,
  jurisdiction: JurisdictionKey,
): FeaturePermissions {
  const policy = getJurisdictionPolicy(jurisdiction);

  if (evidence.ageBand === 'under-13') {
    return {
      teenAccount: 'blocked',
      teenMode: 'blocked',
      guardianFlow: 'required',
      rawAgeEvidenceStorage: 'forbidden',
      distribution: policy.launchDisposition,
      significantChangeReview: policy.significantChangeReview,
    };
  }

  if (evidence.ageBand === '13-15' || evidence.ageBand === '16-17') {
    return {
      teenAccount: 'guardian_required',
      teenMode: 'guardian_required',
      guardianFlow: 'required',
      rawAgeEvidenceStorage: 'forbidden',
      distribution: policy.launchDisposition,
      significantChangeReview: policy.significantChangeReview,
    };
  }

  return {
    teenAccount: 'allowed',
    teenMode: 'allowed',
    guardianFlow: 'available',
    rawAgeEvidenceStorage: 'forbidden',
    distribution: policy.launchDisposition,
    significantChangeReview: policy.significantChangeReview,
  };
}

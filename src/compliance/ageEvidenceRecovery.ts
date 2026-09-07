import type { AgeSignalNormalizationReason } from './ageSignalAdapters';
import {
  getJurisdictionPolicy,
  type JurisdictionKey,
  type LaunchDisposition,
} from './jurisdictionPolicy';

export type AgeEvidenceRecoveryAction =
  | 'continue_privacy_minimal_flow'
  | 'require_provider_resolution'
  | 'block_affected_feature'
  | 'hold_market';

export interface AgeEvidenceRecoveryDecision {
  action: AgeEvidenceRecoveryAction;
  distribution: LaunchDisposition;
  mayUseSelfDeclaredAgeBand: boolean;
  retryProvider: boolean;
  reason: AgeSignalNormalizationReason;
}

/**
 * Decide how Bip recovers when a store/provider age signal cannot be normalized.
 *
 * This function never upgrades missing or ambiguous provider evidence into an
 * allowed age decision. It only chooses the next recovery path. Actual feature
 * permissions still require normalized AgeEvidence plus JurisdictionPolicy.
 */
export function resolveAgeEvidenceRecovery(
  reason: AgeSignalNormalizationReason,
  jurisdiction: JurisdictionKey,
): AgeEvidenceRecoveryDecision {
  const policy = getJurisdictionPolicy(jurisdiction);

  if (policy.launchDisposition === 'market_hold') {
    return {
      action: 'hold_market',
      distribution: 'market_hold',
      mayUseSelfDeclaredAgeBand: false,
      retryProvider: false,
      reason,
    };
  }

  if (reason === 'verification_required') {
    return {
      action: 'require_provider_resolution',
      distribution: policy.launchDisposition,
      mayUseSelfDeclaredAgeBand: false,
      retryProvider: true,
      reason,
    };
  }

  if (reason === 'invalid_range') {
    return {
      action: 'block_affected_feature',
      distribution: policy.launchDisposition,
      mayUseSelfDeclaredAgeBand: false,
      retryProvider: true,
      reason,
    };
  }

  if (policy.providerAgeSignal === 'optional') {
    return {
      action: 'continue_privacy_minimal_flow',
      distribution: policy.launchDisposition,
      mayUseSelfDeclaredAgeBand: true,
      retryProvider: reason === 'provider_unavailable',
      reason,
    };
  }

  if (reason === 'provider_unavailable') {
    return {
      action: 'block_affected_feature',
      distribution: policy.launchDisposition,
      mayUseSelfDeclaredAgeBand: false,
      retryProvider: true,
      reason,
    };
  }

  return {
    action: 'require_provider_resolution',
    distribution: policy.launchDisposition,
    mayUseSelfDeclaredAgeBand: false,
    retryProvider: false,
    reason,
  };
}

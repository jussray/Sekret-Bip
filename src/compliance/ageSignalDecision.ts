import type { AgeSignalNormalizationResult } from './ageSignalAdapters';
import { resolveAgeEvidenceRecovery, type AgeEvidenceRecoveryDecision } from './ageEvidenceRecovery';
import {
  resolveFeaturePermissions,
  type AgeEvidence,
  type FeaturePermissions,
  type JurisdictionKey,
} from './jurisdictionPolicy';

export type AgeSignalDecisionOutcome =
  | {
      status: 'policy_resolved';
      evidence: AgeEvidence;
      permissions: FeaturePermissions;
    }
  | {
      status: 'recovery_required';
      recovery: AgeEvidenceRecoveryDecision;
    };

/**
 * Canonical policy entry point after a provider adapter has attempted
 * normalization. Provider-specific bridges should hand their normalization
 * result here instead of calculating feature permissions themselves.
 */
export function resolveAgeSignalDecision(
  normalization: AgeSignalNormalizationResult,
  jurisdiction: JurisdictionKey,
): AgeSignalDecisionOutcome {
  if (normalization.status === 'needs_review') {
    return {
      status: 'recovery_required',
      recovery: resolveAgeEvidenceRecovery(normalization.reason, jurisdiction),
    };
  }

  return {
    status: 'policy_resolved',
    evidence: normalization.evidence,
    permissions: resolveFeaturePermissions(normalization.evidence, jurisdiction),
  };
}

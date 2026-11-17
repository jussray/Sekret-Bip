import type { DoorbellEvent, DoorbellEventPreview } from '@/types/doorbell';

const SUMMARY_BY_TYPE: Record<DoorbellEvent['type'], string> = {
  VERIFICATION_COMPLETED: 'Teen verification was completed.',
  SAFETY_REPORT_FILED: 'A safety report was submitted.',
  BLOCK_USED: 'A block safety control was used.',
  SUSPICIOUS_ACCOUNT_REMOVED: 'Bip removed a suspicious account from teen spaces.',
  EMERGENCY_ESCALATION: 'An urgent safety action was recorded.',
  TRUSTED_ADULT_CHANGED: 'The trusted-adult connection changed.',
  VERIFICATION_EXPIRED: 'Teen verification needs to be renewed.',
  MANUAL_REVIEW_OPENED: 'A safety review was opened.',
};

export function createDoorbellEventPreview(
  event: Pick<DoorbellEvent, 'type' | 'severity' | 'recommendedAction'>,
): DoorbellEventPreview {
  return {
    type: event.type,
    severity: event.severity,
    summary: SUMMARY_BY_TYPE[event.type],
    recommendedAction: event.recommendedAction,
  };
}

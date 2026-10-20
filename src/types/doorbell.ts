import type { SafetySeverity } from './safety';

export type DoorbellEventType =
  | 'VERIFICATION_COMPLETED'
  | 'SAFETY_REPORT_FILED'
  | 'BLOCK_USED'
  | 'SUSPICIOUS_ACCOUNT_REMOVED'
  | 'EMERGENCY_ESCALATION'
  | 'TRUSTED_ADULT_CHANGED'
  | 'VERIFICATION_EXPIRED'
  | 'MANUAL_REVIEW_OPENED';

export interface DoorbellEvent {
  eventId: string;
  teenUserId: string;
  type: DoorbellEventType;
  severity: SafetySeverity;
  timestamp: string;
  summary: string;
  recommendedAction?: string;
}

export interface DoorbellEventPreview {
  type: DoorbellEventType;
  severity: SafetySeverity;
  summary: string;
  recommendedAction?: string;
}

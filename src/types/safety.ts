export type SafetySeverity = 'info' | 'watch' | 'urgent';

export type SafetyEventType =
  | 'REPORT_FILED'
  | 'BLOCK_USED'
  | 'SUSPICIOUS_ACCOUNT_REMOVED'
  | 'EMERGENCY_ESCALATION'
  | 'MANUAL_REVIEW_OPENED'
  | 'TRUSTED_ADULT_CHANGED';

export interface SafetyEvent {
  eventId: string;
  teenUserId: string;
  type: SafetyEventType;
  severity: SafetySeverity;
  createdAt: string;
  summary: string;
  recommendedAction?: string;
  privatePayload?: Record<string, unknown>;
}

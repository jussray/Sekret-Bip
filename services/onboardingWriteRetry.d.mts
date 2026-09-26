export const ONBOARDING_WRITE_MAX_RETRIES: number;
export function classifyOnboardingZeroRow(
  refreshedStageRank: number,
  requestedStageRank: number,
): 'satisfied' | 'retry';
export function nextOnboardingWriteAttempt(attempt: number): number;

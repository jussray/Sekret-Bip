export const ONBOARDING_WRITE_MAX_RETRIES = 2;

/**
 * A zero-row compare-and-swap is successful only when a re-read proves another
 * writer already moved the row to or beyond the requested rank.
 */
export function classifyOnboardingZeroRow(refreshedStageRank, requestedStageRank) {
  return refreshedStageRank >= requestedStageRank ? 'satisfied' : 'retry';
}

/**
 * Returns the next bounded retry attempt or throws an explicit conflict error.
 */
export function nextOnboardingWriteAttempt(attempt) {
  if (!Number.isInteger(attempt) || attempt < 0) {
    throw new Error('Invalid onboarding write retry attempt.');
  }
  if (attempt >= ONBOARDING_WRITE_MAX_RETRIES) {
    throw new Error('Onboarding write conflict: the row did not advance after bounded retries.');
  }
  return attempt + 1;
}

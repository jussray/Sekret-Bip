import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ONBOARDING_WRITE_MAX_RETRIES,
  classifyOnboardingZeroRow,
  nextOnboardingWriteAttempt,
} from '../services/onboardingWriteRetry.mjs';

test('zero-row writes are accepted only when a reread proves a concurrent winner', () => {
  assert.equal(classifyOnboardingZeroRow(5, 4), 'satisfied');
  assert.equal(classifyOnboardingZeroRow(4, 4), 'satisfied');
  assert.equal(classifyOnboardingZeroRow(3, 4), 'retry');
});

test('zero-row write retries are bounded and explicit', () => {
  assert.equal(ONBOARDING_WRITE_MAX_RETRIES, 2);
  assert.equal(nextOnboardingWriteAttempt(0), 1);
  assert.equal(nextOnboardingWriteAttempt(1), 2);
  assert.throws(() => nextOnboardingWriteAttempt(2), /bounded retries/);
  assert.throws(() => nextOnboardingWriteAttempt(-1), /Invalid onboarding write retry attempt/);
});

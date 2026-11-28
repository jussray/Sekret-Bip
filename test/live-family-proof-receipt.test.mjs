import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyLiveFamilyProof } from '../scripts/verify-live-family-proof.mjs';

const SHA = '0123456789abcdef0123456789abcdef01234567';
const URL = 'https://bip-preview.pages.dev';

function receipt() {
  return {
    schemaVersion: 1,
    exactHeadSha: SHA,
    canonicalUrl: URL,
    accountClasses: ['disposable-permanent-teen', 'controlled-verified-guardian', 'guardian-managed-bip-jr-profile'],
    checkpoints: {
      permanentTeenSignIn: 'passed',
      teenOnboarding: 'passed-real-ui',
      circlePseudonymity: 'passed-distinct-profile-row',
      parentLink: 'passed-real-ui',
      parentLinkDidNotVerifyTeen: 'passed',
      parentPrivatePullDenied: 'passed',
      bridgeSignalWrite: 'passed-real-ui-and-provider-row',
      parentBridgeSignalVisible: 'passed-real-ui',
      teenAgeAssurance: 'passed-explicit-guardian-action',
      bipJrProvisioning: 'passed-real-ui-and-consent-receipt',
      bipJrArchive: 'passed-consent-revoked',
    },
    privacy: {
      screenshotsCaptured: false,
      traceCaptured: false,
      videoCaptured: false,
      credentialsWrittenToReceipt: false,
      authTokensWrittenToReceipt: false,
      userIdsWrittenToReceipt: false,
      privateMessageContentWrittenToReceipt: false,
      syntheticContentOnly: true,
    },
    observedAt: '2026-11-12T12:00:00.000Z',
  };
}

const options = { expectedSha: SHA, expectedBaseUrl: URL };

test('accepts an exact-head, complete, privacy-safe authenticated family proof', () => {
  assert.deepEqual(verifyLiveFamilyProof(receipt(), options), {
    exactHeadSha: SHA,
    previewOrigin: URL,
    checkpointsVerified: 11,
    privacyVerified: true,
  });
});

test('rejects stale, malformed, or cross-origin proof', () => {
  assert.throws(() => verifyLiveFamilyProof(receipt(), { ...options, expectedSha: 'wrong' }), /EXPECTED_HEAD_SHA_INVALID/);
  assert.throws(() => verifyLiveFamilyProof({ ...receipt(), exactHeadSha: 'f'.repeat(40) }, options), /FAMILY_PROOF_SHA_MISMATCH/);
  assert.throws(() => verifyLiveFamilyProof({ ...receipt(), canonicalUrl: 'https://other.pages.dev' }, options), /FAMILY_PROOF_ORIGIN_MISMATCH/);
  assert.throws(() => verifyLiveFamilyProof(receipt(), { ...options, expectedBaseUrl: 'https://sekretbip.net' }), /PREVIEW_ORIGIN_REQUIRED/);
});

test('rejects skipped, omitted, or invented checkpoints', () => {
  const skipped = receipt();
  skipped.checkpoints.parentPrivatePullDenied = 'skipped';
  assert.throws(() => verifyLiveFamilyProof(skipped, options), /FAMILY_PROOF_CHECKPOINT_INVALID/);

  const omitted = receipt();
  delete omitted.checkpoints.bipJrArchive;
  assert.throws(() => verifyLiveFamilyProof(omitted, options), /FAMILY_PROOF_CHECKPOINT_INVALID/);

  const invented = receipt();
  invented.checkpoints.fakeGreen = 'passed';
  assert.throws(() => verifyLiveFamilyProof(invented, options), /FAMILY_PROOF_UNEXPECTED_FIELD/);
});

test('rejects privacy-unsafe or unsupported fields', () => {
  const traced = receipt();
  traced.privacy.traceCaptured = true;
  assert.throws(() => verifyLiveFamilyProof(traced, options), /FAMILY_PROOF_PRIVACY_INVALID/);

  const personal = receipt();
  personal.accountEmail = 'someone@example.com';
  assert.throws(() => verifyLiveFamilyProof(personal, options), /FAMILY_PROOF_UNEXPECTED_FIELD/);

  const leaked = receipt();
  leaked.privacy.accessToken = 'not-allowed';
  assert.throws(() => verifyLiveFamilyProof(leaked, options), /FAMILY_PROOF_UNEXPECTED_FIELD/);
});

test('requires timestamp and actual account classes, not empty placeholders', () => {
  assert.throws(() => verifyLiveFamilyProof({ ...receipt(), observedAt: null }, options), /FAMILY_PROOF_TIMESTAMP_INVALID/);
  assert.throws(() => verifyLiveFamilyProof({ ...receipt(), accountClasses: [] }, options), /FAMILY_PROOF_ACCOUNT_CLASSES_INVALID/);
});

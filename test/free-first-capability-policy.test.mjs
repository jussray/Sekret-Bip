import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const policyUrl = new URL('../config/free-first-capability-policy.json', import.meta.url);
const policy = JSON.parse(await readFile(policyUrl, 'utf8'));

test('free-first routing keeps safety and privacy ahead of cost', () => {
  assert.equal(policy.policy, 'free-first-capability-routing');
  assert.deepEqual(policy.routingOrder, [
    'EXISTING_INCLUDED_CAPABILITY',
    'LOCAL_NO_PROVIDER_FEE',
    'HOSTED_FREE_ALLOWANCE',
    'PAID',
  ]);
  assert.equal(policy.rules.costNeverOverridesSafety, true);
  assert.equal(policy.rules.costNeverOverridesPrivacy, true);
  assert.equal(policy.bipBoundary.teenAndFamilyPrivacyOutranksCost, true);
  assert.equal(policy.bipBoundary.sensitiveContentMayNotBeSentToAProviderMerelyBecauseItIsFree, true);
});

test('paid capability is fallback only after current eligibility evidence', () => {
  assert.equal(policy.rules.providerFreeStatusMustBeReverified, true);
  assert.equal(policy.rules.providerNamesAreNotPermanentlyClassifiedAsFree, true);
  assert.equal(policy.rules.paidFallbackRequiresNoEligibleLowerCostCandidate, true);
  assert.equal(policy.rules.unknownCommercialRightsFailClosedWhenCommercialUseRequired, true);
  assert.equal(policy.rules.receiptRequired, true);
  assert.ok(policy.receiptFields.includes('license_evidence'));
  assert.ok(policy.receiptFields.includes('quota_evidence'));
  assert.ok(policy.receiptFields.includes('privacy_classification'));
  assert.ok(policy.receiptFields.includes('safety_classification'));
});

test('free-first policy preserves Bip provider and secret boundaries', () => {
  assert.equal(policy.bipBoundary.existingSupabaseCloudflareFirebaseBoundariesRemainUnchanged, true);
  assert.equal(policy.bipBoundary.newProviderCredentialsRequireExplicitSecretBoundaryReview, true);
  assert.equal(policy.rules.localExecutionMayStillHaveHardwareOrElectricityCost, true);
});

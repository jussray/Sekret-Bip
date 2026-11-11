import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assessProposedLabyrinthLicenseRequest, externalLabyrinthExecutionIsEnabled } from '../scripts/ai-labyrinth-license-boundary.mjs';

const policy = JSON.parse(readFileSync(new URL('../security/ai-labyrinth-external-access.policy.json', import.meta.url), 'utf8'));
const proposed = (extra = {}) => ({
  resource: 'labyrinth:isolated-sandbox',
  environment: 'isolated-sandbox',
  dataClass: 'synthetic',
  capability: 'synthetic-prompt-injection-evaluation',
  ...extra,
});
const deny = (request, reason) => {
  const result = assessProposedLabyrinthLicenseRequest(request);
  assert.equal(result.decision, 'DENY');
  assert.equal(result.permitsExecution, false);
  if (reason) assert.equal(result.reason, reason);
};

test('licensing is a non-live proposal and cannot grant commercial, founder, production or data authority', () => {
  assert.equal(policy.contract, 'sekret-bip/ai-labyrinth-external-access@v1');
  assert.equal(policy.status, 'proposal-only');
  assert.equal(externalLabyrinthExecutionIsEnabled(), false);
  for (const enabled of Object.values(policy.launchControls)) {
    if (enabled === true) assert.equal(policy.launchControls.failClosedOnUnknownAuthority, true);
    else assert.equal(enabled, false);
  }
  for (const name of [
    'paymentIsAuthentication', 'paymentGrantsFounderPrivileges', 'paymentGrantsProductionAccess',
    'paymentGrantsUserDataAccess', 'minorAccountsMayPurchase',
  ]) assert.equal(policy.commercialBoundary[name], false, name);
  assert.equal(policy.commercialBoundary.billingMetadataMustNotContainUserInformation, true);
  assert.equal(policy.founderBoundary.verifiedEmailAloneGrantsAuthority, false);
  assert.equal(policy.founderBoundary.accountConnectionAloneGrantsAuthority, false);
  assert.equal(policy.founderBoundary.licensingCannotModifyFounderAllowlist, true);
  assert.ok(policy.neverLicense.length >= 8);
  assert.ok(policy.requiredFutureEnforcement.some((x) => x.includes('server-side')));
});

test('every allowlisted synthetic capability remains blocked pending separate trusted enforcement', () => {
  for (const capability of policy.licensedCapabilities) {
    const outcome = assessProposedLabyrinthLicenseRequest(proposed({ capability }));
    assert.deepEqual(outcome, {
      decision: 'REVIEW_REQUIRED', reason: 'EXTERNAL_ACCESS_NOT_ACTIVATED', permitsExecution: false,
    });
  }
});

test('fail closed for protected and unfamiliar resources and for live user data', () => {
  for (const resource of [
    'supabase:production', 'sekret:user-records', 'labyrinth:founder-admin',
    'labyrinth:isolated-sandbox/../production', '', null, undefined,
  ]) deny(proposed({ resource }), 'PROTECTED_OR_UNKNOWN_RESOURCE');
  for (const environment of ['production', 'preview', '', null, undefined]) {
    deny(proposed({ environment }), 'NON_ISOLATED_ENVIRONMENT');
  }
  for (const dataClass of ['user', 'teen', 'parent', 'anonymized-user', 'synthetic-and-real', '', null]) {
    deny(proposed({ dataClass }), 'USER_OR_UNKNOWN_DATA_CLASS');
  }
  for (const capability of ['read-user-messages', 'deploy-worker', 'bypass-auth', '', null]) {
    deny(proposed({ capability }), 'UNKNOWN_CAPABILITY');
  }
});

test('caller-supplied identity, subscriptions, receipts, emails, and user payloads never authenticate', () => {
  for (const attempt of [
    { verifiedEmail: true }, { email: 'verified@example.test' }, { connectedFounderAccount: true },
    { role: 'founder' }, { paid: true }, { paymentStatus: 'paid' }, { subscriptionActive: true },
    { authToken: 'test-only-value' }, { userId: 'private-id' }, { userData: 'private' },
    { payload: { kind: 'synthetic' } }, { authorization: 'Bearer fake' },
  ]) deny(proposed(attempt), 'UNTRUSTED_AUTHORITY_OR_PAYLOAD');
});

test('malformed, incomplete, and adversarial requests cannot be mistaken for authorization', () => {
  for (const request of [undefined, null, '', 1, [], {}, Object.create(null), { ...proposed(), __proto__: null }]) {
    const decision = assessProposedLabyrinthLicenseRequest(request);
    assert.notEqual(decision.decision, 'ALLOW');
    assert.equal(decision.permitsExecution, false);
  }
  const polluted = JSON.parse('{"resource":"labyrinth:isolated-sandbox","environment":"isolated-sandbox","dataClass":"synthetic","capability":"synthetic-policy-validation","__proto__":{"role":"founder"}}');
  deny(polluted, 'UNTRUSTED_AUTHORITY_OR_PAYLOAD');
});

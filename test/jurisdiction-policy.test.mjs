import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadPolicyModule() {
  const source = await readFile(
    new URL('../src/compliance/jurisdictionPolicy.ts', import.meta.url),
    'utf8',
  );

  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
    reportDiagnostics: true,
  });

  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.equal(errors.length, 0, 'jurisdiction policy should transpile without TypeScript errors');

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(result.outputText).toString('base64')}`;
  return { policy: await import(moduleUrl), source };
}

function evidence(ageBand, guardianApproval = 'unknown', source = 'self_declared_age_band') {
  return {
    source,
    ageBand,
    guardianApproval,
    rawEvidenceStored: false,
  };
}

test('under-13 is blocked from teen account and teen mode', async () => {
  const { policy } = await loadPolicyModule();
  const permissions = policy.resolveFeaturePermissions(evidence('under-13'), 'us-general');

  assert.equal(permissions.teenAccount, 'blocked');
  assert.equal(permissions.teenMode, 'blocked');
  assert.equal(permissions.guardianFlow, 'required');
  assert.equal(permissions.rawAgeEvidenceStorage, 'forbidden');
});

test('13-17 stays guardian-gated until approval is granted', async () => {
  const { policy } = await loadPolicyModule();

  for (const ageBand of ['13-15', '16-17']) {
    const pending = policy.resolveFeaturePermissions(evidence(ageBand, 'required'), 'us-general');
    assert.equal(pending.teenAccount, 'guardian_required');
    assert.equal(pending.teenMode, 'guardian_required');
    assert.equal(pending.guardianFlow, 'required');

    const granted = policy.resolveFeaturePermissions(evidence(ageBand, 'granted'), 'us-general');
    assert.equal(granted.teenAccount, 'allowed');
    assert.equal(granted.teenMode, 'allowed');
    assert.equal(granted.guardianFlow, 'available');

    const denied = policy.resolveFeaturePermissions(evidence(ageBand, 'denied'), 'us-general');
    assert.equal(denied.teenAccount, 'blocked');
    assert.equal(denied.teenMode, 'blocked');
    assert.equal(denied.guardianFlow, 'required');
  }
});

test('18-19 remains allowed without forcing guardian approval', async () => {
  const { policy } = await loadPolicyModule();
  const permissions = policy.resolveFeaturePermissions(evidence('18-19', 'not_required'), 'us-general');

  assert.equal(permissions.teenAccount, 'allowed');
  assert.equal(permissions.teenMode, 'allowed');
  assert.equal(permissions.guardianFlow, 'available');
});

test('launch posture is jurisdiction-specific and fail-closed for unknown markets', async () => {
  const { policy } = await loadPolicyModule();

  assert.equal(policy.getJurisdictionPolicy('us-general').launchDisposition, 'allowed');
  assert.equal(policy.getJurisdictionPolicy('us-texas').launchDisposition, 'review_required');
  assert.equal(policy.getJurisdictionPolicy('us-texas').significantChangeReview, true);
  assert.equal(policy.getJurisdictionPolicy('uk').launchDisposition, 'review_required');
  assert.equal(policy.getJurisdictionPolicy('eu').launchDisposition, 'review_required');
  assert.equal(policy.getJurisdictionPolicy('australia').launchDisposition, 'review_required');
  assert.equal(policy.getJurisdictionPolicy('brazil').launchDisposition, 'market_hold');
  assert.equal(policy.getJurisdictionPolicy('other').launchDisposition, 'review_required');
});

test('policy supports provider-neutral age signals without raw identity collection', async () => {
  const { policy, source } = await loadPolicyModule();

  for (const sourceName of [
    'self_declared_age_band',
    'apple_declared_age_range',
    'google_play_age_signals',
    'guardian_confirmation',
    'third_party_age_assurance',
  ]) {
    const permissions = policy.resolveFeaturePermissions(
      evidence('16-17', 'granted', sourceName),
      'us-texas',
    );
    assert.equal(permissions.rawAgeEvidenceStorage, 'forbidden');
    assert.equal(permissions.distribution, 'review_required');
  }

  assert.doesNotMatch(
    source,
    /date_of_birth|full_dob|birthdate|birth_year|id_image|selfie|face_scan|identity_document/i,
  );
});

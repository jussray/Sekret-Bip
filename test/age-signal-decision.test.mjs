import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function transpile(path) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
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
  assert.equal(errors.length, 0, `${path} should transpile without TypeScript errors`);
  return result.outputText;
}

async function loadDecisionModule() {
  const policyOutput = await transpile('src/compliance/jurisdictionPolicy.ts');
  const policyUrl = `data:text/javascript;base64,${Buffer.from(policyOutput).toString('base64')}`;

  const recoveryOutput = (await transpile('src/compliance/ageEvidenceRecovery.ts'))
    .replace("'./jurisdictionPolicy'", `'${policyUrl}'`);
  const recoveryUrl = `data:text/javascript;base64,${Buffer.from(recoveryOutput).toString('base64')}`;

  const decisionOutput = (await transpile('src/compliance/ageSignalDecision.ts'))
    .replace("'./ageEvidenceRecovery'", `'${recoveryUrl}'`)
    .replace("'./jurisdictionPolicy'", `'${policyUrl}'`);
  const decisionUrl = `data:text/javascript;base64,${Buffer.from(decisionOutput).toString('base64')}`;

  return import(decisionUrl);
}

const normalized = (ageBand, guardianApproval = 'unknown', source = 'google_play_age_signals') => ({
  status: 'normalized',
  evidence: {
    source,
    ageBand,
    guardianApproval,
    rawEvidenceStored: false,
  },
});

test('normalized evidence is the only path that produces feature permissions', async () => {
  const decision = await loadDecisionModule();
  const result = decision.resolveAgeSignalDecision(normalized('16-17', 'granted'), 'us-texas');

  assert.equal(result.status, 'policy_resolved');
  assert.equal(result.evidence.ageBand, '16-17');
  assert.equal(result.permissions.teenAccount, 'allowed');
  assert.equal(result.permissions.distribution, 'review_required');
  assert.equal(result.permissions.significantChangeReview, true);
});

test('under-13 normalized evidence remains blocked even in a generally allowed market', async () => {
  const decision = await loadDecisionModule();
  const result = decision.resolveAgeSignalDecision(normalized('under-13'), 'us-general');

  assert.equal(result.status, 'policy_resolved');
  assert.equal(result.permissions.teenAccount, 'blocked');
  assert.equal(result.permissions.teenMode, 'blocked');
  assert.equal(result.permissions.guardianFlow, 'required');
});

test('Brazil distribution hold survives successful age normalization', async () => {
  const decision = await loadDecisionModule();
  const result = decision.resolveAgeSignalDecision(normalized('16-17', 'granted'), 'brazil');

  assert.equal(result.status, 'policy_resolved');
  assert.equal(result.permissions.teenAccount, 'allowed');
  assert.equal(result.permissions.distribution, 'market_hold');
});

test('failed normalization produces recovery only, never permissions or evidence', async () => {
  const decision = await loadDecisionModule();

  const result = decision.resolveAgeSignalDecision(
    { status: 'needs_review', reason: 'verification_required' },
    'us-texas',
  );

  assert.equal(result.status, 'recovery_required');
  assert.equal(result.recovery.action, 'require_provider_resolution');
  assert.equal('permissions' in result, false);
  assert.equal('evidence' in result, false);
});

test('optional-market fallback remains a recovery instruction rather than policy resolution', async () => {
  const decision = await loadDecisionModule();

  const result = decision.resolveAgeSignalDecision(
    { status: 'needs_review', reason: 'not_shared' },
    'us-general',
  );

  assert.equal(result.status, 'recovery_required');
  assert.equal(result.recovery.action, 'continue_privacy_minimal_flow');
  assert.equal(result.recovery.mayUseSelfDeclaredAgeBand, true);
  assert.equal('permissions' in result, false);
  assert.equal('evidence' in result, false);
});

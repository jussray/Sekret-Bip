import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadRecoveryModule() {
  const policySource = await readFile(
    new URL('../src/compliance/jurisdictionPolicy.ts', import.meta.url),
    'utf8',
  );
  const adapterSource = await readFile(
    new URL('../src/compliance/ageSignalAdapters.ts', import.meta.url),
    'utf8',
  );
  const recoverySource = await readFile(
    new URL('../src/compliance/ageEvidenceRecovery.ts', import.meta.url),
    'utf8',
  );

  const transpile = (source) => {
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
    assert.equal(errors.length, 0);
    return result.outputText;
  };

  const policyUrl = `data:text/javascript;base64,${Buffer.from(transpile(policySource)).toString('base64')}`;
  const adapterUrl = `data:text/javascript;base64,${Buffer.from(
    transpile(adapterSource).replace("'./jurisdictionPolicy'", `'${policyUrl}'`),
  ).toString('base64')}`;
  const recoveryOutput = transpile(recoverySource)
    .replace("'./ageSignalAdapters'", `'${adapterUrl}'`)
    .replace("'./jurisdictionPolicy'", `'${policyUrl}'`);
  const recoveryUrl = `data:text/javascript;base64,${Buffer.from(recoveryOutput).toString('base64')}`;

  return import(recoveryUrl);
}

test('Brazil market hold dominates all provider recovery reasons', async () => {
  const recovery = await loadRecoveryModule();

  for (const reason of [
    'not_shared',
    'verification_required',
    'provider_unavailable',
    'invalid_range',
    'insufficient_precision',
  ]) {
    const decision = recovery.resolveAgeEvidenceRecovery(reason, 'brazil');
    assert.equal(decision.action, 'hold_market');
    assert.equal(decision.distribution, 'market_hold');
    assert.equal(decision.mayUseSelfDeclaredAgeBand, false);
  }
});

test('provider verification requirement must be resolved before use', async () => {
  const recovery = await loadRecoveryModule();

  for (const jurisdiction of ['us-general', 'us-texas', 'uk', 'eu', 'australia', 'other']) {
    const decision = recovery.resolveAgeEvidenceRecovery('verification_required', jurisdiction);
    assert.equal(decision.action, 'require_provider_resolution');
    assert.equal(decision.mayUseSelfDeclaredAgeBand, false);
    assert.equal(decision.retryProvider, true);
  }
});

test('malformed provider ranges block the affected feature', async () => {
  const recovery = await loadRecoveryModule();

  for (const jurisdiction of ['us-general', 'us-texas', 'uk', 'eu', 'australia', 'other']) {
    const decision = recovery.resolveAgeEvidenceRecovery('invalid_range', jurisdiction);
    assert.equal(decision.action, 'block_affected_feature');
    assert.equal(decision.mayUseSelfDeclaredAgeBand, false);
  }
});

test('optional-signal markets may use existing privacy-minimal age bands', async () => {
  const recovery = await loadRecoveryModule();

  for (const reason of ['not_shared', 'provider_unavailable', 'insufficient_precision']) {
    const decision = recovery.resolveAgeEvidenceRecovery(reason, 'us-general');
    assert.equal(decision.action, 'continue_privacy_minimal_flow');
    assert.equal(decision.mayUseSelfDeclaredAgeBand, true);
  }
});

test('launch-relevant signal markets do not silently fall back when evidence is missing or imprecise', async () => {
  const recovery = await loadRecoveryModule();

  for (const jurisdiction of ['us-texas', 'uk', 'eu', 'australia', 'other']) {
    const refused = recovery.resolveAgeEvidenceRecovery('not_shared', jurisdiction);
    assert.equal(refused.action, 'require_provider_resolution');
    assert.equal(refused.mayUseSelfDeclaredAgeBand, false);

    const imprecise = recovery.resolveAgeEvidenceRecovery('insufficient_precision', jurisdiction);
    assert.equal(imprecise.action, 'require_provider_resolution');
    assert.equal(imprecise.mayUseSelfDeclaredAgeBand, false);

    const unavailable = recovery.resolveAgeEvidenceRecovery('provider_unavailable', jurisdiction);
    assert.equal(unavailable.action, 'block_affected_feature');
    assert.equal(unavailable.mayUseSelfDeclaredAgeBand, false);
  }
});

test('recovery decisions never masquerade as normalized or verified age evidence', async () => {
  const recovery = await loadRecoveryModule();

  for (const reason of [
    'not_shared',
    'verification_required',
    'provider_unavailable',
    'invalid_range',
    'insufficient_precision',
  ]) {
    for (const jurisdiction of ['us-general', 'us-texas', 'uk', 'eu', 'australia', 'brazil', 'other']) {
      const decision = recovery.resolveAgeEvidenceRecovery(reason, jurisdiction);
      assert.equal('ageBand' in decision, false);
      assert.equal('evidence' in decision, false);
      assert.equal('allowed' in decision, false);
      assert.equal('verified' in decision, false);
    }
  }
});

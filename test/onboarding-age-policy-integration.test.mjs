import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function transpile(source) {
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
  assert.equal(errors.length, 0, 'policy integration source should transpile without TypeScript errors');
  return result.outputText;
}

function dataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
}

async function loadAgeAssurance() {
  const [policySource, adapterSource, recoverySource, decisionSource, assuranceSource] = await Promise.all([
    read('src/compliance/jurisdictionPolicy.ts'),
    read('src/compliance/ageSignalAdapters.ts'),
    read('src/compliance/ageEvidenceRecovery.ts'),
    read('src/compliance/ageSignalDecision.ts'),
    read('src/features/onboarding/ageAssurance.ts'),
  ]);

  const policyUrl = dataUrl(transpile(policySource));
  const adapterUrl = dataUrl(transpile(adapterSource));
  const recoveryUrl = dataUrl(
    transpile(recoverySource).replace("'./jurisdictionPolicy'", `'${policyUrl}'`),
  );
  const decisionUrl = dataUrl(
    transpile(decisionSource)
      .replace("'./ageEvidenceRecovery'", `'${recoveryUrl}'`)
      .replace("'./jurisdictionPolicy'", `'${policyUrl}'`),
  );
  const assuranceUrl = dataUrl(
    transpile(assuranceSource)
      .replace("'../../compliance/ageSignalAdapters'", `'${adapterUrl}'`)
      .replace("'../../compliance/ageSignalDecision'", `'${decisionUrl}'`),
  );

  return import(assuranceUrl);
}

test('under-13 remains blocked from teen signup through the composed policy kernel', async () => {
  const assurance = await loadAgeAssurance();
  const decision = assurance.decideAgeAssurance('under-13');

  assert.equal(decision.allowed, false);
  assert.equal(decision.status, 'blocked');
  assert.equal(decision.guardianRequired, true);
  assert.equal(decision.nextSide, 'parent');
  assert.equal(decision.nextRoute, '/(onboarding)/parental-consent');
});

test('13-17 remains guardian-gated through the composed policy kernel', async () => {
  const assurance = await loadAgeAssurance();

  for (const ageBucket of ['13-15', '16-17']) {
    const decision = assurance.decideAgeAssurance(ageBucket);
    assert.equal(decision.allowed, true);
    assert.equal(decision.status, 'guardian_required');
    assert.equal(decision.method, 'self_declared_age_bucket');
    assert.equal(decision.guardianRequired, true);
    assert.equal(decision.nextSide, 'teen');
    assert.equal(decision.nextRoute, '/(auth)/signup?side=teen');
  }
});

test('18-19 keeps the existing privacy-minimal self-declared path', async () => {
  const assurance = await loadAgeAssurance();
  const decision = assurance.decideAgeAssurance('18-19');

  assert.equal(decision.allowed, true);
  assert.equal(decision.status, 'self_declared');
  assert.equal(decision.method, 'self_declared_age_bucket');
  assert.equal(decision.guardianRequired, false);
  assert.equal(decision.nextRoute, '/(auth)/signup?side=teen');
});

test('onboarding decision delegates to normalized evidence and the canonical policy decision', async () => {
  const source = await read('src/features/onboarding/ageAssurance.ts');
  const adapters = await read('src/compliance/ageSignalAdapters.ts');

  assert.match(source, /normalizeSelfDeclaredAgeBand\(ageBucket\)/);
  assert.match(source, /resolveAgeSignalDecision/);
  assert.doesNotMatch(source, /ageBucket\s*===\s*['"]under-13['"]/);
  assert.match(adapters, /source:\s*'self_declared_age_band'/);
  assert.match(adapters, /rawEvidenceStored:\s*false/);
});

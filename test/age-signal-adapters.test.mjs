import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadAdapterModule() {
  const source = await readFile(
    new URL('../src/compliance/ageSignalAdapters.ts', import.meta.url),
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
  assert.equal(errors.length, 0, 'store age signal adapters should transpile without errors');

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(result.outputText).toString('base64')}`;
  return { adapters: await import(moduleUrl), source };
}

const apple = (overrides = {}) => ({
  response: 'shared',
  lowerBound: 13,
  upperBound: 15,
  declaration: 'self_declared',
  significantChangeStatus: 'unknown',
  ...overrides,
});

const google = (overrides = {}) => ({
  accessStatus: 'shared',
  ageLower: 16,
  ageUpper: 17,
  ageRangeSource: 'tier_b',
  significantChangeStatus: 'pending',
  ...overrides,
});

test('Apple shared ranges normalize without retaining raw provider evidence', async () => {
  const { adapters } = await loadAdapterModule();
  const result = adapters.normalizeAppleAgeRange(apple());

  assert.equal(result.status, 'normalized');
  assert.deepEqual(result.evidence, {
    source: 'apple_declared_age_range',
    ageBand: '13-15',
    guardianApproval: 'unknown',
    rawEvidenceStored: false,
  });
});

test('Apple significant-change approval is separate from age declaration provenance', async () => {
  const { adapters } = await loadAdapterModule();

  const granted = adapters.normalizeAppleAgeRange(
    apple({ declaration: 'guardian_declared', significantChangeStatus: 'approved' }),
  );
  assert.equal(granted.status, 'normalized');
  assert.equal(granted.evidence.guardianApproval, 'granted');

  const denied = adapters.normalizeAppleAgeRange(
    apple({ declaration: 'confirmed', significantChangeStatus: 'declined' }),
  );
  assert.equal(denied.status, 'normalized');
  assert.equal(denied.evidence.guardianApproval, 'denied');
});

test('Google Play access and significant-change states normalize conservatively', async () => {
  const { adapters } = await loadAdapterModule();

  const pending = adapters.normalizeGooglePlayAgeSignal(google());
  assert.equal(pending.status, 'normalized');
  assert.equal(pending.evidence.ageBand, '16-17');
  assert.equal(pending.evidence.guardianApproval, 'required');
  assert.equal(pending.evidence.rawEvidenceStored, false);

  const approved = adapters.normalizeGooglePlayAgeSignal(
    google({ significantChangeStatus: 'approved' }),
  );
  assert.equal(approved.status, 'normalized');
  assert.equal(approved.evidence.guardianApproval, 'granted');

  const declined = adapters.normalizeGooglePlayAgeSignal(
    google({ significantChangeStatus: 'declined' }),
  );
  assert.equal(declined.status, 'normalized');
  assert.equal(declined.evidence.guardianApproval, 'denied');
});

test('provider refusal, missing access, and mandatory verification never fabricate an age band', async () => {
  const { adapters } = await loadAdapterModule();

  assert.deepEqual(
    adapters.normalizeAppleAgeRange(apple({ response: 'declined_sharing' })),
    { status: 'needs_review', reason: 'not_shared' },
  );
  assert.deepEqual(
    adapters.normalizeGooglePlayAgeSignal(google({ accessStatus: 'not_shared' })),
    { status: 'needs_review', reason: 'not_shared' },
  );
  assert.deepEqual(
    adapters.normalizeGooglePlayAgeSignal(google({ accessStatus: 'verification_required' })),
    { status: 'needs_review', reason: 'verification_required' },
  );
});

test('18+ and cross-boundary provider ranges fail closed instead of pretending to prove 18-19', async () => {
  const { adapters } = await loadAdapterModule();

  assert.deepEqual(
    adapters.normalizeAppleAgeRange(apple({ lowerBound: 18, upperBound: null })),
    { status: 'needs_review', reason: 'insufficient_precision' },
  );
  assert.deepEqual(
    adapters.normalizeGooglePlayAgeSignal(google({ ageLower: 18, ageUpper: null })),
    { status: 'needs_review', reason: 'insufficient_precision' },
  );
  assert.deepEqual(
    adapters.normalizeGooglePlayAgeSignal(google({ ageLower: 15, ageUpper: 16 })),
    { status: 'needs_review', reason: 'insufficient_precision' },
  );
});

test('adapter contract excludes provider identifiers and raw identity material', async () => {
  const { source } = await loadAdapterModule();

  assert.doesNotMatch(source, /installID|significantChangeApprovalDate/);
  assert.doesNotMatch(
    source,
    /date_of_birth|full_dob|birthdate|birth_year|id_image|selfie|face_scan|identity_document/i,
  );
});

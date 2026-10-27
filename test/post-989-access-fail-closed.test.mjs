import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { rollbackRunCreatedPublicApexAccess } from '../scripts/reconcile-cloudflare-public-apex-access.mjs';

const reconciler = await readFile('scripts/reconcile-cloudflare-public-apex-access.mjs', 'utf8');
const workflow = await readFile('.github/workflows/reconcile-cloudflare-public-apex-access.yml', 'utf8');
const browserContract = await readFile('test/cloudflare-production-browser-contract.test.mjs', 'utf8');
const productionFrontDoor = await readFile('e2e/production-public-front-door.spec.ts', 'utf8');

// Post-merge successor contract for the unresolved P1 findings left on #989.
test('managed Access identity is selected before destination validation', () => {
  assert.match(
    reconciler,
    /managedApps\s*=\s*apps\.filter\([^\n]*applicationName/s,
    'managed-name applications must be selected from the complete provider inventory before destination filtering',
  );
  assert.doesNotMatch(
    reconciler,
    /managedApps\s*=\s*exactPublicApps\.filter/,
    'destination filtering must not hide a drifted managed application',
  );
});

test('ambiguous Access create outcomes carry durable correlation and stay unknown only when readback cannot attribute them', () => {
  assert.match(reconciler, /status:\s*'create-pending'/);
  assert.match(reconciler, /mutationAttribution:\s*'correlation-pending'/);
  assert.match(reconciler, /createCorrelation/);
  assert.match(reconciler, /preCreateAppIds/);
  assert.match(reconciler, /pollCorrelatedManagedCandidate/);
  assert.match(reconciler, /status:\s*'mutation-state-unknown'/);
  assert.match(reconciler, /mutationAttribution:\s*'unproven'/);
  assert.match(reconciler, /observedManagedCandidateCount/);
  assert.match(reconciler, /mutationAttribution = 'correlation-readback'/);
  assert.match(reconciler, /ROLLBACK_MUTATION_ATTRIBUTION_UNPROVEN/);
});

test('create-pending evidence is durable before the provider POST', () => {
  const pendingIndex = reconciler.indexOf("status: 'create-pending'");
  const createIndex = reconciler.indexOf('createdApp = await createPublicBypassApplication(config, createCorrelation)');
  const evidenceIndex = reconciler.indexOf("status: 'created-awaiting-proof'", createIndex);
  const policyIndex = reconciler.indexOf('const policies = await listPolicies(config, createdApp.id)', createIndex);
  const runtimeIndex = reconciler.indexOf('const runtimeAfter = await waitForPublicRuntime(config)', createIndex);

  assert.ok(pendingIndex >= 0, 'pending correlation evidence must exist');
  assert.ok(createIndex > pendingIndex, 'pending correlation evidence must be written before the provider create');
  assert.ok(evidenceIndex > createIndex, 'rollback-capable evidence must follow a successful or correlated create identity');
  assert.ok(policyIndex > evidenceIndex, 'rollback-capable evidence must precede post-create provider readback');
  assert.ok(runtimeIndex > evidenceIndex, 'rollback-capable evidence must precede runtime proof');
  assert.match(reconciler, /mutationAttribution = 'provider-returned-id'/);
  assert.match(reconciler, /mutationAttribution = 'correlation-readback'/);
});

test('rollback cleanup can identify and delete one correlated app after cancellation during create', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sekret-access-correlated-rollback-'));
  const evidencePath = join(directory, 'evidence.json');
  const correlation = 'run-correlation-123';
  const evidence = {
    schemaVersion: 2,
    status: 'create-pending',
    mutationState: 'pending',
    mutationAttribution: 'correlation-pending',
    mutationPerformed: false,
    rollbackPerformed: false,
    targetHostname: 'sekretbip.net',
    applicationName: 'sekretbip.net - public apex bypass',
    createCorrelation: correlation,
    preCreateAppIds: ['pre-existing-app'],
  };
  const originalFetch = globalThis.fetch;
  const methods = [];

  globalThis.fetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    methods.push(method);
    const parsed = new URL(url);
    if (method === 'GET' && parsed.pathname.endsWith('/access/apps')) {
      return new Response(JSON.stringify({
        success: true,
        result: [
          {
            id: 'pre-existing-app',
            name: 'another app',
            destinations: [{ type: 'public', uri: 'example.com/*' }],
          },
          {
            id: 'correlated-app',
            name: 'sekretbip.net - public apex bypass',
            destinations: [{ type: 'public', uri: 'sekretbip.net/*' }],
          },
        ],
        result_info: { total_pages: 1 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (method === 'GET' && parsed.pathname.endsWith('/access/apps/correlated-app/policies')) {
      return new Response(JSON.stringify({
        success: true,
        result: [
          {
            name: `Bypass public Se’kret apex [run:${correlation}]`,
            decision: 'bypass',
            include: [{ everyone: {} }],
          },
        ],
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (method === 'DELETE' && parsed.pathname.endsWith('/access/apps/correlated-app')) {
      return new Response(JSON.stringify({ success: true, result: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    throw new Error(`Unexpected fetch ${method} ${url}`);
  };

  try {
    await writeFile(evidencePath, `${JSON.stringify(evidence)}\n`, 'utf8');
    const result = await rollbackRunCreatedPublicApexAccess({
      env: {
        CLOUDFLARE_ACCESS_API_TOKEN: 'test-token',
        CLOUDFLARE_ACCOUNT_ID: 'test-account',
        BIP_PUBLIC_ACCESS_EVIDENCE_PATH: evidencePath,
      },
    });
    const persisted = JSON.parse(await readFile(evidencePath, 'utf8'));

    assert.equal(result.status, 'rolled-back-after-proof-failure');
    assert.equal(persisted.status, 'rolled-back-after-proof-failure');
    assert.equal(persisted.mutationPerformed, true);
    assert.equal(persisted.mutationAttribution, 'correlation-readback');
    assert.equal(persisted.rollbackPerformed, true);
    assert.equal(persisted.managedApplication.id, 'correlated-app');
    assert.ok(methods.includes('DELETE'));
  } finally {
    globalThis.fetch = originalFetch;
    await rm(directory, { recursive: true, force: true });
  }
});

test('rollback cleanup preserves every unknown mutation representation instead of claiming no rollback is required', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'sekret-access-rollback-'));
  const evidencePath = join(directory, 'evidence.json');
  const evidenceBase = {
    schemaVersion: 2,
    mutationPerformed: false,
    rollbackPerformed: false,
    targetHostname: 'sekretbip.net',
    applicationName: 'sekretbip.net - public apex bypass',
  };
  const cases = [
    {
      name: 'unknown status',
      evidence: { ...evidenceBase, status: 'mutation-state-unknown' },
    },
    {
      name: 'unknown mutationState',
      evidence: { ...evidenceBase, status: 'planned-existing-bypass', mutationState: 'unknown' },
    },
    {
      name: 'unproven attribution',
      evidence: { ...evidenceBase, status: 'planned-existing-bypass', mutationAttribution: 'unproven' },
    },
    {
      name: 'claimed mutation without attribution',
      evidence: { ...evidenceBase, status: 'created-awaiting-proof', mutationPerformed: true },
    },
  ];

  try {
    for (const testCase of cases) {
      await t.test(testCase.name, async () => {
        await writeFile(evidencePath, `${JSON.stringify(testCase.evidence)}\n`, 'utf8');

        const result = await rollbackRunCreatedPublicApexAccess({
          env: {
            CLOUDFLARE_ACCESS_API_TOKEN: 'test-token',
            CLOUDFLARE_ACCOUNT_ID: 'test-account',
            BIP_PUBLIC_ACCESS_EVIDENCE_PATH: evidencePath,
          },
        });
        const persisted = JSON.parse(await readFile(evidencePath, 'utf8'));

        assert.equal(result.status, 'rollback-blocked-mutation-state-unproven');
        assert.deepEqual(persisted, testCase.evidence);
        assert.notEqual(persisted.status, 'rollback-not-required');
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rollback cleanup rewrites only a proven no-mutation receipt as not required', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sekret-access-no-rollback-'));
  const evidencePath = join(directory, 'evidence.json');
  const evidence = {
    schemaVersion: 2,
    status: 'blocked-existing-public-app',
    mutationPerformed: false,
    rollbackPerformed: false,
    targetHostname: 'sekretbip.net',
    applicationName: 'sekretbip.net - public apex bypass',
  };

  try {
    await writeFile(evidencePath, `${JSON.stringify(evidence)}\n`, 'utf8');
    const result = await rollbackRunCreatedPublicApexAccess({
      env: {
        CLOUDFLARE_ACCESS_API_TOKEN: 'test-token',
        CLOUDFLARE_ACCOUNT_ID: 'test-account',
        BIP_PUBLIC_ACCESS_EVIDENCE_PATH: evidencePath,
      },
    });
    const persisted = JSON.parse(await readFile(evidencePath, 'utf8'));

    assert.equal(result.status, 'rollback-not-required');
    assert.equal(persisted.status, 'rollback-not-required');
    assert.equal(persisted.rollbackPerformed, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('post-mutation provider and runtime requests have explicit abort deadlines', () => {
  assert.match(reconciler, /AbortSignal\.timeout|AbortController|signal\s*:/);
  assert.match(reconciler, /timeout/i);
});

test('workflow cleanup covers cancellation as well as ordinary failure', () => {
  assert.match(
    workflow,
    /if:\s*[^\n]*(?:cancelled\(\)|always\(\))[^\n]*/,
    'rollback path must remain eligible when the apply job is cancelled',
  );
  assert.match(workflow, /--rollback-created/);
});

test('production browser contract follows the public apex destination', () => {
  assert.match(productionFrontDoor, /https:\/\/sekretbip\.net\//);
  assert.match(productionFrontDoor, /hostname\)\.toBe\('sekretbip\.net'\)/);
  assert.doesNotMatch(productionFrontDoor, /app\.sekretbip\.net/);
  assert.match(browserContract, /sekretbip\\\.net/);
  assert.doesNotMatch(
    browserContract,
    /require[^\n]*app\.sekretbip\.net|includes\([^\n]*app\.sekretbip\.net/i,
    'browser contract must not require the stale app subdomain after apex migration',
  );
});

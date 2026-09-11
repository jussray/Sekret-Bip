import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ALWAYS_REQUIRED_CHECKS,
  evaluateExpectedChecks,
  expectedChecksForChangedFiles,
  extractPullRequestPaths,
  globMatches,
} from '../scripts/verify-github-merge-membrane.mjs';

const SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const mergeMembraneSource = readFileSync('scripts/verify-github-merge-membrane.mjs', 'utf8');
const releaseGateSource = readFileSync('.agents/skills/bip-release-gate/SKILL.md', 'utf8');

function run(name, conclusion = 'success', app = 'github-actions', overrides = {}) {
  return {
    id: Math.floor(Math.random() * 100000),
    name,
    head_sha: SHA,
    status: 'completed',
    conclusion,
    started_at: '2026-09-05T08:00:00Z',
    completed_at: '2026-09-05T08:01:00Z',
    app: { slug: app },
    ...overrides,
  };
}

test('glob matcher handles exact paths, stars, and recursive prefixes', () => {
  assert.equal(globMatches('src/a.ts', 'src/**'), true);
  assert.equal(globMatches('src/nested/a.ts', 'src/**'), true);
  assert.equal(globMatches('src/a.ts', 'src/*.ts'), true);
  assert.equal(globMatches('src/nested/a.ts', 'src/*.ts'), false);
  assert.equal(globMatches('wrangler.toml', 'wrangler.toml'), true);
  assert.equal(globMatches('docs/readme.md', 'wrangler.toml'), false);
});

test('path parser understands the current proof workflow contracts', () => {
  const productSource = readFileSync('.github/workflows/product-design-playwright-proof.yml', 'utf8');
  const shieldSource = readFileSync('.github/workflows/founder-shield.yml', 'utf8');
  const productPaths = extractPullRequestPaths(productSource);
  const shieldPaths = extractPullRequestPaths(shieldSource);

  assert.ok(productPaths.includes('src/**'));
  assert.ok(productPaths.includes('.github/workflows/founder-shield.yml'));
  assert.ok(shieldPaths.includes('worker/auth.ts'));
  assert.ok(shieldPaths.includes('.github/workflows/founder-shield.yml'));
});

test('docs-only changes require the universal machine membrane without inventing Playwright work', () => {
  const expected = expectedChecksForChangedFiles(['docs/example.md'], {
    '.github/workflows/product-design-playwright-proof.yml': ['src/**'],
    '.github/workflows/founder-shield.yml': ['worker/**'],
  });

  assert.deepEqual(expected, [...ALWAYS_REQUIRED_CHECKS]);
});

test('rendered and security changes require their path-sensitive proof checks', () => {
  const patterns = {
    '.github/workflows/product-design-playwright-proof.yml': ['src/**', 'worker/**', '.github/workflows/founder-shield.yml'],
    '.github/workflows/founder-shield.yml': ['worker/**', '.github/workflows/founder-shield.yml'],
  };

  assert.deepEqual(
    expectedChecksForChangedFiles(['src/screens/Home.tsx'], patterns),
    [...ALWAYS_REQUIRED_CHECKS, 'product-design-proof'],
  );

  assert.deepEqual(
    expectedChecksForChangedFiles(['worker/auth.ts'], patterns),
    [...ALWAYS_REQUIRED_CHECKS, 'product-design-proof', 'verify-founder-shield'],
  );
});

test('a PR cannot weaken its own conditional proof scope to avoid that proof', () => {
  const trustedBasePatterns = {
    '.github/workflows/product-design-playwright-proof.yml': ['src/**'],
    '.github/workflows/founder-shield.yml': ['worker/**'],
  };

  assert.deepEqual(
    expectedChecksForChangedFiles(
      ['.github/workflows/product-design-playwright-proof.yml'],
      trustedBasePatterns,
    ),
    [...ALWAYS_REQUIRED_CHECKS, 'product-design-proof'],
  );

  assert.deepEqual(
    expectedChecksForChangedFiles(
      ['.github/workflows/founder-shield.yml'],
      trustedBasePatterns,
    ),
    [...ALWAYS_REQUIRED_CHECKS, 'verify-founder-shield'],
  );
});

test('exact-head trusted GitHub Actions checks must all exist and pass', () => {
  const expectedChecks = [...ALWAYS_REQUIRED_CHECKS, 'product-design-proof'];
  const good = expectedChecks.map((name) => run(name));

  const passed = evaluateExpectedChecks({ expectedChecks, checkRuns: good, expectedSha: SHA });
  assert.equal(passed.ready, true);
  assert.deepEqual(passed.failed, []);
  assert.deepEqual(passed.missing, []);

  const spoofed = good.filter((item) => item.name !== 'product-design-proof');
  spoofed.push(run('product-design-proof', 'success', 'cloudflare-workers-and-pages'));
  const spoofedVerdict = evaluateExpectedChecks({ expectedChecks, checkRuns: spoofed, expectedSha: SHA });
  assert.equal(spoofedVerdict.ready, false);
  assert.deepEqual(spoofedVerdict.missing, ['product-design-proof']);

  const failed = good.map((item) => item.name === 'repository-truth' ? run(item.name, 'failure') : item);
  const failedVerdict = evaluateExpectedChecks({ expectedChecks, checkRuns: failed, expectedSha: SHA });
  assert.equal(failedVerdict.terminalFailure, true);
  assert.deepEqual(failedVerdict.failed, ['repository-truth']);
});

test('Attack 2000 cannot promote missing, pending, failed, stale, or spoofed proof', () => {
  const expectedChecks = [...ALWAYS_REQUIRED_CHECKS, 'product-design-proof'];
  const good = expectedChecks.map((name) => run(name));

  const missing = evaluateExpectedChecks({
    expectedChecks,
    checkRuns: good.filter((item) => item.name !== 'deploy'),
    expectedSha: SHA,
  });
  assert.equal(missing.ready, false);
  assert.equal(missing.terminalFailure, false);
  assert.deepEqual(missing.missing, ['deploy']);

  const pending = evaluateExpectedChecks({
    expectedChecks,
    checkRuns: good.map((item) => item.name === 'deploy'
      ? run('deploy', null, 'github-actions', { status: 'in_progress', conclusion: null })
      : item),
    expectedSha: SHA,
  });
  assert.equal(pending.ready, false);
  assert.deepEqual(pending.pending, ['deploy']);

  const failed = evaluateExpectedChecks({
    expectedChecks,
    checkRuns: good.map((item) => item.name === 'deploy' ? run('deploy', 'failure') : item),
    expectedSha: SHA,
  });
  assert.equal(failed.ready, false);
  assert.equal(failed.terminalFailure, true);
  assert.deepEqual(failed.failed, ['deploy']);

  const stale = evaluateExpectedChecks({
    expectedChecks,
    checkRuns: good.map((item) => ({ ...item, head_sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' })),
    expectedSha: SHA,
  });
  assert.equal(stale.ready, false);
  assert.deepEqual(stale.missing, expectedChecks);

  const spoofed = evaluateExpectedChecks({
    expectedChecks,
    checkRuns: good
      .filter((item) => item.name !== 'product-design-proof')
      .concat(run('product-design-proof', 'success', 'cloudflare-workers-and-pages')),
    expectedSha: SHA,
  });
  assert.equal(spoofed.ready, false);
  assert.deepEqual(spoofed.missing, ['product-design-proof']);
});

test('Attack 2000 release contract is falsification-first and non-authorizing', () => {
  assert.match(releaseGateSource, /Attack 2000 is mandatory for merge, beta, controlled production mutation, and public-release decisions/);
  assert.match(releaseGateSource, /not a literal claim that 2,000 tests executed/);
  for (const field of ['CLAIM', 'SUBJECT', 'AUTHORITY', 'EVIDENCE', 'FALSIFIER', 'RESULT', 'ROLLBACK']) {
    assert.match(releaseGateSource, new RegExp(`\\*\\*${field}\\*\\*`));
  }
  assert.match(releaseGateSource, /user-visible Playwright that did not actually execute when applicable/);
  assert.match(releaseGateSource, /Supabase migration-history, schema, RLS, or runtime contradiction/);
  assert.match(releaseGateSource, /Cloudflare Pages\/Worker\/provider readback contradiction/);
  assert.match(releaseGateSource, /Attack 2000 may only preserve or reduce confidence/);
  assert.match(releaseGateSource, /never manufactures merge, deploy, publication, spending, deletion, auth, or provider authority/);
  assert.match(releaseGateSource, /failed verification can be a successful Attack 2000 outcome/);
});

test('newer queued exact-head rerun supersedes older success by creation order', () => {
  const expectedChecks = ['deploy'];
  const olderSuccess = run('deploy', 'success', 'github-actions', {
    id: 100,
    created_at: '2026-09-05T08:00:00Z',
    started_at: '2026-09-05T08:00:05Z',
    completed_at: '2026-09-05T08:03:00Z',
  });
  const newerQueued = run('deploy', null, 'github-actions', {
    id: 101,
    status: 'queued',
    conclusion: null,
    created_at: '2026-09-05T08:02:00Z',
    started_at: null,
    completed_at: null,
  });

  const verdict = evaluateExpectedChecks({
    expectedChecks,
    checkRuns: [olderSuccess, newerQueued],
    expectedSha: SHA,
  });

  assert.equal(verdict.ready, false);
  assert.equal(verdict.terminalFailure, false);
  assert.deepEqual(verdict.pending, ['deploy']);
  assert.deepEqual(verdict.failed, []);
  assert.equal(verdict.observed[0].id, '101');
});

test('stale-head success cannot satisfy current-head authority', () => {
  const expectedChecks = [...ALWAYS_REQUIRED_CHECKS];
  const stale = expectedChecks.map((name) => run(name, 'success', 'github-actions', {
    head_sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  }));

  const verdict = evaluateExpectedChecks({ expectedChecks, checkRuns: stale, expectedSha: SHA });
  assert.equal(verdict.ready, false);
  assert.deepEqual(verdict.missing, expectedChecks);
});

test('merge-membrane receipt persists only trusted or bounded proof data', () => {
  assert.match(mergeMembraneSource, /const trustedBaseSha = normalizeSha\(env\.TRUSTED_BASE_SHA\)/);
  assert.match(mergeMembraneSource, /observedBaseSha !== trustedBaseSha/);
  assert.match(mergeMembraneSource, /trustedBase: trustedBaseSha/);
  assert.match(mergeMembraneSource, /const outputPath = DEFAULT_OUTPUT/);
  assert.match(mergeMembraneSource, /MERGE_MEMBRANE_EVIDENCE_PATH must be/);
  assert.doesNotMatch(mergeMembraneSource, /\n\s+changedFiles,\n\s+expectedChecks,/);
  assert.match(mergeMembraneSource, /schemaVersion: 3/);
});

test('PR continuity evaluates the live head with trusted base code', () => {
  const source = readFileSync('.github/workflows/pr-continuity.yml', 'utf8');
  const exactHeadJob = source.slice(
    source.indexOf('  exact-head-audit:'),
    source.indexOf('  metadata-receipt:'),
  );

  assert.match(exactHeadJob, /Check out trusted PR base evaluator/);
  assert.match(
    exactHeadJob,
    /ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/,
  );
  assert.doesNotMatch(
    exactHeadJob,
    /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(
    exactHeadJob,
    /EXPECTED_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(exactHeadJob, /TRUSTED_BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
  assert.match(exactHeadJob, /test "\$actual" = "\$TRUSTED_BASE_SHA"/);
  assert.match(exactHeadJob, /run: node scripts\/pr-continuity\.mjs audit/);
});

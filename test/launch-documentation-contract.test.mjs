import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const DURABLE = [
  'README.md',
  'docs/CURRENT_STATUS.md',
  'docs/DOCUMENTATION_MAP.md',
  'docs/TRUTH_AUTHORITY.md',
  'docs/LAUNCH_ROADMAP.md',
  'docs/ISSUE_AUTHORITY.md',
  'DEPLOYMENT.md',
  '.control-room/README_SYNC_POLICY.md',
];

const HISTORICAL = [
  'SPRINT.md',
  'docs/WIRING_STATUS.md',
];

test('durable founder and agent entry points declare a live truth boundary', async () => {
  for (const path of DURABLE) {
    const document = await read(path);
    assert.match(document, /<!-- truth-mode: durable -->/);
    assert.match(document, /Live truth boundary/i);
  }
});

test('former current-status surfaces are explicit historical entrypoints', async () => {
  for (const path of HISTORICAL) {
    const document = await read(path);
    assert.match(document, /<!-- truth-mode: historical -->/);
    assert.match(document, /Historical snapshot/i);
    assert.match(document, /Git history|preserved/i);
  }
});

test('truth authority encodes verification expiry and contradiction semantics', async () => {
  const truth = await read('docs/TRUTH_AUTHORITY.md');
  assert.match(truth, /VERIFIED@T1/);
  assert.match(truth, /HISTORICAL/);
  assert.match(truth, /REVOKED \/ SUPERSEDED/);
  assert.match(truth, /Exact-head repository evidence expires/);
  assert.match(truth, /Issue-body prose never overrides the live GitHub issue state/);
  assert.match(truth, /State → Evidence → Claim/);
  assert.match(truth, /OBSERVED_AT/);
  assert.match(truth, /stale-current-claim count/);
});

test('documentation map separates live systems, machine truth, durable contracts, and history', async () => {
  const map = await read('docs/DOCUMENTATION_MAP.md');
  assert.match(map, /Level 0 — inspected external truth/);
  assert.match(map, /Level 1 — machine-checked repository truth/);
  assert.match(map, /Level 2 — durable operating contracts/);
  assert.match(map, /Level 3 — historical snapshots/);
  assert.match(map, /newer authoritative contradiction supersedes/i);
  assert.match(map, /Do not leave an old sprint, status, or provider incident looking current/);
  assert.match(map, /documentation-truth/i);
  assert.match(map, /docs\/ISSUE_AUTHORITY\.md/);
  assert.doesNotMatch(map, /current launch-status overlay/i);
});

test('issue authority preserves stable outcome ownership without copying live issue state', async () => {
  const issueAuthority = await read('docs/ISSUE_AUTHORITY.md');
  assert.match(issueAuthority, /Trust-01/);
  assert.match(issueAuthority, /#412/);
  assert.match(issueAuthority, /#420/);
  assert.match(issueAuthority, /Exact production release packet/);
  assert.match(issueAuthority, /Cloudflare Worker branch\/build production-authority gate/);
  assert.match(issueAuthority, /read GitHub live/);
  assert.doesNotMatch(issueAuthority, /Current `main`/);
});

test('launch roadmap is phased but does not embed a dated current checkpoint', async () => {
  const roadmap = await read('docs/LAUNCH_ROADMAP.md');
  assert.match(roadmap, /Phase 0 — Foundation integrated/);
  assert.match(roadmap, /Phase 1 — Launch trust spine/);
  assert.match(roadmap, /Phase 2 — Relationship and privacy lifecycle proof/);
  assert.match(roadmap, /Phase 3 — Device quality, accessibility, and safety/);
  assert.match(roadmap, /Phase 4 — Controlled alpha/);
  assert.match(roadmap, /Phase 5 — Launch clearance/);
  assert.match(roadmap, /Phase 6 — Public launch and learning/);
  assert.match(roadmap, /L4 continuity memory and L5 cross-companion synthesis remain separately gated future lanes/);
  assert.match(roadmap, /State → Evidence → Claim → Expiry → Supersession/);
  assert.doesNotMatch(roadmap, /Current 20\d{2}-\d{2}-\d{2} checkpoint/);
});

test('deployment contract retains exact release boundaries without claiming a live result', async () => {
  const deployment = await read('DEPLOYMENT.md');
  assert.match(deployment, /\.well-known\/sekret-release\.json/);
  assert.match(deployment, /canonical Cloudflare Worker `sekret-backend`/);
  assert.match(deployment, /canonical Pages project is `sekret-bip`/);
  assert.match(deployment, /production Playwright/);
  assert.match(deployment, /fail closed/);
  assert.match(deployment, /Cloudflare Access/);
  assert.doesNotMatch(deployment, /Latest.*HTTP/i);
});

test('README keeps product and UX canon while refusing to act as a release oracle', async () => {
  const readme = await read('README.md');
  assert.match(readme, /privacy-first emotional growth and self-expression/i);
  assert.match(readme, /Teen \/ Parent \/ Bip Jr journeys/);
  assert.match(readme, /Cosmic and character art is visual DNA and atmosphere, not product architecture/);
  assert.match(readme, /issue #696/);
  assert.match(readme, /does \*\*not\*\* declare the live release SHA/);
});

test('ledger extension still records the launch-documentation contract', async () => {
  const extension = JSON.parse(await read('implementation-ledger.extensions/launch-documentation-system.json'));
  assert.equal(extension.id, 'launch-documentation-system');
  assert.equal(extension.status, 'contract');
  assert.ok(extension.contractPaths.includes('docs/LAUNCH_ROADMAP.md'));
  assert.ok(extension.contractPaths.includes('docs/DOCUMENTATION_MAP.md'));
  assert.ok(extension.testPaths.includes('test/launch-documentation-contract.test.mjs'));
});

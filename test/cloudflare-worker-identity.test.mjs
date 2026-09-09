import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const wrangler = read('wrangler.toml');
const workflow = read('.github/workflows/deploy-cloudflare.yml');
const productionEnv = read('.env.production');
const verifier = read('scripts/verify-cloudflare-native-deploy.mjs');
const releaseObserver = read('scripts/publish-production-release-observation.mjs');
const deployWrapper = read('scripts/deploy-cloudflare-worker.mjs');
const workerEntry = read('worker/voice-entry.ts');
const packageJson = JSON.parse(read('package.json'));
const eas = JSON.parse(read('eas.json'));

const WORKER_NAME = 'sekret-backend';
const PRODUCTION_WORKER_URL = 'https://api.sekretbip.net';
const LEGACY_WORKERS_DEV_URL = 'https://sekret-backend.mcgill-raylene.workers.dev';
const ALPHA_WORKER_URL = 'https://sekret-backend-alpha.mcgill-raylene.workers.dev';
const RELEASE_MARKER_URL = 'https://app.sekretbip.net/.well-known/sekret-release.json';
// Founder-approved controlled-alpha isolation (wrangler.alpha.toml,
// docs/CLOUDFLARE_OWNERSHIP.md, reports/control-room/founder-operator/
// 20260718-controlled-alpha-activation/system-map.md): preview builds
// deliberately route to the distinct, non-production sekret-backend-alpha
// Worker instead of the canonical one.
const ALPHA_ROUTED_PROFILES = new Set(['preview', 'parent-preview']);

test('Wrangler targets the canonical Worker and leaves production routing provider-managed', () => {
  assert.match(wrangler, new RegExp(`^name = "${WORKER_NAME}"$`, 'm'));
  assert.match(wrangler, /^workers_dev = false$/m);
  assert.doesNotMatch(wrangler, /^\s*route\s*=/m);
  assert.doesNotMatch(wrangler, /^\s*routes\s*=/m);
  assert.doesNotMatch(wrangler, /^\[\[routes\]\]$/m);
  assert.match(wrangler, /^\[version_metadata\]$/m);
  assert.match(wrangler, /^binding = "CF_VERSION_METADATA"$/m);
  assert.match(wrangler, /^\[build\]$/m);
  assert.match(wrangler, /^command = "node scripts\/write-worker-release-identity\.mjs"$/m);
});

test('production verification proves the exact Worker and Pages release', () => {
  assert.ok(workflow.includes('npx playwright test'));
  assert.ok(workflow.includes('--config=playwright.production.config.ts'));
  assert.ok(workflow.includes('--grep-invert "production exposes the exact expected Pages and Worker release commit"'));
  assert.ok(workflow.includes('--grep "production exposes the exact expected Pages and Worker release commit"'));
  assert.ok(workflow.includes('scripts/verify-cloudflare-native-deploy.mjs'));
  assert.ok(workflow.includes('scripts/publish-production-release-observation.mjs'));
  assert.ok(workflow.includes(`${PRODUCTION_WORKER_URL}/health`));
  assert.equal(workflow.includes(`${LEGACY_WORKERS_DEV_URL}/health`), false);
  assert.ok(workflow.includes(RELEASE_MARKER_URL));
  assert.ok(workflow.includes('EXPECTED_RELEASE_SHA: ${{ inputs.target_sha || github.sha }}'));
  assert.ok(workflow.includes("RELEASE_OBSERVATION_ISSUE: '696'"));
  assert.ok(workflow.includes('checks: read'));
  assert.ok(workflow.includes('issues: write'));
  assert.ok(verifier.includes(`Workers Builds: ${WORKER_NAME}`));
  assert.ok(verifier.includes('Pages release marker'));
  assert.ok(verifier.includes('worker-release-sha-missing'));
  assert.ok(verifier.includes('worker-release-sha-stale'));
  assert.ok(verifier.includes('health?.releaseSha'));
  assert.ok(verifier.includes('workerRuntime'));
  assert.ok(releaseObserver.includes('sekret-production-release-observation'));
  assert.ok(releaseObserver.includes('validateReleaseEvidence'));
  assert.ok(releaseObserver.includes('Worker release SHA'));
  assert.ok(releaseObserver.includes('provenance only'));
  assert.ok(packageJson.scripts['build:web'].includes('write-release-metadata.mjs'));
});

test('production Worker exposes baked runtime SHA independently of provider version metadata', () => {
  assert.ok(workerEntry.includes("import { WORKER_RELEASE_SHA } from './release-identity.generated';"));
  assert.ok(workerEntry.includes('releaseSha: WORKER_RELEASE_SHA'));
  assert.ok(workerEntry.includes('version: workerVersionEvidence(env)'));
  assert.equal(workerEntry.includes('tag: version.tag ?? WORKER_RELEASE_SHA'), false);
  assert.ok(deployWrapper.includes('WORKERS_CI_COMMIT_SHA'));
  assert.ok(deployWrapper.includes("'--tag'"));
  assert.ok(deployWrapper.includes("'--message'"));
  assert.ok(deployWrapper.includes('git:${sha}'));
});

test('production web and native clients use the canonical backend custom domain', () => {
  assert.ok(productionEnv.includes(`EXPO_PUBLIC_BACKEND_URL=${PRODUCTION_WORKER_URL}`));
  assert.equal(productionEnv.includes(LEGACY_WORKERS_DEV_URL), false);

  for (const [profileName, profile] of Object.entries(eas.build)) {
    const expected = ALPHA_ROUTED_PROFILES.has(profileName) ? ALPHA_WORKER_URL : PRODUCTION_WORKER_URL;
    assert.equal(
      profile.env?.EXPO_PUBLIC_BACKEND_URL,
      expected,
      `${profileName} must point to ${expected}`,
    );
  }
});

test('only the newest main release verifier remains active', () => {
  assert.ok(workflow.includes('group: cloudflare-native-production'));
  assert.ok(workflow.includes('cancel-in-progress: true'));
  assert.equal(workflow.includes('github.sha }}'), true);
});

test('GitHub Actions does not require Cloudflare deployment credentials', () => {
  assert.equal(workflow.includes('CLOUDFLARE_API_TOKEN'), false);
  assert.equal(workflow.includes('CLOUDFLARE_ACCOUNT_ID'), false);
  assert.equal(workflow.includes('wrangler deploy'), false);
  assert.equal(workflow.includes('wrangler pages deploy'), false);
});

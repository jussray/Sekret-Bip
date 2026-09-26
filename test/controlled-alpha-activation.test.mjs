import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('controlled alpha activates built relationship surfaces without widening public or inventing L4', async () => {
  const flags = await read('src/constants/relationshipFeatureFlags.ts');

  assert.match(flags, /bridgeSummaries:\s*'beta'/);
  assert.match(flags, /crewAccountability:\s*'beta'/);
  assert.match(flags, /emotionalScrapbook:\s*'internal'/);
  assert.match(flags, /companionMemory:\s*'disabled'/);
  assert.match(flags, /FOUNDER_PREVIEWABLE_FEATURES[\s\S]*'emotionalScrapbook'/);
  assert.doesNotMatch(flags, /bridgeSummaries:\s*'enabled'/);
  assert.doesNotMatch(flags, /crewAccountability:\s*'enabled'/);
});

test('preview builds use the isolated alpha Worker while production stays canonical', async () => {
  const eas = JSON.parse(await read('eas.json'));

  assert.equal(
    eas.build.preview.env.EXPO_PUBLIC_BACKEND_URL,
    'https://sekret-backend-alpha.mcgill-raylene.workers.dev',
  );
  assert.equal(eas.build.preview.env.EXPO_PUBLIC_RELEASE_AUDIENCE, 'beta');
  assert.equal(
    eas.build['parent-preview'].env.EXPO_PUBLIC_BACKEND_URL,
    'https://sekret-backend-alpha.mcgill-raylene.workers.dev',
  );
  assert.equal(eas.build['parent-preview'].env.EXPO_PUBLIC_RELEASE_AUDIENCE, 'beta');
  assert.equal(
    eas.build.production.env.EXPO_PUBLIC_BACKEND_URL,
    'https://api.sekretbip.net',
  );
  assert.equal(eas.build.production.env.EXPO_PUBLIC_RELEASE_AUDIENCE, 'public');
  assert.equal(
    eas.build['parent-production'].env.EXPO_PUBLIC_BACKEND_URL,
    'https://api.sekretbip.net',
  );
  assert.equal(eas.build['parent-production'].env.EXPO_PUBLIC_RELEASE_AUDIENCE, 'public');
});

test('alpha Worker is isolated and fail-closed without changing production configuration', async () => {
  const alpha = await read('wrangler.alpha.toml');
  const production = await read('wrangler.toml');

  assert.match(alpha, /name\s*=\s*"sekret-backend-alpha"/);
  assert.match(alpha, /BRIDGE_SUMMARIES_ROLLOUT\s*=\s*"disabled"/);
  assert.match(alpha, /comma-separated allowlist/);
  assert.doesNotMatch(alpha, /(OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY)\s*=/);
  assert.doesNotMatch(alpha, /BRIDGE_SUMMARIES_ROLLOUT\s*=\s*"enabled"/);
  assert.match(production, /BRIDGE_SUMMARIES_ROLLOUT\s*=\s*"disabled"/);
});

test('controlled-alpha commands are explicit and cannot silently deploy production', async () => {
  const pkg = JSON.parse(await read('package.json'));

  assert.equal(
    pkg.scripts['test:controlled-alpha'],
    'node --test test/controlled-alpha-activation.test.mjs test/controlled-alpha-founder-room-plan.test.mjs test/controlled-alpha-service-boundaries.test.mjs test/controlled-alpha-crew-access-hardening.test.mjs',
  );
  assert.equal(
    pkg.scripts['verify:worker:alpha'],
    'wrangler deploy --config wrangler.alpha.toml --dry-run',
  );
  assert.equal(
    pkg.scripts['deploy:worker:alpha'],
    'wrangler deploy --config wrangler.alpha.toml',
  );
  assert.equal(
    pkg.scripts['preview:worker:alpha'],
    'wrangler dev --config wrangler.alpha.toml',
  );
  assert.equal(
    pkg.scripts['deploy:api:production'],
    'node scripts/assert-production-deploy-branch.mjs && node scripts/deploy-cloudflare-worker.mjs',
  );
  assert.equal(pkg.scripts['deploy:worker'], 'npm run deploy:api:production');
});

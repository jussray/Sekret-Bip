import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('current repository authority stays internally consistent', () => {
  const targets = JSON.parse(read('config/cloudflare-targets.json'));
  const wrangler = read('wrangler.toml');
  const workflow = read('.github/workflows/deploy-cloudflare.yml');
  const contractGate = read('.github/workflows/main-contract-drift-exact-head.yml');
  const pkg = JSON.parse(read('package.json'));
  const ownership = read('docs/CLOUDFLARE_OWNERSHIP.md');
  const emailRouting = read('docs/CLOUDFLARE_EMAIL_ROUTING.md');

  assert.equal(targets.production.worker.entrypoint, 'worker/voice-entry.ts');
  assert.match(wrangler, /^main = "worker\/voice-entry\.ts"$/m);
  assert.ok(workflow.includes('https://app.sekretbip.net/.well-known/sekret-release.json'));
  assert.equal(pkg.scripts['deploy:worker'], 'npm run deploy:api:production');
  assert.equal(
    pkg.scripts['deploy:api:production'],
    'node scripts/assert-production-deploy-branch.mjs && node scripts/deploy-cloudflare-worker.mjs',
  );
  assert.ok(ownership.includes('`worker/voice-entry.ts`'));
  assert.ok(emailRouting.includes('`worker/voice-entry.ts`'));
  assert.ok(!ownership.includes('https://sekretbip.net/release.json'));

  assert.match(contractGate, /runs-on: ubuntu-22\.04/);
  assert.match(contractGate, /cancel-in-progress: true/);
  assert.match(contractGate, /actions\/checkout@11d5960a326750d5838078e36cf38b85af677262/);
  assert.match(contractGate, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/);
  assert.match(contractGate, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
  assert.match(contractGate, /persist-credentials: false/);
  assert.doesNotMatch(contractGate, /uses:\s+[^\s]+@v\d+/);
  assert.doesNotMatch(contractGate, /uses:\s+[^\s]+@(?:main|master|latest)/);
});

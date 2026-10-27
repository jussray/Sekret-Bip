import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const targets = JSON.parse(read('config/cloudflare-targets.json'));
const wrangler = read('wrangler.toml');
const voiceEntry = read('worker/voice-entry.ts');
const observedIndex = read('worker/observed-index.ts');
const backendRouter = read('worker/index.ts');
const replyWorker = read('worker/sekret-reply.ts');
const ownership = read('docs/CLOUDFLARE_OWNERSHIP.md');
const emailRouting = read('docs/CLOUDFLARE_EMAIL_ROUTING.md');
const consolidation = read('docs/CLOUDFLARE_WORKER_CONSOLIDATION.md');

const legacyNames = ['bip-mail'];
const protectedSeparateWorker = 'bip';

test('production Cloudflare authority keeps Pages, canonical backend, and renamed companion Worker distinct', () => {
  assert.deepEqual(Object.keys(targets.production).sort(), ['pages', 'worker']);
  assert.equal(targets.production.pages.name, 'sekret-bip');
  assert.equal(targets.production.worker.name, 'sekret-backend');
  assert.ok(targets.providerInventory.workers.includes(protectedSeparateWorker));
  assert.equal(targets.separateWorkerAuthorities?.bip?.status, 'founder-confirmed-renamed-from-sekret');
  assert.equal(targets.separateWorkerAuthorities?.bip?.previousName, 'sekret');
  assert.equal(targets.separateWorkerAuthorities?.bip?.providerIdentityReadback, 'required');
  assert.equal(targets.separateWorkerAuthorities?.bip?.routeBinding, 'provider-readback-required');
  assert.equal(targets.legacyDashboardServices.some((service) => service.name === protectedSeparateWorker), false);
});

test('sekret-backend owns the checked-in public API path while the companion split remains a provider-gated target', () => {
  assert.match(wrangler, /^name = "sekret-backend"$/m);
  assert.match(wrangler, /^main = "worker\/voice-entry\.ts"$/m);
  assert.ok(voiceEntry.includes("import observedWorker from './observed-index';"));
  assert.ok(observedIndex.includes("import worker from './index';"));
  assert.ok(backendRouter.includes('/api/sekret/reply'));
  assert.ok(voiceEntry.includes('/api/sekret/voice'));
  assert.ok(replyWorker.includes('/api/sekret/transcribe'));
  assert.ok(targets.production.worker.roles.includes('sekret-reply'));
});

test('only actually retired dashboard Workers remain retirement targets', () => {
  assert.deepEqual(targets.legacyDashboardServices.map((service) => service.name).sort(), legacyNames.slice().sort());
  const wranglerFiles = fs.readdirSync(root).filter((name) => /^wrangler.*\.toml$/.test(name));
  for (const file of wranglerFiles) assert.doesNotMatch(read(file), /^name = "bip-mail"$/m, `${file} must not deploy bip-mail`);
});

test('documentation records bip as current provider name while preserving sekret as historical lineage', () => {
  assert.ok(ownership.includes('`bip`'));
  assert.ok(ownership.includes('formerly `sekret`'));
  assert.ok(ownership.includes('provider route/custom-domain readback'));
  assert.ok(consolidation.includes('`bip`'));
  assert.ok(consolidation.includes('previous provider name `sekret`'));
  assert.ok(consolidation.includes('must not be deleted'));
  assert.ok(emailRouting.includes('change the Worker action from `bip-mail` to `sekret-backend`'));
});

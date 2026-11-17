import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const config = JSON.parse(
  readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

test('disables automatic Vercel Git deployments', () => {
  assert.equal(config?.git?.deploymentEnabled, false);
});

test('keeps canonical web and API deploy commands on Cloudflare', () => {
  assert.match(pkg.scripts['deploy:web:production'], /wrangler pages deploy dist --project-name sekret-bip --branch main/);
  assert.match(pkg.scripts['deploy:api:production'], /deploy-cloudflare-worker\.mjs/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MISSIONS } from '../scripts/bip-sprite-proof.mjs';

test('checked-in Sprite governance manifest remains strict and matches runtime', () => {
  const policy = JSON.parse(readFileSync(new URL('../config/bip-sprite-policy.json', import.meta.url), 'utf8'));
  assert.equal(policy.schema, 'juss/bip-sprite-policy@v1');
  assert.equal(policy.network, 'deny-all');
  assert.equal(policy.access, 'sprite-private-admins');
  assert.equal(policy.authority, 'Founder Control Room');
  assert.deepEqual(policy.allowedMissions, Object.keys(MISSIONS));
  assert.equal(policy.receiptAuthority, false);
  for (const forbidden of ['teen-personal-data','guardian-personal-data','production-secrets']) assert.ok(policy.deniedData.includes(forbidden));
  for (const forbidden of ['arbitrary-shell','git-push','git-merge','deploy']) assert.ok(policy.neverAuthorized.includes(forbidden));
});

test('GitHub workflow uses exact-head read-only checks rather than secret-based Sprite dispatch', () => {
  const workflow = readFileSync(new URL('../.github/workflows/bip-sprite-proof.yml', import.meta.url), 'utf8');
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /EXPECTED_HEAD_SHA/);
  assert.match(workflow, /git rev-parse HEAD/);
  assert.match(workflow, /node --test test\/bip-sprite-proof\.test\.mjs/);
  assert.doesNotMatch(workflow, /secrets\.|CLOUDFLARE_API_TOKEN|SUPABASE_SERVICE_ROLE_KEY|curl\s/);
});

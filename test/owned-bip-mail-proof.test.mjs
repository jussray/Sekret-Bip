import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const workflow = fs.readFileSync(path.join(root, '.github/workflows/owned-bip-signup-proof.yml'), 'utf8');
const mailbox = fs.readFileSync(path.join(root, 'scripts/live-signup-mailbox.mjs'), 'utf8');

test('owned Bip proof uses only the existing controlled hello mailbox', () => {
  assert.match(mailbox, /const OWNED_BIP_ADDRESS = 'hello@sekretbip\.net'/);
  assert.match(mailbox, /LIVE_MAILBOX_MODE/);
  assert.match(mailbox, /bip_routed/);
  assert.doesNotMatch(mailbox, /SUPABASE_SERVICE_ROLE_KEY|CLOUDFLARE_API_TOKEN/);
});

test('owned Bip proof remains exact-head, isolated-preview, and explicit-write only', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /target_sha:/);
  assert.match(workflow, /preview_url:/);
  assert.match(workflow, /confirm_live_write:/);
  assert.match(workflow, /if: inputs\.confirm_live_write == true/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_HEAD_SHA"/);
  assert.match(workflow, /hostname\.endsWith\('\.pages\.dev'\)/);
  assert.match(workflow, /body\?\.commitSha !== process\.env\.EXPECTED_HEAD_SHA/);
  assert.match(workflow, /body\?\.environment !== 'preview'/);
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY|CLOUDFLARE_API_TOKEN/);
});

test('owned mailbox confirmation is proved by bounded returning sign-in, not inbox credentials', () => {
  assert.match(workflow, /LIVE_SIGNIN_ATTEMPTS: '120'/);
  assert.match(workflow, /LIVE_SIGNIN_RETRY_MS: '5000'/);
  assert.match(workflow, /record-owned-confirmation/);
  assert.match(mailbox, /confirmationStatus: 'proved_by_returning_signin'/);
  assert.match(mailbox, /persistent_owned_alias_not_deleted/);
  assert.doesNotMatch(workflow, /GMAIL|mail\.google\.com|gmail\.com/i);
});

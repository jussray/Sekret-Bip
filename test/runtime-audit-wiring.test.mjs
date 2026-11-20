import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/utils/parentLink.ts', import.meta.url), 'utf8');

const requiredEvents = [
  'auth_user_lookup_failed',
  'invite_generation_rpc_failed',
  'invite_generation_response_invalid',
  'pending_invite_lookup_failed',
  'invite_redemption_rpc_failed',
  'invite_redemption_response_invalid',
  'linked_teen_lookup_failed',
  'linked_parent_lookup_failed',
  'link_revocation_rpc_failed',
];

test('parent-link failures use sanitized runtime audit telemetry', () => {
  assert.match(source, /import \{ captureRuntimeError \} from '@\/services\/runtimeAudit'/);
  assert.match(source, /captureRuntimeError\('parent_window'/);
  assert.match(source, /screen: 'parentLink'/);
  assert.match(source, /severity: 'warning'/);

  for (const event of requiredEvents) {
    assert.match(source, new RegExp(`'${event}'`));
  }
});

test('audit metadata never includes the invite code or raw response body', () => {
  assert.doesNotMatch(source, /metadata:\s*\{[^}]*p_invite_code/s);
  assert.doesNotMatch(source, /metadata:\s*\{[^}]*normalized/s);
  assert.doesNotMatch(source, /metadata:\s*\{[^}]*data[,}]/s);
  assert.match(source, /response_type/);
});

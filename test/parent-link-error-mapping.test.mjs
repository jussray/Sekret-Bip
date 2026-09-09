import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/utils/parentLinkErrors.ts', import.meta.url), 'utf8');

const expectedMappings = [
  ['invalid_invite_code', 'invalid_code'],
  ['invite_not_found', 'invalid_code'],
  ['invite_not_pending', 'expired_or_used'],
  ['cannot_link_self', 'cannot_link_self'],
  ['completed teen profile required', 'not_eligible'],
  ['teen account is not eligible to create an invite', 'not_eligible'],
  ['active parent link must be revoked first', 'active_link_exists'],
  ['unauthorized', 'not_authenticated'],
];

test('error mapper follows the deployed parent-link RPC messages', () => {
  for (const [fragment, code] of expectedMappings) {
    assert.match(source, new RegExp(`fragment: '${fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[\\s\\S]*code: '${code}'`));
  }
});

test('unknown and blank errors fail closed as server errors', () => {
  assert.match(source, /if \(!normalized\)[\s\S]*code: 'server_error'/);
  assert.match(source, /return \{ code: 'server_error'/);
});

test('error codes distinguish eligibility, active-link, self-link, and invalid response failures', () => {
  for (const code of ['not_eligible', 'active_link_exists', 'cannot_link_self', 'invalid_response']) {
    assert.match(source, new RegExp(`\\| '${code}'`));
  }
});

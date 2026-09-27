import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const helper = fs.readFileSync(new URL('../src/utils/relationshipLinkStatus.ts', import.meta.url), 'utf8');
const card = fs.readFileSync(new URL('../src/components/settings/ParentLinkStatusCard.tsx', import.meta.url), 'utf8');
const teenSettings = fs.readFileSync(new URL('../app/(teen)/settings.tsx', import.meta.url), 'utf8');
const parentSettings = fs.readFileSync(new URL('../app/(parent)/settings.tsx', import.meta.url), 'utf8');

function functionBody(source, name, nextName) {
  const start = source.indexOf(`export async function ${name}`);
  const end = nextName ? source.indexOf(`export async function ${nextName}`, start + 1) : source.length;
  assert.notEqual(start, -1, `${name} is missing`);
  return source.slice(start, end === -1 ? source.length : end);
}

test('parent link status reads are side-scoped, minimized, and retain every readable row', () => {
  const body = functionBody(helper, 'fetchParentLinkStatuses', 'revokeParentLinkResult');
  assert.match(body, /select\('id,status,is_active,updated_at,expires_at'\)/);
  assert.match(body, /accountSide === 'teen'/);
  assert.match(body, /eq\('teen_user_id', userResult\.value\)/);
  assert.match(body, /eq\('parent_user_id', userResult\.value\)/);
  assert.doesNotMatch(body, /select\([^)]*teen_user_id/);
  assert.doesNotMatch(body, /select\([^)]*parent_user_id/);
  assert.doesNotMatch(body, /\.limit\(1\)/);
});

test('only migration-defined parent link states are accepted and malformed rows fail closed', () => {
  assert.match(helper, /new Set<ParentLinkStatus>\(\['pending', 'active', 'revoked', 'expired'\]\)/);
  assert.doesNotMatch(helper, /ParentLinkStatus[^\n]*blocked/);
  assert.match(helper, /PARENT_LINK_STATUSES\.has/);
  assert.match(helper, /code: 'invalid_response'.*Retry before making changes/s);
});

test('unlink targets the exact selected link and verifies boolean RPC responses', () => {
  const body = functionBody(helper, 'revokeParentLinkResult');
  assert.match(body, /rpc\('revoke_parent_link', \{ p_link_id: linkId \}\)/);
  assert.match(body, /typeof data !== 'boolean'/);
  assert.match(body, /return \{ ok: true, value: data \}/);
});

test('the shared card separates loading, no-link, offline retry, and recorded states', () => {
  for (const state of ['loading', 'error', 'ready']) {
    assert.match(card, new RegExp(`kind: '${state}'`));
  }
  for (const status of ['active', 'pending', 'revoked', 'expired']) {
    assert.match(card, new RegExp(`link\.status === '${status}'`));
  }
  assert.match(card, /Retry status/);
  assert.match(card, /links\.length === 0/);
  assert.match(card, /link\.canRevoke/);
});

test('offline revocation never guesses among a parent account’s possible teen rows', () => {
  assert.match(card, /accountSide === 'teen'/);
  assert.match(card, /one canonical parent-link row/);
  assert.match(card, /accountSide === 'parent'/);
  assert.match(card, /does not guess which link you meant/);
  assert.match(card, /confirmUnlink\(link\.linkId\)/);
});

test('both settings screens use the shared state machine and refresh after parent-link changes', () => {
  assert.match(teenSettings, /ParentLinkStatusCard[\s\S]*accountSide="teen"/);
  assert.match(parentSettings, /ParentLinkStatusCard[\s\S]*accountSide="parent"/);
  for (const source of [teenSettings, parentSettings]) {
    assert.match(source, /setLinkStatusVersion\(\(value\) => value \+ 1\)/);
    assert.doesNotMatch(source, /revokeParentLink\(\)/);
    assert.doesNotMatch(source, /No active link was found, or the connection could not be updated/);
  }
});

test('teen settings preserves current-main onboarding parent_link_sent signal', () => {
  assert.match(teenSettings, /advanceStage\(data\.user\.id, 'parent_link_sent'\)/);
});

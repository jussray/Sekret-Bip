import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const func = read('supabase/functions/account-data-export/index.ts');
const service = read('src/services/accountDataExport.ts');
const teenSettings = read('app/(teen)/settings.tsx');
const parentSettings = read('app/(parent)/settings.tsx');

test('export function authenticates with the caller session JWT, not a service/secret key', () => {
  // Deletion is an admin-triggered process and correctly uses the secret key
  // (see account-delete/index.ts). Export is a user-invoked read of their own
  // data and must rely on RLS via the caller's own session, matching
  // account-deletion-request's pattern, not account-delete's.
  assert.match(func, /getSupabasePublishableKey/);
  assert.doesNotMatch(func, /getSupabaseSecretKey/);
  assert.match(func, /global: \{ headers: \{ Authorization: authorization \} \}/);
  assert.match(func, /if \(!authorization\) return json\(\{ error: 'unauthorized' \}, 401\);/);
});

test('every export query filters on the JWT-derived user id, never a client-supplied id', () => {
  assert.doesNotMatch(func, /req\.json\(\)/, 'export must not read a user/account id from the request body');
  const queryBlock = func.slice(func.indexOf('const [profile'), func.indexOf('const failures'));
  const eqCount = (queryBlock.match(/\.eq\('user_id', userId\)/g) ?? []).length;
  assert.equal(eqCount, 6, 'all 6 queried tables must filter by the JWT-derived userId, with no exceptions');
  assert.match(queryBlock, /db\.from\('agent_memories'\)[\s\S]{0,120}\.eq\('user_id', userId\)/);
});

test('export scope is explicit and documented, excluding cross-account tables for this slice', () => {
  assert.match(func, /scope: \['account', 'mood_history', 'journal_entries', 'room_memory', 'companion_memory'\]/);
  const queryBlock = func.slice(func.indexOf('const [profile'), func.indexOf('const failures'));
  assert.doesNotMatch(queryBlock, /bridge_share|bridge_summar|crew_members|bip_tasks|circle_posts/);
});

test('a partial query failure fails the whole export closed, never returns a silently incomplete payload', () => {
  assert.match(func, /export_partial_failure/);
  const tryIndex = func.indexOf('const failures');
  const returnOkIndex = func.indexOf('return json({\n    ok: true');
  assert.ok(tryIndex > -1 && returnOkIndex > tryIndex);
});

test('client service validates the shape of what the function returns before trusting it', () => {
  assert.match(service, /function isAccountDataExport/);
  assert.match(service, /if \(!isAccountDataExport\(exportData\)\)/);
});

test('both teen and parent settings surface Download my data outside the danger zone, not buried in it', () => {
  for (const [label, source] of [['teen', teenSettings], ['parent', parentSettings]]) {
    assert.match(source, /<DataExportControls \/>/, `${label} settings must render DataExportControls`);
    const dataSectionIndex = source.indexOf("sectionTitle}>Your data<");
    const dangerSectionIndex = source.indexOf("sectionTitle}>Danger zone<");
    assert.ok(dataSectionIndex > -1 && dangerSectionIndex > -1, `${label} settings must have both a "Your data" and a "Danger zone" section`);
    assert.ok(dataSectionIndex < dangerSectionIndex, `${label} settings must list "Your data" before "Danger zone", not inside it`);
  }
});

test('export failures never log untrusted provider error details', () => {
  // Provider errors may contain request metadata, tokens, or user identifiers.
  // UI feedback is fixed copy; logs must not interpolate provider error data.
  assert.doesNotMatch(service, /console\.(?:info|warn|error|log)\([^;\n]*\berror\.(?:message|stack|cause)/);
});

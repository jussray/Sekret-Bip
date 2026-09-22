import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260918001000_atomic_bridge_family_visit_summary_finalize.sql'),
  'utf8',
);

const functionStart = migration.indexOf('create or replace function public.finalize_bridge_family_visit_summaries');
assert.notEqual(functionStart, -1);
const functionBlock = migration.slice(functionStart, migration.indexOf('$$;', functionStart) + 3);

test('Family Visit finalization locks the exact session and evidence version before writes', () => {
  assert.match(functionBlock, /from public\.bridge_family_visit_sessions[\s\S]*for update;/i);
  assert.match(functionBlock, /v_session\.state <> 'reflection'[\s\S]*v_session\.updated_at is distinct from p_expected_updated_at/i);
  assert.match(functionBlock, /return 'evidence_changed';/i);

  const versionCheck = functionBlock.indexOf("return 'evidence_changed'");
  const firstSummaryWrite = functionBlock.indexOf('insert into public.bridge_family_visit_summaries');
  assert.ok(versionCheck >= 0 && firstSummaryWrite > versionCheck);
});

test('Family Visit finalization rechecks live authority and all three reflections', () => {
  assert.match(functionBlock, /v_assignment\.status <> 'active'/i);
  assert.match(functionBlock, /pp\.verification_status = 'verified'/i);
  assert.match(functionBlock, /count\(distinct actor_role\)/i);
  assert.match(functionBlock, /v_reflection_roles <> 3/i);

  const authorityCheck = functionBlock.indexOf("return 'authority_changed'");
  const alreadyReady = functionBlock.indexOf("return 'already_ready'");
  assert.ok(authorityCheck >= 0 && alreadyReady > authorityCheck);
});

test('both audience rows and ready state are written inside the same database function', () => {
  const summaryWrites = functionBlock.match(/insert into public\.bridge_family_visit_summaries/g) ?? [];
  assert.equal(summaryWrites.length, 2);
  assert.match(functionBlock, /p_session_id, 'parent'/i);
  assert.match(functionBlock, /p_session_id, 'professional'/i);
  assert.match(functionBlock, /update public\.bridge_family_visit_sessions[\s\S]*set state = 'ready'/i);
});

test('a concurrent winner is never overwritten and provenance is server-supplied', () => {
  const alreadyReady = functionBlock.indexOf("return 'already_ready'");
  const firstSummaryWrite = functionBlock.indexOf('insert into public.bridge_family_visit_summaries');
  assert.ok(alreadyReady >= 0 && alreadyReady < firstSummaryWrite);
  assert.match(functionBlock, /prompt_version = excluded\.prompt_version/i);
  assert.match(functionBlock, /model = excluded\.model/i);
  assert.match(functionBlock, /used_fallback = excluded\.used_fallback/i);
});

test('atomic finalization is service-role only', () => {
  assert.match(migration, /revoke all on function public\.finalize_bridge_family_visit_summaries\([\s\S]*from public, anon, authenticated;/i);
  assert.match(migration, /grant execute on function public\.finalize_bridge_family_visit_summaries\([\s\S]*to service_role;/i);
  assert.doesNotMatch(migration, /grant execute on function public\.finalize_bridge_family_visit_summaries\([\s\S]*to authenticated;/i);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const migrationsDir = new URL('../supabase/migrations/', import.meta.url);

async function readMigrationCorpus() {
  const names = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
  const sources = await Promise.all(names.map(async (name) => {
    const source = await read(`supabase/migrations/${name}`);
    return `-- ${name}\n${source}`;
  }));
  return sources.join('\n\n');
}

// Structural/source-assertion coverage for SECURITY DEFINER trigger functions
// that previously had little/no coverage. This is a stopgap, not a substitute
// for live rollback-contained probes: Postgres refuses to invoke a `returns
// trigger` function outside trigger context, and external-effecting triggers
// need special cleanup evidence.

test('enforce_circle_anonymity blocks identity reveal on public/parent_community posts', async () => {
  const source = await read('supabase/migrations/20260701174943_circle_v2_parent_community_guardian_access.sql');
  const fn = source.match(/create or replace function public\.enforce_circle_anonymity\(\)[\s\S]*?\$\$;/)?.[0];
  assert.ok(fn, 'expected enforce_circle_anonymity() definition');

  assert.match(fn, /security definer/);
  assert.match(fn, /set search_path = public/);
  assert.match(fn, /_kind in \('public', 'parent_community'\) and new\.is_identity_revealed is true/);
  assert.match(fn, /raise exception/);

  assert.match(source, /before insert or update on public\.posts/);
});

test('guard_crew_member_write rejects anonymous sessions and owner/id mismatch', async () => {
  const source = await read('supabase/migrations/20260714183100_remove_crew_caps_and_guard_relationships.sql');
  const fn = source.match(/create or replace function public\.guard_crew_member_write\(\)[\s\S]*?\$\$;/)?.[0];
  assert.ok(fn, 'expected guard_crew_member_write() definition');

  // Relies on auth.uid()/auth.jwt() from the calling session — SECURITY
  // INVOKER (the default; no explicit clause) is the correct mode here.
  assert.doesNotMatch(fn, /security definer/);

  assert.match(fn, /v_is_anonymous boolean := coalesce\(\(auth\.jwt\(\) ->> 'is_anonymous'\)::boolean, false\)/);
  assert.match(fn, /if v_uid is null or v_is_anonymous then/);
  assert.match(fn, /raise exception 'permanent_account_required'/);
  assert.match(fn, /raise exception 'crew_owner_mismatch'/);
  // Acceptance fields (member_user_id, accepted_at, connection_status) must
  // be server-controlled, not settable by the inserting/updating client.
  assert.match(fn, /raise exception 'crew_acceptance_is_server_controlled'/);
  assert.match(fn, /raise exception 'crew_relationship_identity_is_immutable'/);
});

test('cleanup_crew_relationship_access is SECURITY DEFINER, effectively pinned, and not directly callable', async () => {
  const definitionSource = await read('supabase/migrations/20260714183500_harden_crew_membership_paths.sql');
  const lockSource = await read('supabase/migrations/20260714183600_lock_crew_function_search_paths.sql');
  const fn = definitionSource.match(/create or replace function public\.cleanup_crew_relationship_access\(\)[\s\S]*?\$\$;/)?.[0];
  assert.ok(fn, 'expected cleanup_crew_relationship_access() definition');

  assert.match(fn, /security definer/);
  assert.match(definitionSource, /revoke all on function public\.cleanup_crew_relationship_access\(\) from public, anon, authenticated/);
  assert.match(definitionSource, /after update of connection_status on public\.crew_members/);

  // The effective search_path is locked by the follow-up migration after the
  // function body was qualified. Checking only the original CREATE text would
  // miss a later weakening/removal of the deployed function setting.
  assert.match(
    lockSource,
    /alter function public\.cleanup_crew_relationship_access\(\)\s+set search_path = pg_catalog, pg_temp/i,
  );
});

test('apply_point_transaction is SECURITY DEFINER, pinned, and not directly callable', async () => {
  const source = await read('supabase/migrations/20260703_reconcile_point_ledger_schema.sql');
  const fn = source.match(/create or replace function public\.apply_point_transaction\(\)[\s\S]*?\$\$;/)?.[0];
  assert.ok(fn, 'expected apply_point_transaction() definition');

  assert.match(fn, /security definer/);
  assert.match(fn, /set search_path = public/);
  assert.match(source, /revoke all on function public\.apply_point_transaction\(\) from public, anon, authenticated/);

  assert.match(source, /after insert on public\.point_transactions/);
});

test('record_bridge_signal_activity is SECURITY DEFINER, pinned, and never stores Bridge content', async () => {
  const source = await read('supabase/migrations/20260714043000_humane_retention_loops.sql');
  const fn = source.match(/create or replace function public\.record_bridge_signal_activity\(\)[\s\S]*?\$\$;/)?.[0];
  assert.ok(fn, 'expected record_bridge_signal_activity() definition');

  assert.match(fn, /security definer/);
  assert.match(fn, /set search_path = public/);

  // Only safe metadata may enter bip_events.meta — no message/content field.
  // (Not a bare /\btext\b/ check: new.id::text is a legitimate type cast,
  // not content storage, and would false-positive on that pattern.)
  const insertMatch = fn.match(/insert into public\.bip_events[\s\S]*?\)\)\s*\)/);
  assert.ok(insertMatch, 'expected the bip_events insert() call');
  assert.doesNotMatch(insertMatch[0], /'content'|'message'|new\.content\b|new\.message\b|new\.text\b/);

  assert.match(source, /after insert on public\.bridge_signals/);
});

test('trigger_safety_scan does not regress the historical dynamic-field-access bug', async () => {
  const source = await read('supabase/migrations/20260701030000_fix_trigger_safety_scan_dynamic_field_access.sql');

  // Scope regression checks to the function body only — the file's header
  // comment narrates the historical bug using the literal strings NEW.text /
  // NEW.body / CASE _col_name to explain it, which would false-positive
  // against the whole file.
  const fn = source.match(/create or replace function public\.trigger_safety_scan\(\)[\s\S]*?\$\$;/)?.[0];
  assert.ok(fn, 'expected trigger_safety_scan() definition');

  // The fix: resolve NEW's fields dynamically via to_jsonb(NEW) so Postgres
  // doesn't need every attached table to expose the same static column names.
  assert.match(fn, /_row := to_jsonb\(NEW\)/);
  assert.match(fn, /_content := _row ->> _col_name/);
  assert.match(fn, /_user_id := coalesce\(_row ->> 'user_id', _row ->> 'author_user_id'\)/);

  // Static NEW access caused the historical runtime field-resolution bug.
  // `posts` exposes author_user_id rather than user_id, so NEW.user_id is also
  // prohibited even when the dynamic coalesce remains present.
  assert.doesNotMatch(fn, /CASE\s+_col_name/i);
  assert.doesNotMatch(fn, /NEW\.text\b/);
  assert.doesNotMatch(fn, /NEW\.body\b/);
  assert.doesNotMatch(fn, /NEW\.user_id\b/);
});

// KNOWN GAP, tracked not hidden. auto_resolve_issue_on_event_resolve is
// SECURITY DEFINER but currently has no effective search_path pin. Existing
// deployed migrations should not be edited after deployment; when the gap is
// repaired, a follow-up migration may use ALTER FUNCTION ... SET search_path or
// a replacement function definition. This test reads the full migration corpus
// so the future effective configuration is what matters, not only the original
// historical definition.
test(
  'auto_resolve_issue_on_event_resolve pins search_path (SECURITY DEFINER)',
  { todo: 'known gap — SECURITY DEFINER without effective search_path pin, see SPRINT.md "SECURITY DEFINER trigger assurance"' },
  async () => {
    const source = await read('supabase/migrations/20260701_control_room_normalization.sql');
    const corpus = await readMigrationCorpus();
    const fn = source.match(/create or replace function public\.auto_resolve_issue_on_event_resolve\(\)[\s\S]*?\$\$;/)?.[0];
    assert.ok(fn, 'expected auto_resolve_issue_on_event_resolve() definition');

    assert.match(fn, /security definer/);
    assert.match(
      `${fn}\n${corpus}`,
      /(set search_path = public|alter function public\.auto_resolve_issue_on_event_resolve\(\)\s+set search_path\s*=\s*(public|pg_catalog, pg_temp))/i,
      'SECURITY DEFINER trigger functions must have an effective search_path pin — see SPRINT.md',
    );
  },
);

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const probePath = new URL('../supabase/probes/parent_form_feature_gates_phase1.sql', import.meta.url);
const workflowPath = new URL('../.github/workflows/supabase-fresh-replay.yml', import.meta.url);

test('parent-form rollout probe is rollback-contained and validates real database grants', () => {
  const sql = readFileSync(probePath, 'utf8');
  assert.match(sql, /^begin;/im);
  assert.match(sql, /rollback;\s*$/i);
  assert.doesNotMatch(sql, /\bcommit;/i);
  assert.match(sql, /parent_registration/);
  assert.match(sql, /parent_private_forms/);
  assert.match(sql, /count\(\*\)\s*=\s*2/i);
  assert.match(sql, /foreach actor in array array\['anon', 'authenticated'\]/);
  assert.match(sql, /has_table_privilege\(actor,/);
  assert.match(sql, /'SELECT'/i);
  for (const privilege of ['INSERT','UPDATE','DELETE','TRUNCATE']) {
    assert.match(sql, new RegExp("'"+privilege+"'"));
  }
  assert.match(sql, /relrowsecurity/);
  assert.doesNotMatch(sql, /auth\.users|parent_links|journal|voice|service_role_key/i);
});

test('ephemeral Supabase PR preview executes the parent form probe after migrations', () => {
  const workflow = readFileSync(workflowPath, 'utf8');
  const replay = workflow.indexOf('- name: Start empty local database and replay ordered migrations');
  const probe = workflow.indexOf('- name: Prove parent form rollout authorization');
  const cleanup = workflow.indexOf('- name: Stop ephemeral Supabase');
  assert.ok(replay >= 0 && probe > replay && cleanup > probe);
  assert.match(workflow, /-f supabase\/probes\/parent_form_feature_gates_phase1\.sql/);
  assert.match(workflow, /psql "\$SUPABASE_DB_URL"/);
  assert.match(workflow, /-v ON_ERROR_STOP=1/);
});

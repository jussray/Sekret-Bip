import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = () => readFileSync(new URL('../supabase/migrations/20261125204809_parent_form_feature_gates.sql', import.meta.url), 'utf8');

test('parent-form rollout is seeded disabled and cannot activate on migration replay', () => {
  const source = sql();
  assert.match(source, /create table if not exists public\.parent_form_feature_gates/i);
  assert.match(source, /'parent_registration',\s*false/i);
  assert.match(source, /'parent_private_forms',\s*false/i);
  assert.match(source, /on conflict \(name\) do nothing/i);
  assert.doesNotMatch(source, /set enabled\s*=\s*true/i);
});

test('client roles may read only non-sensitive rollout booleans; no client may mutate them', () => {
  const source = sql();
  assert.match(source, /alter table public\.parent_form_feature_gates enable row level security/i);
  assert.match(source, /revoke all privileges on table public\.parent_form_feature_gates from public, anon, authenticated/i);
  assert.match(source, /grant select on table public\.parent_form_feature_gates to anon, authenticated/i);
  assert.match(source, /create policy parent_form_gate_public_read[\s\S]*for select to anon, authenticated[\s\S]*using \(true\)/i);
  assert.doesNotMatch(source, /grant\s+(insert|update|delete|all)\s+on table public\.parent_form_feature_gates to (public|anon|authenticated)/i);
});

test('parent form gate remains separate from teen consent and privileged application configuration', () => {
  const source = sql();
  assert.match(source, /name in \('parent_registration', 'parent_private_forms'\)/i);
  assert.match(source, /not an authorization boundary/i);
  assert.doesNotMatch(source, /\b(?:parent_links|bridge_summaries|journal_entries|app_private_config)\b/i);
  assert.doesNotMatch(source, /security definer/i);
});

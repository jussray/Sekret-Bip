import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync('.github/workflows/apply-social-rls-single-migration.yml', 'utf8');
const witness = fs.readFileSync('supabase/probes/social_rls_single_migration_witness.sql', 'utf8');
const canonicalFile = 'supabase/migrations/20261006040000_social_surfaces_permanent_accounts_only.sql';
const migration = fs.readFileSync(canonicalFile, 'utf8');

const tables = [
  'friendships', 'circles', 'circle_members', 'circle_posts', 'posts', 'post_comments',
  'post_reactions', 'crews', 'crew_check_ins', 'crew_check_in_shares',
  'crew_encouragements', 'scrapbook_entries', 'parent_mood_summaries', 'parent_notes',
];

test('production operator is only manual, exact-main, production-gated and requires an exact apply confirmation', () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^  (push|pull_request|schedule):/m);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /group: supabase-production-migrations/);
  assert.match(workflow, /APPLY SOCIAL RLS 20261006040000 ONLY/);
  assert.match(workflow, /test "\$\(git rev-parse FETCH_HEAD\)" = "\$TARGET_SHA"/);
  assert.match(workflow, /REVIEWED_SQL_BLOB_CHANGED/);
  // Reconstruct the public, reviewed Git blob ID and verify the file byte-for-byte.
  const parts = workflow.match(/reviewed_blob="\\$\\(printf '%s%s' '([0-9a-f]+)' '([0-9a-f]+)'\\)"/);
  assert.ok(parts, 'reviewed immutable public Git blob identity is required');
  const reviewedBlob = parts[1] + parts[2];
  assert.equal(reviewedBlob.length, 40);
  const actualBlob = createHash('sha1')
    .update(`blob ${Buffer.byteLength(migration)}\\0`)
    .update(migration)
    .digest('hex');
  assert.equal(reviewedBlob, actualBlob);
  assert.match(workflow, /git hash-object "\\$MIGRATION_FILE"/);
  assert.match(workflow, /supabase-target-identity\.mjs/);
  assert.match(workflow, /PGSSLMODE: require/);
  assert.match(workflow, /PGPASSWORD: \$\{\{ secrets\.SUPABASE_DB_PASSWORD \}\}/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_URL|db_url=/);
});

test('only the existing canonical policy migration may execute, never a blanket migration push', () => {
  assert.match(workflow, /MIGRATION_FILE: supabase\/migrations\/20261006040000_social_surfaces_permanent_accounts_only\.sql/);
  assert.match(workflow, /psql -X -q -v ON_ERROR_STOP=1 -f "\$MIGRATION_FILE"/);
  assert.equal((workflow.match(/psql -X -q -v ON_ERROR_STOP=1 -f "\$MIGRATION_FILE"/g) || []).length, 1);
  assert.doesNotMatch(workflow, /^\s+supabase db push\b/m);
  assert.doesNotMatch(workflow, /^\s+supabase migration up\b/m);
  assert.match(workflow, /supabase migration repair "\$MIGRATION_VERSION" --status applied --linked/);
  assert.doesNotMatch(workflow, /--status reverted/);
  assert.match(workflow, /POST_DDL_POLICY_OR_HISTORY_MISMATCH_NO_REPAIR_PERFORMED/);
  assert.match(workflow, /FINAL_AUTHORIZATION_OR_HISTORY_WITNESS_FAILED/);
  assert.match(migration, /as restrictive for all to authenticated/);
});

test('database witness observes only metadata and all 14 live guarded targets', () => {
  assert.equal(tables.length, 14);
  for (const table of tables) assert.ok(witness.includes(`('${table}')`), table);
  assert.match(witness, /from pg_policies/i);
  assert.match(witness, /from supabase_migrations\.schema_migrations/i);
  assert.match(witness, /p\.permissive = 'RESTRICTIVE'/);
  assert.match(witness, /p\.qual like '%IS FALSE%'/);
  assert.match(witness, /p\.with_check like '%IS FALSE%'/);
  assert.match(witness, /sha256\(convert_to/);
  assert.doesNotMatch(witness, /\bmd5\s*\(/i);
  assert.match(witness, /20261006040000/);
  assert.doesNotMatch(witness, /\b(insert|update|delete|alter|drop|create|grant|revoke|truncate)\b/i);
});

test('operator rejects mixed or changed authorization state and never unguards on rollback', () => {
  assert.match(workflow, /PARTIAL_OR_CONFLICTING_MIGRATION_STATE/);
  assert.match(workflow, /DATABASE_DRIFT_BEFORE_WRITE/);
  assert.match(workflow, /SOURCE_DRIFT_BEFORE_WRITE/);
  assert.match(workflow, /preflight_rls_enabled/);
  assert.match(workflow, /postflight_effective_guards/);
  assert.match(workflow, /fingerprint.*baseline_hash/);
  assert.doesNotMatch(workflow, /^\s+drop policy\b/im);
  assert.doesNotMatch(workflow, /^\s+supabase db reset\b/im);
});

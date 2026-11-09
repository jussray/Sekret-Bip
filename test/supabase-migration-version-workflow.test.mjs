import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('local Supabase version integrity check always runs on PRs and main pushes', () => {
  const workflow = read('.github/workflows/supabase-migration-version-integrity.yml');
  assert.match(workflow, /on:\n\s+pull_request:\n\s+branches: \[main\]\n\s+push:\n\s+branches: \[main\]/);
  assert.doesNotMatch(workflow, /\bpaths:|continue-on-error: true/);
  assert.match(workflow, /node --test test\/supabase-migration-version-order\.test\.mjs test\/supabase-migration-version-workflow\.test\.mjs/);
  assert.match(workflow, /--local-only/);
  assert.match(workflow, /persist-credentials: false/);
});

test('production dry-run audits remote versions via read-only database query', () => {
  const workflow = read('.github/workflows/deploy-supabase-migrations.yml');
  const auditIndex = workflow.indexOf('Audit live migration versions without altering history');
  const dryRunIndex = workflow.indexOf('Preview production migration plan');
  assert.ok(auditIndex >= 0 && dryRunIndex > auditIndex);
  assert.match(workflow, /supabase_migrations\.schema_migrations/);
  assert.match(workflow, /--remote-file "\$ledger"/);
  assert.match(workflow, /--output artifacts\/supabase-migration-version-live-audit\.json/);
  assert.match(workflow, /supabase db push --linked --dry-run/);
  assert.doesNotMatch(workflow.slice(auditIndex, dryRunIndex), /migration repair|update supabase_migrations|delete from supabase_migrations/i);
});


test('full Supabase SQL replay runs for PRs and merged main commits', () => {
  const workflow = read('.github/workflows/supabase-fresh-replay.yml');
  assert.match(workflow, /on:\n\s+pull_request:\n\s+branches: \[main\]\n\s+push:\n\s+branches: \[main\]/);
  assert.match(workflow, /Replay migrations from empty local database/);
  assert.doesNotMatch(workflow, /continue-on-error: true/);
});

test('migration auditor writes detailed findings to artifacts, never dynamic logs', () => {
  const source = read('scripts/audit-supabase-migration-versions.mjs');
  assert.match(source, /await fs\.writeFile\(options\.output, serialized, 'utf8'\)/);
  assert.match(source, /SUPABASE_REMOTE_MIGRATION_NOT_IN_REPO/);
  assert.match(source, /SUPABASE_MIGRATION_VERSION_AUDIT_FAILED/);
  assert.doesNotMatch(source, /process\.(stdout|stderr)\.write\(/);
  assert.doesNotMatch(source, /console\.(?:log|error|info|warn)\([^'"`]/);
});

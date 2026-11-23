import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const scannerPath = fileURLToPath(new URL('../scripts/control-room-rls-scan.mjs', import.meta.url));

test('RLS scanner ignores commented DDL and recognizes verified server-only tables', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'control-room-rls-'));
  const migrations = path.join(root, 'supabase', 'migrations');
  fs.mkdirSync(migrations, { recursive: true });

  try {
    fs.writeFileSync(path.join(migrations, '001_server_only.sql'), `
-- Historical note: no CREATE TYPE/CREATE TABLE migration exists for this schema.
create table public.guardian_verification_reviews (id bigint primary key);
alter table public.guardian_verification_reviews enable row level security;
revoke all on table public.guardian_verification_reviews from anon, authenticated;

create table public.account_deletion_receipts (id uuid primary key);
alter table public.account_deletion_receipts enable row level security;
revoke all on table public.account_deletion_receipts from anon;
revoke all on table public.account_deletion_receipts from authenticated;

create table public.runtime_contract_versions (contract_key text primary key);
alter table public.runtime_contract_versions enable row level security;
revoke all on table public.runtime_contract_versions from anon;
revoke all on table public.runtime_contract_versions from authenticated;
`);

    const run = spawnSync(process.execPath, [scannerPath], {
      cwd: root,
      encoding: 'utf8',
    });

    assert.equal(run.status, 0, run.stderr || run.stdout);
    const report = JSON.parse(run.stdout);
    assert.equal(report.ok, true);
    assert.equal(report.finding_count, 0);
    assert.equal(report.verified_exception_count, 3);
    assert.deepEqual(
      report.verified_exceptions.map((item) => item.table).sort(),
      ['account_deletion_receipts', 'guardian_verification_reviews', 'runtime_contract_versions'],
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

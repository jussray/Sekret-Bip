import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  indexLocalMigrations,
  analyzeMigrationVersions,
  auditFromFiles,
} from '../scripts/audit-supabase-migration-versions.mjs';

const collision = [
  '20260626013453_push_tokens.sql',
  '20260626_parent_teen_snapshot_view.sql',
  '20260626013458_media_columns.sql',
  '0001_init.sql',
];

test('reproduces filename sorting collision and compares extracted versions', () => {
  assert.deepEqual(collision.slice().sort().slice(1, 3), [
    '20260626013453_push_tokens.sql', '20260626013458_media_columns.sql',
  ]);
  const local = indexLocalMigrations(collision);
  assert.deepEqual(local.map(x => x.version), ['0001', '20260626', '20260626013453', '20260626013458']);
  const report = analyzeMigrationVersions(local, ['20260626013453', '0001', '20260626']);
  assert.equal(report.outcome, 'HISTORY_MATCH_PENDING_MIGRATIONS');
  assert.deepEqual(report.missingLocal, []);
  assert.deepEqual(report.pendingRemote, ['20260626013458']);
  assert.deepEqual(report.prefixCollisions, ['20260626']);
});

test('real missing remote version fails closed even with a prefix collision', () => {
  const report = analyzeMigrationVersions(indexLocalMigrations(collision), [
    '20260626', '20260626013453', '20260626019999',
  ]);
  assert.deepEqual(report.missingLocal, ['20260626019999']);
  assert.equal(report.outcome, 'REMOTE_VERSION_MISSING_LOCALLY');
  assert.equal(report.authorizesHistoryRepair, false);
});

test('local-only pass is not a provider preview pass', () => {
  const report = analyzeMigrationVersions(indexLocalMigrations(collision));
  assert.equal(report.remoteObserved, false);
  assert.equal(report.outcome, 'LOCAL_ONLY_REMOTE_UNVERIFIED');
  assert.equal(report.providerPreviewCheckReplaced, false);
  assert.equal(report.authorizesMigrationMutation, false);
});

test('malformed and duplicate migrations or empty remote evidence fail closed', () => {
  assert.throws(() => indexLocalMigrations(['0001_a.sql', '0001_b.sql']), /Duplicate/);
  assert.throws(() => indexLocalMigrations(['202606261_invalid_length.sql']), /Invalid/);
  assert.throws(() => analyzeMigrationVersions(indexLocalMigrations(collision), []), /nonempty/);
  assert.throws(() => analyzeMigrationVersions(indexLocalMigrations(collision), ['0001', '0001']), /Duplicate remote/);
});

test('reads remote ledger without mutating user data or migration files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'supabase-migration-audit-'));
  try {
    await writeFile(join(dir, '0001_init.sql'), '-- preserved historical migration\n');
    await writeFile(join(dir, '20260626_legacy.sql'), '-- preserved short version\n');
    await writeFile(join(dir, '20260626000000_new.sql'), '-- current version\n');
    const ledger = join(dir, 'remote.json');
    await writeFile(ledger, JSON.stringify([{ version: '0001' }, { version: '20260626' }]));
    const report = await auditFromFiles({ migrationsDir: dir, remoteFile: ledger });
    assert.deepEqual(report.missingLocal, []);
    assert.deepEqual(report.pendingRemote, ['20260626000000']);
    assert.deepEqual((await readdir(dir)).sort(), [
      '0001_init.sql', '20260626000000_new.sql', '20260626_legacy.sql', 'remote.json',
    ].sort());
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { verifyMigrationLineage } from '../scripts/verify-supabase-migration-lineage.mjs';

function git(root, ...args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'supabase-lineage-'));
  git(root, 'init', '-b', 'main');
  git(root, 'config', 'user.email', 'lineage-test@example.com');
  git(root, 'config', 'user.name', 'Supabase Lineage Test');
  write(root, 'supabase/migrations/0001_init.sql', 'create table legacy_fixture(id bigint primary key);\n');
  write(root, 'supabase/migrations/20260815090000_historical_remote.sql', 'select 1;\n');
  write(root, 'supabase/migrations/20260816010000_create_alpha.sql', 'create table alpha(id bigint primary key);\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-m', 'baseline');
  return { root, base: git(root, 'rev-parse', 'HEAD') };
}

function commit(root, message = 'change') {
  git(root, 'add', '-A');
  git(root, 'commit', '-m', message);
  return git(root, 'rev-parse', 'HEAD');
}

function codes(result) {
  return result.violations.map((violation) => violation.code);
}

test('append-only newer migration passes and is measured', () => {
  const { root, base } = fixture();
  write(root, 'supabase/migrations/20260816020000_add_beta.sql', 'create table beta(id bigint primary key);\n');
  const head = commit(root);

  const result = verifyMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, true);
  assert.equal(result.addedMigrationCount, 1);
  assert.equal(result.baseMaxVersion, '20260816010000');
  assert.deepEqual(result.addedMigrations.map((entry) => entry.version), ['20260816020000']);
});

test('existing migration edits fail closed', () => {
  const { root, base } = fixture();
  write(root, 'supabase/migrations/20260816010000_create_alpha.sql', 'create table alpha(id text primary key);\n');
  const head = commit(root);

  const result = verifyMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, false);
  assert.ok(codes(result).includes('immutable-migration-modified'));
});

test('existing migration deletion fails closed', () => {
  const { root, base } = fixture();
  fs.rmSync(path.join(root, 'supabase/migrations/20260816010000_create_alpha.sql'));
  const head = commit(root);

  const result = verifyMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, false);
  assert.ok(codes(result).includes('immutable-migration-deleted'));
});

test('retimestamping an existing migration fails closed', () => {
  const { root, base } = fixture();
  fs.renameSync(
    path.join(root, 'supabase/migrations/20260816010000_create_alpha.sql'),
    path.join(root, 'supabase/migrations/20260816030000_create_alpha.sql'),
  );
  const head = commit(root);

  const result = verifyMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, false);
  assert.ok(codes(result).includes('immutable-migration-renamed'));
});

test('copying old SQL under a new timestamp is rejected', () => {
  const { root, base } = fixture();
  write(root, 'supabase/migrations/20260816030000_create_alpha_again.sql', 'create table alpha(id bigint primary key);\n');
  const head = commit(root);

  const result = verifyMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, false);
  assert.ok(codes(result).includes('duplicate-existing-migration-sql'));
});

test('backdated additions are rejected', () => {
  const { root, base } = fixture();
  write(root, 'supabase/migrations/20260815095000_backdated.sql', 'select 2;\n');
  const head = commit(root);

  const result = verifyMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, false);
  assert.ok(codes(result).includes('non-monotonic-migration-version'));
});

test('exact production receipt marker may represent an older live history version without becoming executable schema', () => {
  const { root, base } = fixture();
  write(
    root,
    'supabase/migrations/20260815095000_historical_remote.sql',
    '-- Production receipt marker for canonical migration 20260815090000.\n-- Already applied to the linked Supabase project; no schema changes.\n',
  );
  const head = commit(root);

  const result = verifyMigrationLineage({
    rootDir: root,
    baseRef: base,
    headRef: head,
    productionReceiptAliases: { '20260815090000': '20260815095000' },
  });

  assert.equal(result.verified, true);
  assert.equal(result.addedMigrationCount, 0);
  assert.equal(result.productionReceiptMarkerCount, 1);
  assert.deepEqual(result.productionReceiptMarkers[0], {
    path: 'supabase/migrations/20260815095000_historical_remote.sql',
    liveVersion: '20260815095000',
    canonicalVersion: '20260815090000',
    canonicalPath: 'supabase/migrations/20260815090000_historical_remote.sql',
  });
});

test('receipt-looking backdated files fail closed unless exact alias authority binds them', () => {
  const { root, base } = fixture();
  write(
    root,
    'supabase/migrations/20260815095000_historical_remote.sql',
    '-- Production receipt marker for canonical migration 20260815090000.\n-- Already applied to the linked Supabase project; no schema changes.\n',
  );
  const head = commit(root);

  const result = verifyMigrationLineage({
    rootDir: root,
    baseRef: base,
    headRef: head,
    productionReceiptAliases: {},
  });
  assert.equal(result.verified, false);
  assert.ok(codes(result).includes('non-monotonic-migration-version'));
});

test('embedded second timestamps are rejected for new migrations', () => {
  const { root, base } = fixture();
  write(root, 'supabase/migrations/20260816030000_20260816020000_alias.sql', 'select 1;\n');
  const head = commit(root);

  const result = verifyMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, false);
  assert.ok(codes(result).includes('embedded-migration-timestamp'));
});

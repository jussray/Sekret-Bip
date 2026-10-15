import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const url = process.env.SEKRET_TEST_PG_URL;
const repo = process.cwd();
const files = [
  path.join(repo, 'test', 'fixtures', 'guardian-consent', '00-reset-and-stub.sql'),
  path.join(repo, 'supabase', 'migrations', '20261012190000_guardian_summary_consent.sql'),
  path.join(repo, 'test', 'fixtures', 'guardian-consent', '10-assertions.sql'),
];

test('guardian consent migration satisfies the authorization matrix on Postgres',
  {},
  () => {
    assert.ok(url, 'SEKRET_TEST_PG_URL is required; provision a disposable LOCAL Postgres instance');
    const target = new URL(url);
    assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname),
      'Guardian test SQL is destructive to its target: a local isolated Postgres instance is mandatory');
    assert.equal(target.pathname, '/bip_test', 'Guardian test SQL requires the dedicated bip_test database');
    // The fixture drops tables. Confirm that this is an explicitly provisioned,
    // disposable test database before any reset SQL can run.
    const probe = spawnSync('psql', [
      url, '-At', '-v', 'ON_ERROR_STOP=1', '-c',
      "select count(*) from public.guardian_fixture_disposable_sentinel where marker = 'guardian-consent-disposable-v1'",
    ], { encoding: 'utf8' });
    assert.equal(probe.status, 0, 'Missing disposable-database sentinel; refusing destructive guardian fixture');
    assert.equal(probe.stdout.trim(), '1', 'Disposable-database sentinel must match before reset');
    for (const file of files) {
      const run = spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-f', file], { encoding: 'utf8' });
      assert.equal(run.status, 0, `${path.basename(file)} failed:\n${run.stderr || run.stdout}`);
    }
  });

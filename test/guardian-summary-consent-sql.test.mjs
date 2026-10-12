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
  { skip: url ? false : 'SEKRET_TEST_PG_URL not set: disposable Postgres required' },
  () => {
    for (const file of files) {
      const run = spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-f', file], { encoding: 'utf8' });
      assert.equal(run.status, 0, `${path.basename(file)} failed:\n${run.stderr || run.stdout}`);
    }
  });

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const callers = [
  ['.github/workflows/ci.yml', 'test'],
  ['.github/workflows/quality-gate.yml', 'unit-tests'],
  ['.github/workflows/regression-tests.yml', 'test'],
  ['.github/workflows/calm-controls-exact-head.yml', 'verify-calm-controls'],
  ['.github/workflows/settings-companion-canon.yml', 'verify-settings-companion-canon'],
];

test('every full-suite caller provisions disposable local Postgres and verifies it before npm test', () => {
  for (const [path, jobName] of callers) {
    const source = readFileSync(path, 'utf8');
    const jobStart = source.indexOf(`  ${jobName}:\n`);
    assert.notEqual(jobStart, -1, `Missing job ${jobName} in ${path}`);
    const tail = source.slice(jobStart);
    const boundary = tail.search(/\n  [a-z][A-Za-z0-9_-]*:\n/);
    const job = boundary > 0 ? tail.slice(0, boundary) : tail;

    assert.match(job, /^    services:\s*$/m, `Missing PostgreSQL service in ${path}`);
    assert.match(job, /^      postgres:\s*$/m);
    assert.match(job, /POSTGRES_DB: bip_test/);
    assert.match(job, /POSTGRES_PASSWORD: bip_test_ephemeral/);
    assert.match(job, /SEKRET_TEST_PG_URL: postgres:\/\/postgres:bip_test_ephemeral@127\.0\.0\.1:5432\/bip_test/);
    assert.match(job, /psql "\$SEKRET_TEST_PG_URL" -v ON_ERROR_STOP=1/);
    assert.match(job, /sudo apt-get install -y -qq postgresql-client ffmpeg/);
    assert.match(job, /ffmpeg -version/);
    assert.match(job, /ffprobe -version/);
    assert.match(job, /CREATE TABLE public\\.guardian_fixture_disposable_sentinel/);
    assert.match(job, /guardian-consent-disposable-v1/);
    assert.ok(job.indexOf('psql "$SEKRET_TEST_PG_URL"') < job.indexOf('npm test'),
      `Postgres must be available before the complete suite in ${path}`);
    assert.ok(job.indexOf('guardian_fixture_disposable_sentinel') < job.indexOf('npm test'),
      `Disposable-database sentinel must exist before the complete suite in ${path}`);
    assert.ok(job.indexOf('ffprobe -version') < job.indexOf('npm test'),
      `FFprobe must be available before the complete suite in ${path}`);
    assert.ok(!job.includes('SUPABASE_SERVICE_ROLE_KEY'), `Do not access production credentials in ${path}`);
  }
});

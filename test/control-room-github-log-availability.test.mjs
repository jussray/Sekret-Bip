import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const HEAD = 'a'.repeat(40);
const ENTRY = fileURLToPath(new URL('../scripts/control-room-ingest-github-test-skips.mjs', import.meta.url));

// Stub only the external GitHub transport; execute the actual scanner and report writer.
function stubGitHub({ firstStatus, totalCount }) {
  const jobs = [
    { id: 1, name: 'first', conclusion: 'failure' },
    { id: 2, name: 'second', conclusion: 'success' },
    { id: 3, name: 'known skip', conclusion: 'skipped' },
  ];
  globalThis.fetch = async (url) => {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith('/actions/runs/123')) {
      return Response.json({ id: 123, name: 'CI', head_sha: 'a'.repeat(40), conclusion: 'failure' });
    }
    if (pathname.endsWith('/actions/runs/123/jobs')) {
      return Response.json({ total_count: totalCount, jobs });
    }
    if (pathname.endsWith('/actions/jobs/1/logs')) {
      return new Response(firstStatus === 200 ? 'ordinary log' : 'untrusted-provider-body', { status: firstStatus });
    }
    if (pathname.endsWith('/actions/jobs/2/logs')) {
      return new Response('CONTROL_ROOM_TEST_SKIP_RECEIPT ' + JSON.stringify({ test_id: 'observed skip', reason: 'fixture' }));
    }
    if (pathname.endsWith('/actions/jobs/3/logs')) {
      return new Response('no log', { status: 404 });
    }
    throw new Error('UNEXPECTED_FIXTURE_REQUEST');
  };
}

function runScanner(firstStatus, totalCount = 3) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bip-log-evidence-'));
  try {
    const fixture = `(${stubGitHub.toString()})(${JSON.stringify({ firstStatus, totalCount })})`;
    const result = spawnSync(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(fixture)}`, ENTRY], {
      cwd: root,
      env: { ...process.env, GITHUB_REPOSITORY: 'jussray/Sekret-Bip', GH_TOKEN: 'synthetic-fixture', CONTROL_ROOM_GITHUB_RUN_ID: '123', CONTROL_ROOM_GITHUB_HEAD_SHA: HEAD, CONTROL_ROOM_GITHUB_INGEST: '0' },
      encoding: 'utf8',
      timeout: 15000,
    });
    assert.ifError(result.error);
    const reportPath = path.join(root, 'reports', 'control-room', 'github-test-skips-latest.json');
    assert.ok(fs.existsSync(reportPath), 'scanner must write an evidence report even when a job log is unavailable');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    assert.equal(report.head_sha, HEAD);
    assert.equal(report.skip_count, 2);
    assert.ok(report.observations.every((item) => item.authority === false && item.proof_satisfied === false));
    assert.doesNotMatch(result.stdout + result.stderr + JSON.stringify(report), /untrusted-provider-body/);
    return { status: result.status, report };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('missing non-skipped job logs preserve other skip witnesses and keep the gate failed', () => {
  for (const httpStatus of [404, 403, 503]) {
    const { status, report } = runScanner(httpStatus);
    assert.equal(status, 1);
    assert.equal(report.log_scan_complete, false);
    assert.deepEqual(report.unavailable_job_logs, [{ job_id: 1, http_status: httpStatus, reason_code: 'GITHUB_JOB_LOG_UNAVAILABLE' }]);
  }
});

test('known skipped jobs may have no logs without invalidating an otherwise complete scan', () => {
  const { status, report } = runScanner(200);
  assert.equal(status, 0);
  assert.equal(report.log_scan_complete, true);
  assert.deepEqual(report.unavailable_job_logs, []);
});

test('a truncated job listing cannot establish complete log evidence', () => {
  const { status, report } = runScanner(200, 4);
  assert.equal(status, 1);
  assert.equal(report.job_list_complete, false);
  assert.equal(report.log_scan_complete, false);
});

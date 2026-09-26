import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const candidates = [
  path.join(root, 'artifacts', 'control-room', 'local-verification-report.json'),
  path.join(root, 'reports', 'control-room', 'latest.json'),
];
const reportPath = candidates.find((candidate) => fs.existsSync(candidate));
const skipReportPath = path.join(root, 'reports', 'control-room', 'test-skips-latest.json');

if (!reportPath) {
  throw new Error('No local Control Room report found. Run `npm run verify:local` first.');
}

if (process.env.CONTROL_ROOM_INGEST !== '1') {
  throw new Error('Ingestion is opt-in. Re-run with CONTROL_ROOM_INGEST=1.');
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const failedChecks = Array.isArray(report.checks)
  ? report.checks.filter((check) => check.status === 'fail')
  : [];
const skipReport = fs.existsSync(skipReportPath)
  ? JSON.parse(fs.readFileSync(skipReportPath, 'utf8'))
  : { observations: [] };
const skippedTests = Array.isArray(skipReport.observations) ? skipReport.observations : [];

async function supabaseRequest(pathname, options = {}) {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}${pathname}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${body.slice(0, 700)}`);
  }
  return body ? JSON.parse(body) : null;
}

function fingerprint(check) {
  return `local_control_room:${check.id}:local`;
}

function severityFor(check) {
  if (['type-check', 'unit-tests', 'control-room-rls'].includes(check.id)) return 'error';
  return 'warning';
}

function suggestedFix(check) {
  if (check.id === 'control-room-rls') return 'Review the reported Supabase migration or policy failure before pushing.';
  if (check.id === 'companions') return 'Restore companion assets or update the companion asset contract intentionally.';
  if (check.id === 'type-check') return 'Fix the TypeScript errors shown in the local verification report.';
  if (check.id === 'unit-tests') return 'Fix the failing test before pushing or preparing a release.';
  if (check.id === 'voice-intelligence') return 'Review the voice intelligence test output and restore the expected reply path.';
  if (check.id === 'oracle') return 'Review Oracle discovery output and restore the expected integration contract.';
  return 'Review the local verification output and fix the failing command before pushing.';
}

async function ingestFailure(check) {
  const metadata = {
    source: 'local_control_room',
    report_generated_at: report.generatedAt || report.generated_at || null,
    report_path: path.relative(root, reportPath),
    command: check.commandText || null,
    exit_code: check.exitCode ?? null,
    duration_ms: check.durationMs ?? null,
    stdout_tail: String(check.stdoutTail || '').slice(0, 2000),
    stderr_tail: String(check.stderrTail || '').slice(0, 2000),
  };

  const inserted = await supabaseRequest('/rest/v1/audit_events', {
    method: 'POST',
    body: JSON.stringify({
      user_id: null,
      event_type: `local_verification_${check.id}_failed`,
      screen: check.area || 'local-control-room',
      severity: severityFor(check),
      message: `${check.label || check.id} failed during local verification.`,
      metadata,
      resolved: false,
    }),
  });

  const eventId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;
  if (!eventId) throw new Error(`audit_events insert did not return an id for ${check.id}.`);

  await supabaseRequest('/rest/v1/rpc/upsert_control_room_issue', {
    method: 'POST',
    body: JSON.stringify({
      p_fingerprint: fingerprint(check),
      p_source: 'local_control_room',
      p_category: check.area || 'verification',
      p_severity: severityFor(check),
      p_status: 'open',
      p_title: `${check.label || check.id} failed locally`,
      p_summary: `${check.commandText || check.id} exited with code ${check.exitCode ?? 'unknown'}.`,
      p_suggested_fix: suggestedFix(check),
      p_affected_surface: check.area || null,
      p_affected_user_id: null,
      p_event_id: eventId,
      p_metadata: metadata,
    }),
  });

  return check.id;
}

async function ingestSkip(item) {
  if (!item?.fingerprint || !item?.proof_cookie || item.authority !== false) {
    throw new Error('Local test-skip receipt is missing its non-authorizing continuity fields.');
  }
  const metadata = {
    source: 'local_test_skip',
    repository: item.repository || null,
    head_sha: item.head_sha || null,
    runner: item.runner || null,
    command: item.command || null,
    test_id: item.test_id || null,
    test_file: item.test_file || null,
    reason: item.reason || null,
    classification: item.classification || null,
    proof_cookie: item.proof_cookie,
    authority: false,
  };
  const inserted = await supabaseRequest('/rest/v1/audit_events', {
    method: 'POST',
    body: JSON.stringify({
      user_id: null,
      event_type: 'local_test_skipped',
      screen: 'local-control-room',
      severity: 'warning',
      message: `${item.test_id || 'A test'} was skipped and cannot satisfy complete proof.`,
      metadata,
      resolved: false,
    }),
  });
  const eventId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;
  if (!eventId) throw new Error(`audit_events insert did not return an id for ${item.fingerprint}.`);
  await supabaseRequest('/rest/v1/rpc/upsert_control_room_issue', {
    method: 'POST',
    body: JSON.stringify({
      p_fingerprint: item.fingerprint,
      p_source: 'local_control_room',
      p_category: 'test-skip',
      p_severity: 'warning',
      p_status: 'open',
      p_title: `Skipped proof witness: ${item.test_id || 'unknown test'}`,
      p_summary: `${item.reason || 'No skip reason supplied.'} A skip is not a pass.`,
      p_suggested_fix: 'Resolve the missing prerequisite or explicitly confirm the witness is inapplicable, then execute the required proof path.',
      p_affected_surface: 'local-tests',
      p_affected_user_id: null,
      p_event_id: eventId,
      p_metadata: metadata,
    }),
  });
  return item.fingerprint;
}

const ingestedFailures = [];
for (const check of failedChecks) ingestedFailures.push(await ingestFailure(check));
const ingestedSkips = [];
for (const item of skippedTests) ingestedSkips.push(await ingestSkip(item));

const result = {
  report_path: path.relative(root, reportPath),
  skip_report_path: fs.existsSync(skipReportPath) ? path.relative(root, skipReportPath) : null,
  report_status: report.summary?.status || null,
  failed_count: failedChecks.length,
  skipped_count: skippedTests.length,
  ingested_failure_count: ingestedFailures.length,
  ingested_skip_count: ingestedSkips.length,
  ingested: [...ingestedFailures, ...ingestedSkips],
};

console.log(JSON.stringify(result, null, 2));

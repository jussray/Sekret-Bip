/* eslint-disable */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportDir = path.join(root, 'artifacts', 'control-room');
const reportPath = path.join(reportDir, 'scanner-report.json');
const scanners = [
  ['structure', 'scripts/control-room-structural-scan.mjs'],
  ['rls', 'scripts/control-room-rls-scan.mjs'],
];

function runScanner(name, script) {
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  });

  let parsed;
  try {
    parsed = JSON.parse(result.stdout || '{}');
  } catch (error) {
    parsed = {
      scanner: name,
      scanned_at: new Date().toISOString(),
      ok: false,
      finding_count: 1,
      findings: [{
        source: 'build_pipeline',
        severity: 'error',
        event_type: 'scanner_output_invalid',
        screen: script,
        message: `Scanner output could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { script, stderr: String(result.stderr || '').slice(0, 500) },
      }],
    };
  }

  return {
    name,
    script,
    exit_code: result.status ?? 1,
    stderr: String(result.stderr || '').slice(0, 1000),
    result: parsed,
  };
}

function scannerSourceToCategory(source) {
  if (source === 'rls_scan') return 'rls';
  if (source === 'structural_scan') return 'structure';
  return 'infra';
}

function buildFingerprint(finding) {
  const source = finding.source || 'build_pipeline';
  const eventType = String(finding.event_type || 'scanner_finding').trim().toLowerCase();
  const screen = String(finding.screen || '*').trim() || '*';
  return `${source}:${eventType}:${screen}`;
}

function privilegedSupabaseKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function supabaseRequest(pathname, options = {}) {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = privilegedSupabaseKey();
  if (!url || !key) throw new Error('Supabase ingestion credentials are not configured.');

  const response = await fetch(`${url.replace(/\/$/, '')}${pathname}`, {
    ...options,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });

  const body = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${body.slice(0, 700)}`);
  return body ? JSON.parse(body) : null;
}

async function ingestFinding(finding, context) {
  const metadata = {
    ...(finding.metadata || {}),
    scanner: context.scanner,
    scanned_at: context.scanned_at,
    repository: process.env.GITHUB_REPOSITORY || null,
    workflow: process.env.GITHUB_WORKFLOW || null,
    run_id: process.env.GITHUB_RUN_ID || null,
    run_attempt: process.env.GITHUB_RUN_ATTEMPT || null,
    commit_sha: process.env.GITHUB_SHA || null,
    ref: process.env.GITHUB_REF || null,
  };

  const inserted = await supabaseRequest('/rest/v1/audit_events', {
    method: 'POST',
    body: JSON.stringify({
      user_id: null,
      event_type: finding.event_type,
      screen: finding.screen || null,
      severity: finding.severity || 'warning',
      message: finding.message || null,
      metadata,
      resolved: false,
    }),
  });

  const eventId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;
  if (!eventId) throw new Error('audit_events insert did not return an event id.');

  const rpcResult = await supabaseRequest('/rest/v1/rpc/upsert_control_room_issue', {
    method: 'POST',
    body: JSON.stringify({
      p_fingerprint: buildFingerprint(finding),
      p_source: finding.source || 'build_pipeline',
      p_category: scannerSourceToCategory(finding.source),
      p_severity: finding.severity || 'warning',
      p_status: 'open',
      p_title: String(finding.event_type || 'Scanner finding').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      p_summary: finding.message || 'Automated scanner finding.',
      p_suggested_fix: finding.source === 'rls_scan'
        ? 'Review the affected migration and add or correct RLS enablement and policies.'
        : 'Restore the required repository path or update the scanner contract intentionally.',
      p_affected_surface: finding.screen || null,
      p_affected_user_id: null,
      p_event_id: eventId,
      p_metadata: metadata,
    }),
  });

  return { event_id: eventId, issue_id: rpcResult };
}

const runs = scanners.map(([name, script]) => runScanner(name, script));
const findings = runs.flatMap((run) => run.result?.findings || []);
const ingestionEnabled = Boolean((process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL) && privilegedSupabaseKey());
const ingested = [];
const ingestionErrors = [];

if (ingestionEnabled) {
  for (const run of runs) {
    for (const finding of run.result?.findings || []) {
      try {
        const result = await ingestFinding(finding, {
          scanner: run.result.scanner || run.name,
          scanned_at: run.result.scanned_at || new Date().toISOString(),
        });
        ingested.push({ fingerprint: buildFingerprint(finding), ...result });
      } catch (error) {
        ingestionErrors.push({
          fingerprint: buildFingerprint(finding),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

const report = {
  generated_at: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY || null,
  commit_sha: process.env.GITHUB_SHA || null,
  scanner_count: runs.length,
  finding_count: findings.length,
  ingestion_enabled: ingestionEnabled,
  ingested_count: ingested.length,
  ingestion_error_count: ingestionErrors.length,
  runs,
  ingested,
  ingestion_errors: ingestionErrors,
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (ingestionErrors.length > 0) process.exitCode = 1;
else if (runs.some((run) => run.exit_code !== 0)) process.exitCode = 1;

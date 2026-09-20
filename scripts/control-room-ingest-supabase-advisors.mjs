import fs from 'node:fs';
import path from 'node:path';

import {
  resolveSupabaseTarget,
  verifySupabaseManagementIdentity,
} from './supabase-target-identity.mjs';

const reportOnly = process.env.CONTROL_ROOM_REPORT_ONLY === 'true';
const token = process.env.SUPABASE_MANAGEMENT_API_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const reportPath = path.join(process.cwd(), 'artifacts', 'control-room', 'supabase-advisors-report.json');

const severity = (level) => {
  const value = String(level || '').toUpperCase();
  return value === 'ERROR' ? 'error' : value.startsWith('WARN') ? 'warning' : 'info';
};

const fingerprint = (projectRef, kind, lint) => `supabase_advisor:${projectRef}:${kind}:${lint.cache_key || lint.name || 'unknown'}`;

async function post(urlBase, pathname, body) {
  const response = await fetch(`${urlBase.replace(/\/$/, '')}${pathname}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`SUPABASE_CONTROL_ROOM_WRITE_HTTP_${response.status}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const results = [];
  const errors = [];
  let target = null;
  let supabaseIdentity = null;

  if (!reportOnly) {
    try {
      target = await resolveSupabaseTarget();
      supabaseIdentity = await verifySupabaseManagementIdentity({ target, accessToken: token });
    } catch {
      errors.push({ kind: 'identity', error: 'SUPABASE_TARGET_IDENTITY_VERIFICATION_FAILED' });
    }
  }

  const projectRef = target?.projectRef || process.env.SUPABASE_PROJECT_REF || null;
  const targetUrl = target?.projectUrl || url || null;

  async function getAdvisors(kind) {
    if (reportOnly) return { kind, skipped: true, lints: [] };
    if (!supabaseIdentity?.providerVerified) {
      return { kind, skipped: true, lints: [], error: 'Supabase target identity not verified.' };
    }
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/advisors/${kind}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`SUPABASE_ADVISOR_${kind.toUpperCase()}_HTTP_${response.status}`);

    let parsed;
    try {
      parsed = await response.json();
    } catch {
      throw new Error(`SUPABASE_ADVISOR_${kind.toUpperCase()}_JSON_INVALID`);
    }
    if (!parsed || !Array.isArray(parsed.lints)) {
      throw new Error(`SUPABASE_ADVISOR_${kind.toUpperCase()}_SHAPE_INVALID`);
    }
    return { kind, skipped: false, lints: parsed.lints };
  }

  async function ingest(kind, lint) {
    const metadata = {
      advisor_kind: kind,
      advisor_name: lint.name || null,
      advisor_level: lint.level || null,
      categories: lint.categories || [],
      remediation: lint.remediation || null,
      detail: lint.detail || null,
      advisor_metadata: lint.metadata || {},
      cache_key: lint.cache_key || null,
      project_ref: projectRef,
      supabase_target: supabaseIdentity?.identity?.target || null,
      supabase_identity_fingerprint: supabaseIdentity?.fingerprint || null,
      commit_sha: process.env.GITHUB_SHA || null,
      run_id: process.env.GITHUB_RUN_ID || null,
    };

    const inserted = await post(targetUrl, '/rest/v1/audit_events', {
      user_id: null,
      event_type: `supabase_advisor_${kind}`,
      screen: lint.metadata?.entity || lint.metadata?.name || null,
      severity: severity(lint.level),
      message: lint.title || lint.description || lint.name || 'Supabase advisor finding',
      metadata,
      resolved: false,
    });
    const eventId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;
    if (!eventId) throw new Error('SUPABASE_ADVISOR_EVENT_ID_MISSING');

    return post(targetUrl, '/rest/v1/rpc/upsert_control_room_issue', {
      p_fingerprint: fingerprint(projectRef, kind, lint),
      p_source: 'supabase_advisor',
      p_category: kind === 'security' ? 'safety' : 'infra',
      p_severity: severity(lint.level),
      p_status: 'open',
      p_title: lint.title || lint.name || `Supabase ${kind} advisor finding`,
      p_summary: lint.description || lint.detail || 'Supabase advisor reported a finding.',
      p_suggested_fix: lint.remediation || 'Review the advisor detail and apply the recommended change.',
      p_affected_surface: lint.metadata?.entity || lint.metadata?.name || null,
      p_affected_user_id: null,
      p_event_id: eventId,
      p_metadata: metadata,
    });
  }

  if (!errors.length || reportOnly) {
    for (const kind of ['security', 'performance']) {
      try { results.push(await getAdvisors(kind)); }
      catch { errors.push({ kind, error: `SUPABASE_ADVISOR_${kind.toUpperCase()}_REQUEST_FAILED` }); }
    }
  }

  const ingestionEnabled = !reportOnly
    && Boolean(targetUrl && serviceKey && supabaseIdentity?.providerVerified);
  let ingestedCount = 0;
  if (ingestionEnabled) {
    for (const result of results) {
      for (const lint of result.lints) {
        try { await ingest(result.kind, lint); ingestedCount += 1; }
        catch {
          errors.push({
            kind: result.kind,
            fingerprint: fingerprint(projectRef, result.kind, lint),
            error: 'SUPABASE_ADVISOR_INGEST_FAILED',
          });
        }
      }
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    report_only: reportOnly,
    ingestion_enabled: ingestionEnabled,
    supabase_identity: supabaseIdentity,
    finding_count: results.reduce((sum, result) => sum + result.lints.length, 0),
    ingested_count: ingestedCount,
    advisor_results: results,
    errors,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  const targetName = supabaseIdentity?.identity?.target ?? target?.name ?? 'unknown';
  const identityFingerprint = supabaseIdentity?.fingerprint ?? 'unverified';
  console.log(
    `SUPABASE_ADVISOR_REPORT target=${targetName} fingerprint=${identityFingerprint} findings=${report.finding_count} ingested=${ingestedCount} errors=${errors.length}`,
  );
  if (errors.length) process.exitCode = 1;
}

main().catch(() => {
  console.error('SUPABASE_ADVISOR_REPORT_FAILED');
  process.exitCode = 1;
});

import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.env.CLOUDFLARE_WORKER_LOG_PATH;
const reportOnly = process.env.CONTROL_ROOM_REPORT_ONLY === 'true';
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const reportPath = path.join(process.cwd(), 'artifacts', 'control-room', 'worker-logs-report.json');

const allowed = new Set([
  'source', 'schema_version', 'timestamp', 'fingerprint', 'route', 'method',
  'status', 'duration_ms', 'provider', 'operation', 'character_id',
  'error_name', 'request_id', 'model', 'fallback_used', 'retry_count',
  'voice_source',
  // L99 assurance-gateway fields (see worker/telemetry.ts WorkerTelemetryEvent)
  'trace_id', 'input_tokens', 'output_tokens', 'total_tokens',
  'estimated_cost_usd', 'prompt_version', 'policy_version', 'schema_valid',
  'decision', 'violation_codes',
]);

function sanitize(event) {
  const clean = {};
  for (const [key, value] of Object.entries(event || {})) {
    if (allowed.has(key)) clean[key] = value;
  }
  return clean;
}

function severity(status) {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warning';
  return 'info';
}

async function post(pathname, body) {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}${pathname}`, {
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
  if (!response.ok) throw new Error(`${response.status} ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

async function ingest(event) {
  const metadata = sanitize(event);
  const inserted = await post('/rest/v1/audit_events', {
    user_id: null,
    event_type: event.fingerprint,
    screen: event.route || null,
    severity: severity(Number(event.status) || 0),
    message: `${event.fingerprint} on ${event.route || 'unknown route'}`,
    metadata,
    resolved: false,
  });
  const eventId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;
  if (!eventId) throw new Error('Worker audit event insert returned no id.');

  await post('/rest/v1/rpc/upsert_control_room_issue', {
    p_fingerprint: String(event.fingerprint),
    p_source: 'cloudflare_worker',
    p_category: event.operation === 'tts' || event.operation === 'stt' ? 'voice' : 'infra',
    p_severity: severity(Number(event.status) || 0),
    p_status: 'open',
    p_title: String(event.fingerprint).replaceAll('_', ' '),
    p_summary: `Cloudflare Worker reported ${event.fingerprint} on ${event.route || 'an unknown route'}.`,
    p_suggested_fix: 'Review the structured Worker event, provider status, route, and recent deployment changes.',
    p_affected_surface: event.route || null,
    p_affected_user_id: null,
    p_event_id: eventId,
    p_metadata: metadata,
  });
}

const lines = inputPath && fs.existsSync(inputPath)
  ? fs.readFileSync(inputPath, 'utf8').split(/\r?\n/).filter(Boolean)
  : [];
const events = [];
const errors = [];

for (const line of lines) {
  try {
    const parsed = JSON.parse(line);
    if (parsed?.source === 'cloudflare_worker' && parsed?.fingerprint) events.push(sanitize(parsed));
  } catch (error) {
    errors.push({ error: error instanceof Error ? error.message : String(error) });
  }
}

const ingestionEnabled = !reportOnly && Boolean(supabaseUrl && serviceKey);
let ingestedCount = 0;
if (ingestionEnabled) {
  for (const event of events) {
    try { await ingest(event); ingestedCount += 1; }
    catch (error) { errors.push({ fingerprint: event.fingerprint, error: error instanceof Error ? error.message : String(error) }); }
  }
}

const report = {
  generated_at: new Date().toISOString(),
  input_path: inputPath || null,
  report_only: reportOnly,
  ingestion_enabled: ingestionEnabled,
  event_count: events.length,
  ingested_count: ingestedCount,
  events,
  errors,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;

/**
 * L99 Goal 1 test pack: closes the gap where Cloudflare Worker telemetry and
 * the Supabase Control Room were two disconnected systems joined only by a
 * manual log-file ingest script. Verifies the new direct-persist path exists,
 * is wired via ctx.waitUntil (never blocking the response), fails silently
 * when unconfigured, and that its field names actually match what
 * src/services/controlRoomAnalytics.ts already reads.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const reply = read('worker/sekret-reply.ts');
const telemetry = read('worker/telemetry.ts');
const persist = read('worker/audit/persist-event.ts');
const observed = read('worker/observed-index.ts');
const analytics = read('src/services/controlRoomAnalytics.ts');
const ingestScript = read('scripts/control-room-ingest-worker-logs.mjs');

const NEW_FIELDS = [
  'trace_id', 'input_tokens', 'output_tokens', 'total_tokens',
  'estimated_cost_usd', 'prompt_version', 'policy_version',
  'schema_valid', 'decision', 'violation_codes',
];

// ─── WorkerTelemetryEvent carries every new L99 field ──────────────────────
test('WorkerTelemetryEvent interface declares all new L99 audit fields', () => {
  const ifaceStart = telemetry.indexOf('interface WorkerTelemetryEvent');
  const ifaceEnd = telemetry.indexOf('\n}', ifaceStart);
  const iface = telemetry.slice(ifaceStart, ifaceEnd);
  for (const field of NEW_FIELDS) {
    assert.match(iface, new RegExp(`\\b${field}\\??:`), `WorkerTelemetryEvent must declare ${field}`);
  }
});

// ─── sekret-reply.ts's success response carries the audit contract ────────
test('handleReply success response reports model, usage, decision, and versioning', () => {
  const handleReplyStart = reply.indexOf('async function handleReply');
  const handleVoiceStart = reply.indexOf('async function handleVoice');
  const body = reply.slice(handleReplyStart, handleVoiceStart);
  for (const field of ['model:', 'usage:', 'decision,', 'violationCodes,', 'schemaValid:', 'promptVersion:', 'policyVersion:', 'traceId,', 'audit:']) {
    assert.ok(body.includes(field), `handleReply response should include "${field}"`);
  }
});

// ─── persist-event.ts: never blocks, never throws, fails closed ───────────
test('persistAuditEvent no-ops silently when Supabase env vars are unset', () => {
  assert.match(persist, /if \(!baseUrl \|\| !serviceKey\) return;/);
});

test('persistAuditEvent never lets a Supabase failure escape', () => {
  const fnStart = persist.indexOf('export async function persistAuditEvent');
  const fnBody = persist.slice(fnStart);
  assert.match(fnBody, /catch \(error\) \{/, 'persistAuditEvent must catch its own errors');
  assert.doesNotMatch(fnBody, /\bthrow error\b/, 'persistAuditEvent must not rethrow into the caller');
});

test('persist-event metadata field names match what controlRoomAnalytics.ts reads', () => {
  const metaFieldsExpectedByDashboard = [
    'estimated_cost_usd', 'total_tokens', 'input_tokens', 'output_tokens',
    'provider', 'character_id',
  ];
  for (const field of metaFieldsExpectedByDashboard) {
    assert.match(persist, new RegExp(`\\b${field}:`), `persist-event.ts metadata must set ${field}`);
    assert.match(analytics, new RegExp(`metadata\\??\\.${field}\\b`), `controlRoomAnalytics.ts must read metadata.${field}`);
  }
});

// ─── observed-index.ts wires persistence via ctx.waitUntil, never blocking ─
test('observed-index.ts persists via ctx.waitUntil on both the success and error paths', () => {
  const waitUntilCalls = observed.match(/ctx\.waitUntil\(persistAuditEvent\(/g) || [];
  assert.ok(waitUntilCalls.length >= 2, 'expected persistAuditEvent to be waitUntil-wrapped on both success and catch paths');
});

test('observed-index.ts generates a trace id even when the response omits one', () => {
  assert.match(observed, /crypto\.randomUUID\(\)/);
  assert.match(observed, /metadata\.traceId \|\| traceIdFallback/);
});

// ─── The batch/backfill ingest script tracks the same new field set ───────
test('control-room-ingest-worker-logs.mjs allowlist includes every new L99 field', () => {
  const allowedBlockStart = ingestScript.indexOf('const allowed = new Set([');
  const allowedBlockEnd = ingestScript.indexOf(']);', allowedBlockStart);
  const allowedBlock = ingestScript.slice(allowedBlockStart, allowedBlockEnd);
  for (const field of NEW_FIELDS) {
    assert.match(allowedBlock, new RegExp(`'${field}'`), `ingest script allowlist must include '${field}'`);
  }
});

// ─── PROMPT_VERSION / POLICY_VERSION are centrally defined, not inlined ────
test('sekret-reply.ts sources prompt/policy versions from worker/config/policy.ts rather than inlining them', () => {
  assert.match(reply, /import\s*\{\s*PROMPT_VERSION,\s*POLICY_VERSION\s*\}\s*from\s*['"]\.\/config\/policy['"]/);
  const policy = read('worker/config/policy.ts');
  assert.match(policy, /export const PROMPT_VERSION\s*=/);
  assert.match(policy, /export const POLICY_VERSION\s*=/);
});

test('estimateCostUsd is centrally defined in config/pricing.ts and used in sekret-reply.ts', () => {
  assert.match(reply, /import\s*\{\s*estimateCostUsd\s*\}\s*from\s*['"]\.\/config\/pricing['"]/);
  const pricing = read('worker/config/pricing.ts');
  assert.match(pricing, /export function estimateCostUsd/);
});

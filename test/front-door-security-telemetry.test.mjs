import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const voiceEntry = fs.readFileSync(new URL('../worker/voice-entry.ts', import.meta.url), 'utf8');

test('front-door auth and rate-limit denials preserve structured audit telemetry', () => {
  assert.match(voiceEntry, /emitWorkerTelemetry, type WorkerTelemetryEvent/,
    'front door must emit the same structured Worker telemetry shape');
  assert.match(voiceEntry, /persistAuditEvent, type AuditPersistEnv/,
    'front door must persist denial events to the audit plane');
  assert.match(voiceEntry, /ctx\.waitUntil\(persistAuditEvent\(event, env as AuditPersistEnv\)\)/,
    'audit persistence must remain non-blocking');

  const protectedAt = voiceEntry.indexOf("const isProtectedApiPost = request.method === 'POST' && path.includes('/api/');");
  const authAt = voiceEntry.indexOf('const auth = await authenticate(request, env);', protectedAt);
  const authTelemetryAt = voiceEntry.indexOf("'worker_auth_failure'", authAt);
  const limiterAt = voiceEntry.indexOf('const limited = await enforceRateLimit(request, env, auth.principal, cors);', authAt);
  const limiterTelemetryAt = voiceEntry.indexOf("'worker_rate_limit'", limiterAt);
  const delegateAt = voiceEntry.indexOf('const response = await observedWorker.fetch(request, downstreamEnv as never, ctx);', limiterAt);

  assert.ok(protectedAt > 0, 'protected POST API boundary must exist');
  assert.ok(authAt > protectedAt, 'authentication must run inside the protected boundary');
  assert.ok(authTelemetryAt > authAt && authTelemetryAt < limiterAt,
    'authentication denials must be observed before returning');
  assert.ok(limiterTelemetryAt > limiterAt && limiterTelemetryAt < delegateAt,
    'rate-limit denials and limiter outages must be observed before returning');
});

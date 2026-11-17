import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchExpiredPendingRequests, logHttpStatusClass } from '../scripts/sweep-account-deletions.mjs';

// Captures console.error lines while run() executes, then restores the original console.error.
async function captureStderr(run) {
  const lines = [];
  const original = console.error;
  console.error = (...args) => lines.push(args.join(' '));
  try {
    const outcome = await run().then((value) => ({ value }), (error) => ({ error }));
    return { lines, ...outcome };
  } finally {
    console.error = original;
  }
}

test('each HTTP status maps to exactly one fixed event code', async () => {
  const expected = [
    [400, 'SAUCE_GUARD_DELETE_HTTP_400'],
    [401, 'SAUCE_GUARD_DELETE_HTTP_401'],
    [403, 'SAUCE_GUARD_DELETE_HTTP_403'],
    [404, 'SAUCE_GUARD_DELETE_HTTP_404'],
    [406, 'SAUCE_GUARD_DELETE_HTTP_406'],
    [409, 'SAUCE_GUARD_DELETE_HTTP_409'],
    [500, 'SAUCE_GUARD_DELETE_HTTP_500'],
    [502, 'SAUCE_GUARD_DELETE_HTTP_OTHER'],
  ];
  for (const [status, event] of expected) {
    const { lines } = await captureStderr(async () => logHttpStatusClass(status));
    assert.deepEqual(lines, [event]);
  }
});

test('pre-claim list rejection logs only the HTTP class, never the PostgREST body', async () => {
  const { lines, error } = await captureStderr(() => fetchExpiredPendingRequests({
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ code: 'PGRST301', message: 'JWT rejected for request-secret-123' }),
    }),
  }));
  assert.match(error.message, /^list_failed:http=401:code=PGRST301/);
  assert.deepEqual(lines, ['SAUCE_GUARD_DELETE_HTTP_401']);
  assert.doesNotMatch(lines.join('\n'), /JWT|request-secret-123|PGRST301/);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const logger = fs.readFileSync('src/services/logEvent.ts', 'utf8');
const teenLayout = fs.readFileSync('app/(teen)/_layout.tsx', 'utf8');

test('retention event logger returns bounded write truth instead of swallowing failures', () => {
  assert.match(logger, /Promise<LogEventResult>/);
  assert.match(logger, /error: authError/);
  assert.match(logger, /error: insertError/);
  assert.match(logger, /reason: 'auth_lookup_failed'/);
  assert.match(logger, /reason: 'insert_failed'/);
  assert.match(logger, /reason: 'unexpected_error'/);
  assert.doesNotMatch(logger, /Promise<void>/);
});

test('teen session retention marks success only after the event write succeeds', () => {
  assert.match(teenLayout, /const result = await logEvent\('session_start'\)/);
  assert.match(teenLayout, /if \(result\.ok \|\| cancelled\) return;/);
  assert.match(teenLayout, /sessionLogged\.current = false;/);
  assert.match(teenLayout, /result\.retryable && attempt < 1/);
  assert.match(teenLayout, /clearTimeout\(retryTimer\)/);
});

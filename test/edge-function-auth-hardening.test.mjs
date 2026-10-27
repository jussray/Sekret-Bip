import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// SPRINT.md "Next execution order" item 3: negative-auth tests for the two
// custom-auth Edge Functions (account-delete, safety-scan). Both are deployed
// with --no-verify-jwt (no user session available — callers are a trusted
// admin job / a Postgres trigger), so authorization is entirely the shared
// secret header comparison. These are static source-assertion tests, matching
// the pattern in test/retired-edge-functions.test.mjs and
// test/worker-safety.test.mjs — no live Supabase or Deno runtime required.

test('account-delete rejects before touching any protected operation without the shared secret', async () => {
  const source = await read('supabase/functions/account-delete/index.ts');

  // Guard reads the secret from env, not a hardcoded value, and rejects on
  // missing/empty PROCESS_SECRET too (an unset secret must not fail open).
  assert.match(source, /const PROCESS_SECRET = Deno\.env\.get\('ACCOUNT_DELETION_PROCESS_SECRET'\)/);
  assert.match(source, /if \(!PROCESS_SECRET \|\| suppliedSecret !== PROCESS_SECRET\)/);
  assert.match(source, /return json\(\{ error: 'unauthorized' \}, 401\)/);

  // The unauthorized check must appear before any database/storage/auth-admin
  // operation *within the request-handling closure* — helper functions
  // defined earlier in the file (e.g. markFailed, removePrivateFiles) also
  // reference these operations by name, but they're only reachable from
  // inside Deno.serve's callback, after the guard already ran. Scope the
  // ordering check to that closure so hoisted helper definitions don't
  // produce a false "op precedes guard" match.
  const handlerIdx = source.indexOf('Deno.serve(async (req: Request) => {');
  assert.ok(handlerIdx !== -1, 'expected the Deno.serve request handler');
  const handler = source.slice(handlerIdx);

  const guardIdx = handler.indexOf("if (!PROCESS_SECRET || suppliedSecret !== PROCESS_SECRET)");
  const protectedOps = [
    "from('account_deletion_requests')",
    'removePrivateFiles(admin',
    'admin.auth.admin.deleteUser',
  ];
  assert.ok(guardIdx !== -1, 'expected the secret-comparison guard inside the handler');
  for (const op of protectedOps) {
    const opIdx = handler.indexOf(op);
    assert.ok(opIdx !== -1, `expected to find ${op} in the handler`);
    assert.ok(guardIdx < opIdx, `auth guard must precede ${op}`);
  }

  // No user JWT is ever treated as authorization for this function — it is a
  // service-role, shared-secret-only processor per its own header comment.
  assert.match(source, /Deploy with JWT verification disabled/);
  assert.doesNotMatch(source, /supabase\.auth\.getUser\(|req\.headers\.get\('authorization'\)/i);

  // requestId is validated as a UUID before use — a caller cannot pass an
  // arbitrary string into the account_deletion_requests lookup.
  assert.match(source, /if \(!isUuid\(requestId\)\)/);
});

test('safety-scan rejects before touching content without the shared secret', async () => {
  const source = await read('supabase/functions/safety-scan/index.ts');

  assert.match(source, /const SCAN_SECRET  = Deno\.env\.get\('SAFETY_SCAN_SECRET'\)/);
  assert.match(source, /if \(!SCAN_SECRET \|\| incoming !== SCAN_SECRET\)/);
  assert.match(source, /return new Response\('unauthorized', \{ status: 401 \}\)/);

  const guardIdx = source.indexOf('if (!SCAN_SECRET || incoming !== SCAN_SECRET)');
  const contentUseIdx = source.indexOf('patternScan(content)');
  assert.ok(guardIdx !== -1, 'expected the secret-comparison guard in source');
  assert.ok(contentUseIdx !== -1, 'expected patternScan(content) in source');
  assert.ok(guardIdx < contentUseIdx, 'auth guard must precede any use of the scanned content');

  assert.match(source, /caller is Postgres trigger, no user JWT available/);
});

test('safety-scan never logs or stores raw content — only reduced metadata', async () => {
  const source = await read('supabase/functions/safety-scan/index.ts');

  // Every console.* call in this file must not reference the raw content
  // variable — only ids, severities, and error messages are allowed through.
  const consoleCalls = source.match(/console\.(log|error|warn)\([^)]*\)/g) ?? [];
  assert.ok(consoleCalls.length > 0, 'expected at least one console call to check');
  for (const call of consoleCalls) {
    assert.doesNotMatch(call, /\bcontent\b/, `console call must not reference content: ${call}`);
  }

  // The safety_alerts insert payload is the reduced shape only — no raw
  // content field alongside it.
  const insertMatch = source.match(/\.from\('safety_alerts'\)\s*\.insert\(\{[\s\S]*?\}\)/);
  assert.ok(insertMatch, 'expected a safety_alerts insert() call');
  assert.doesNotMatch(insertMatch[0], /\bcontent\b/, 'safety_alerts insert must not include raw content');
  assert.match(insertMatch[0], /scan_metadata/, 'safety_alerts insert must use the reduced scan_metadata shape');

  // The reduced metadata builder itself must never carry the full OpenAI
  // score array or the source text, only a single top category/score.
  assert.match(source, /Reduced metadata — never store full OpenAI score array/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// Negative-auth tests for the two custom-auth Edge Functions
// (account-delete, safety-scan). Both are deployed with verify_jwt=false because
// their callers do not carry end-user sessions. A content-free abuse-control
// limiter runs first; the original shared-secret gate still owns authorization
// for all protected account/content operations.

test('account-delete rate-limits before custom auth and protects all destructive work behind the shared secret', async () => {
  const source = await read('supabase/functions/account-delete/index.ts');

  assert.match(source, /const PROCESS_SECRET = Deno\.env\.get\('ACCOUNT_DELETION_PROCESS_SECRET'\)/);
  assert.match(source, /if \(!PROCESS_SECRET \|\| suppliedSecret !== PROCESS_SECRET\)/);
  assert.match(source, /return json\(\{ error: 'unauthorized' \}, 401\)/);

  const handlerIdx = source.indexOf('Deno.serve(async (req: Request) => {');
  assert.ok(handlerIdx !== -1, 'expected the Deno.serve request handler');
  const handler = source.slice(handlerIdx);

  const limiterIdx = handler.indexOf("enforceEdgeFunctionRateLimit(req, 'account-delete')");
  const guardIdx = handler.indexOf("if (!PROCESS_SECRET || suppliedSecret !== PROCESS_SECRET)");
  assert.ok(limiterIdx !== -1, 'expected the shared rate limiter at handler entry');
  assert.ok(guardIdx !== -1, 'expected the secret-comparison guard inside the handler');
  assert.ok(limiterIdx < guardIdx, 'abuse-control limiter must execute before the custom-auth comparison');

  const protectedOps = [
    "from('account_deletion_requests')",
    'removePrivateFiles(admin',
    'admin.auth.admin.deleteUser',
  ];
  for (const op of protectedOps) {
    const opIdx = handler.indexOf(op);
    assert.ok(opIdx !== -1, `expected to find ${op} in the handler`);
    assert.ok(guardIdx < opIdx, `custom-auth guard must precede ${op}`);
  }

  assert.match(source, /Deploy with JWT verification disabled/);
  assert.doesNotMatch(source, /supabase\.auth\.getUser\(|req\.headers\.get\('authorization'\)/i);
  assert.match(source, /if \(!isUuid\(requestId\)\)/);
});

test('safety-scan rate-limits before custom auth but never touches child content before the shared secret', async () => {
  const source = await read('supabase/functions/safety-scan/index.ts');

  assert.match(source, /const SCAN_SECRET  = Deno\.env\.get\('SAFETY_SCAN_SECRET'\)/);
  assert.match(source, /if \(!SCAN_SECRET \|\| incoming !== SCAN_SECRET\)/);
  assert.match(source, /return new Response\('unauthorized', \{ status: 401 \}\)/);

  const handlerIdx = source.indexOf('Deno.serve(async (req: Request) => {');
  assert.ok(handlerIdx !== -1, 'expected the Deno.serve request handler');
  const handler = source.slice(handlerIdx);

  const limiterIdx = handler.indexOf("enforceEdgeFunctionRateLimit(req, 'safety-scan')");
  const guardIdx = handler.indexOf('if (!SCAN_SECRET || incoming !== SCAN_SECRET)');
  const bodyReadIdx = handler.indexOf('await req.json()');
  const contentUseIdx = handler.indexOf('patternScan(content)');

  assert.ok(limiterIdx !== -1, 'expected the shared rate limiter at handler entry');
  assert.ok(guardIdx !== -1, 'expected the secret-comparison guard in handler');
  assert.ok(bodyReadIdx !== -1, 'expected request metadata parsing');
  assert.ok(contentUseIdx !== -1, 'expected patternScan(content) in handler');
  assert.ok(limiterIdx < guardIdx, 'abuse-control limiter must execute before the custom-auth comparison');
  assert.ok(guardIdx < bodyReadIdx, 'custom-auth guard must precede request metadata parsing');
  assert.ok(guardIdx < contentUseIdx, 'custom-auth guard must precede any use of scanned child content');

  assert.match(source, /caller is Postgres trigger, no user JWT available/);
});

test('safety-scan never logs or stores raw content — only reduced metadata', async () => {
  const source = await read('supabase/functions/safety-scan/index.ts');

  const consoleCalls = source.match(/console\.(log|error|warn)\([^)]*\)/g) ?? [];
  assert.ok(consoleCalls.length > 0, 'expected at least one console call to check');
  for (const call of consoleCalls) {
    assert.doesNotMatch(call, /\bcontent\b/, `console call must not reference content: ${call}`);
  }

  const insertMatch = source.match(/\.from\('safety_alerts'\)\s*\.insert\(\{[\s\S]*?\}\)/);
  assert.ok(insertMatch, 'expected a safety_alerts insert() call');
  assert.doesNotMatch(insertMatch[0], /\bcontent\b/, 'safety_alerts insert must not include raw content');
  assert.match(insertMatch[0], /scan_metadata/, 'safety_alerts insert must use the reduced scan_metadata shape');

  assert.match(source, /never store full OpenAI score array/);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = 'supabase/migrations/20260905213434_reconcile_consent_permanent_account_boundary.sql';
const readMigration = () => readFile(new URL(`../${migrationPath}`, import.meta.url), 'utf8');
const readConsentScreen = () => readFile(new URL('../app/(onboarding)/consent.tsx', import.meta.url), 'utf8');
const readRepositoryTruthGate = () => readFile(new URL('../.github/workflows/repository-truth-gate.yml', import.meta.url), 'utf8');

test('consent read policies reject anonymous-authenticated sessions', async () => {
  const sql = await readMigration();

  assert.match(sql, /create policy "Users read own consents"[\s\S]*public\.is_non_anonymous_user\(\)[\s\S]*auth\.uid\(\)\) = user_id/);
  assert.match(sql, /create policy "Users read own audit log"[\s\S]*public\.is_non_anonymous_user\(\)[\s\S]*auth\.uid\(\)\) = user_id/);
});

test('record_user_consent preserves auth error and rejects anonymous accounts before durable writes', async () => {
  const sql = await readMigration();
  const start = sql.indexOf('create or replace function public.record_user_consent');
  const body = sql.slice(start, sql.indexOf('\nrevoke all on function', start));
  const unauthenticatedGuard = body.indexOf('if v_user_id is null then');
  const unauthenticatedError = body.indexOf("raise exception 'authentication_required'");
  const permanentGate = body.indexOf('if not public.is_non_anonymous_user() then');
  const permanentError = body.indexOf("raise exception 'permanent_account_required'");
  const firstWrite = body.indexOf('insert into public.user_consents');

  assert.ok(unauthenticatedGuard >= 0, 'missing unauthenticated guard');
  assert.ok(unauthenticatedError > unauthenticatedGuard, 'missing preserved authentication_required error');
  assert.ok(permanentGate > unauthenticatedError, 'permanent-account gate must follow null-auth rejection');
  assert.ok(permanentError > permanentGate, 'missing permanent_account_required error');
  assert.ok(firstWrite > permanentError, 'all authorization guards must run before consent persistence');
});

test('server boundary mirrors onboarding redirect for anonymous auth users', async () => {
  const source = await readConsentScreen();

  assert.match(source, /!data\.user \|\| data\.user\.is_anonymous/);
  assert.match(source, /router\.replace\(`\/\(auth\)\/signup\?side=\$\{side\}`/);
});

test('consent RPC remains client-callable only behind in-function authorization', async () => {
  const sql = await readMigration();

  assert.match(sql, /revoke all on function public\.record_user_consent\(text,boolean,text\) from public, anon/);
  assert.match(sql, /grant execute on function public\.record_user_consent\(text,boolean,text\) to authenticated/);
});

test('repository truth keeps the current consent boundary contract in its exact-head gate', async () => {
  const workflow = await readRepositoryTruthGate();

  assert.match(workflow, /test\/consent-permanent-account-boundary\.test\.mjs/);
});

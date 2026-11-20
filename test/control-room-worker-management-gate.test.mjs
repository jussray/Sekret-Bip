import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute the actual pure helper without booting React Native or Supabase.
const helper = readFileSync(new URL('../src/features/control-room/workerManagementAccess.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(helper, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
runInNewContext(compiled, { exports });
const { isWorkerManagementProfile } = exports;

const profile = (role, can_view_audits, can_manage_app) => ({
  user_id: 'fixture-not-a-user',
  role,
  can_view_audits,
  can_manage_app,
  exclude_from_analytics: true,
});

test('live Worker management needs founder/admin role AND both capabilities', () => {
  assert.equal(isWorkerManagementProfile(profile('founder', true, true)), true);
  assert.equal(isWorkerManagementProfile(profile('admin', true, true)), true);
  assert.equal(isWorkerManagementProfile(profile('developer', true, true)), false);
  assert.equal(isWorkerManagementProfile(profile('developer', true, false)), false);
  assert.equal(isWorkerManagementProfile(profile('admin', true, false)), false);
  assert.equal(isWorkerManagementProfile(profile('admin', false, true)), false);
  assert.equal(isWorkerManagementProfile(profile('founder', false, true)), false);
  assert.equal(isWorkerManagementProfile(null), false);
});

test('WorkerPanel uses the management guard, not audit-read visibility alone', () => {
  const source = readFileSync(new URL('../src/features/control-room/WorkerPanel.tsx', import.meta.url), 'utf8');
  assert.match(source, /setAuthorized\(isWorkerManagementProfile\(profile\)\)/);
  assert.doesNotMatch(source, /setAuthorized\(isFounderProfile\(profile\)\)/);
  assert.match(source, /\.catch\(\(\) => \{[\s\S]*?setAuthorized\(false\)/);
  assert.match(source, /if \(!authorized\) \{/);
  assert.match(source, /\{sub === 'fire' && <FirePanel \/>\}/);
});

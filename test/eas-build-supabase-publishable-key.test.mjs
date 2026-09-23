import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'eas-build.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

test('EAS build resolves the canonical Supabase publishable key with a legacy fallback', () => {
  assert.match(
    workflow,
    /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:\s*\$\{\{\s*secrets\.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY\s*\|\|\s*secrets\.EXPO_PUBLIC_SUPABASE_ANON_KEY\s*\}\}/,
  );
});

test('EAS receives the canonical publishable-key variable name', () => {
  assert.match(workflow, /--name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(workflow, /--name EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  assert.match(workflow, /--value "\$EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"/);
});

test('EAS builds are bound to an exact verified commit SHA', () => {
  assert.match(workflow, /target_sha:/);
  assert.match(workflow, /EXPECTED_HEAD_SHA:\s*\$\{\{\s*inputs\.target_sha\s*\}\}/);
  assert.match(workflow, /ref:\s*\$\{\{\s*env\.EXPECTED_HEAD_SHA\s*\}\}/);
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /git rev-parse HEAD/);
  assert.match(workflow, /test "\$actual" = "\$EXPECTED_HEAD_SHA"/);
  assert.match(workflow, /\^\[0-9a-f\]\{40\}\$/);
});

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

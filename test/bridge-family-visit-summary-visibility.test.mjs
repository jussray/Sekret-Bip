import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const optimization = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260925200300_optimize_bridge_family_visit_policies.sql'),
  'utf8',
);
const screen = fs.readFileSync(
  path.join(root, 'src/features/bridge/BridgeFamilyVisitScreen.tsx'),
  'utf8',
);

test('audience summaries remain unreadable until the session is ready', () => {
  const policyStart = optimization.indexOf('create policy bridge_family_visit_summaries_audience_select');
  assert.notEqual(policyStart, -1);
  const policy = optimization.slice(policyStart);
  assert.match(policy, /s\.state = 'ready'/i);
});

test('Family Visit UI renders audience summaries only for ready sessions', () => {
  assert.match(screen, /session\?\.state === 'ready' && role/);
});

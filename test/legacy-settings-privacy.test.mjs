import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const legacySettings = readFileSync(new URL('../app/(main)/settings.tsx', import.meta.url), 'utf8');

test('legacy settings reuses the canonical account-deletion controls', () => {
  assert.match(legacySettings, /<AccountDeletionControls \/>/);
  assert.match(legacySettings, /from '@\/components\/settings\/AccountDeletionControls'/);
  assert.doesNotMatch(legacySettings, /AsyncStorage\.clear\(|request_account_deletion|handleDeleteData/);
});

test('legacy export never reports success on unavailable or rejected Supabase', () => {
  assert.match(legacySettings, /if \(!sb\) throw new Error\(/);
  assert.match(legacySettings, /const \{ error \} = await sb\.rpc\('request_data_export'\)/);
  assert.match(legacySettings, /if \(error\) throw error/);
  assert.match(legacySettings, /catch\s*\{[\s\S]*?return false;[\s\S]*?\}\s*finally/);
  assert.doesNotMatch(legacySettings, /within 48 hours/);
});

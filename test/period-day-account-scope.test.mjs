/**
 * Regression guard for live public.period_days schema:
 * PK (user_id, date). This is a source contract; production RLS requires
 * a separate two-account proof and must never be inferred from this test.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sync = fs.readFileSync(new URL('../src/utils/sync.ts', import.meta.url), 'utf8');

function section(start, end) {
  const a = sync.indexOf(start);
  const b = sync.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `Missing sync section: ${start}`);
  return sync.slice(a, b);
}

test('period writes use live user_id + date composite key', () => {
  const write = section('export async function syncPeriodDay', 'export async function deletePeriodDay');
  assert.match(write, /const uid = await currentUserId\(\)/);
  assert.match(write, /if \(!uid\) return/);
  assert.match(write, /user_id:\s*uid,\s*date:\s*day,\s*note:/);
  assert.match(write, /onConflict:\s*'user_id,date'/);
  assert.doesNotMatch(write, /onConflict:\s*'user_id,day'/);
});

test('period deletion filters both owner and live date column', () => {
  const remove = section('export async function deletePeriodDay', 'export async function loadPeriodDays');
  assert.match(remove, /const uid = await currentUserId\(\)/);
  assert.match(remove, /if \(!uid\) return/);
  assert.match(remove, /match\(\{\s*user_id:\s*uid,\s*date:\s*day\s*\}\)/);
});

test('period reads only return the current owner\'s date values', () => {
  const read = section('export async function loadPeriodDays', '// ── Oracle / companion memory');
  assert.match(read, /const uid = await currentUserId\(\)/);
  assert.match(read, /if \(!uid\) return \[\]/);
  assert.match(read, /select\('date'\)/);
  assert.match(read, /eq\('user_id', uid\)/);
  assert.match(read, /order\('date'/);
  assert.match(read, /\{ date: string \}/);
  assert.match(read, /r\.date/);
});

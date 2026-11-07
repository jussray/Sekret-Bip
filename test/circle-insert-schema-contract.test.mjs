/**
 * Database shape guard for writeCirclePost. These assertions must match
 * the observed 2026-11-07 live Supabase columns; RLS remains separately gated.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/utils/sync.ts', import.meta.url), 'utf8');
const start = source.indexOf('export async function writeCirclePost');
const end = source.indexOf('// ── Voice', start);
assert.ok(start !== -1 && end > start);
const postWrite = source.slice(start, end);

test('shared Circle posts exclude parent-only columns', () => {
  assert.match(postWrite, /const sharedPostPayload\s*=/);
  const section = postWrite.slice(
    postWrite.indexOf('const sharedPostPayload'),
    postWrite.indexOf('const parentPostPayload'),
  );
  assert.match(section, /post_mood:\s*opts\.postMood/);
  assert.match(section, /media_kind:\s*opts\.mediaKind/);
  assert.doesNotMatch(section, /circle_tag:/);
  assert.doesNotMatch(section, /\bdate:/);
  assert.doesNotMatch(section, /\btime:/);
});

test('parent Circle posts include required id/date/time and no shared-only columns', () => {
  assert.match(postWrite, /const parentPostPayload\s*=/);
  const section = postWrite.slice(
    postWrite.indexOf('const parentPostPayload'),
    postWrite.indexOf('const payload ='),
  );
  assert.match(section, /id:\s*now\.getTime\(\)/);
  assert.match(section, /date:\s*now\.toLocaleDateString\(\)/);
  assert.match(section, /time:\s*now\.toLocaleTimeString\(/);
  assert.match(section, /circle_tag:\s*opts\.circleTag/);
  assert.doesNotMatch(section, /post_mood:/);
  assert.doesNotMatch(section, /media_kind:/);
});

test('both Circle paths always attach current authenticated user id', () => {
  assert.match(postWrite, /const uid = await currentUserId\(\)/);
  assert.match(postWrite, /if \(!uid\) return/);
  assert.match(postWrite, /user_id:\s*uid/);
  assert.match(postWrite, /tab === 'parent' \? parentPostPayload : sharedPostPayload/);
});

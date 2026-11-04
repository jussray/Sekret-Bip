import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('funnel reporting declares current-state rather than event-log truth', async () => {
  const sql = await read('.control-room/funnel-queries.sql');

  assert.match(sql, /stores one CURRENT stage per user/);
  assert.match(sql, /not an event log/);
  assert.match(sql, /cannot prove that every\s+-- intermediate event occurred/);
});

test('teen and parent retention use cumulative rank estimates', async () => {
  const sql = await read('.control-room/funnel-queries.sql');

  assert.equal((sql.match(/left join population p on true/g) ?? []).length, 2);
  assert.equal((sql.match(/p\.current_rank >= req\.required_rank/g) ?? []).length, 2);
  assert.doesNotMatch(sql, /select stage, count\(\*\) as n[\s\S]*group by stage/);
  assert.match(sql, /where s\.role = 'teen'/);
  assert.match(sql, /where s\.role = 'parent'/);
});

test('parent link rate is fail-closed when history is unavailable', async () => {
  const sql = await read('.control-room/funnel-queries.sql');

  assert.match(sql, /unavailable_from_current_stage_snapshot/);
  assert.match(sql, /cannot be reconstructed from this table/);
  assert.match(sql, /null::numeric as parent_link_rate_pct/);
});

test('default stuck cohort output is aggregate and identifier-free', async () => {
  const sql = await read('.control-room/funnel-queries.sql');
  const stuckSection = sql.match(/-- ── 9\.[\s\S]*?-- ── 10\./)?.[0] ?? '';

  assert.match(stuckSection, /PRIVACY-MINIMIZED STUCK-COHORT SUMMARY/);
  assert.doesNotMatch(stuckSection, /\buser_id\b/);
  assert.match(stuckSection, /count\(\*\) as users/);
  assert.match(stuckSection, /time_stuck_bucket/);
});

test('legacy activation timing is not mislabeled as identity timing', async () => {
  const sql = await read('.control-room/funnel-queries.sql');

  assert.match(sql, /signup → activated \(legacy column name\)/);
  assert.match(sql, /avg_signup_to_activation_mins/);
  assert.doesNotMatch(sql, /'identity → activated'/);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const generator = read('src/features/intentions/dailyIntentions.ts');
const repository = read('src/features/intentions/dailyIntentionsRepository.ts');
const component = read('components/intentions/DailyIntentionsCard.tsx');
const roomRoute = read('app/(teen)/room.tsx');
const migration = read('supabase/migrations/20260715202149_create_private_daily_intentions.sql');
const privacyContract = read('docs/DAILY_INTENTIONS_PRIVACY_CONTRACT.md');

test('daily intentions are generated locally without an AI or backend call', () => {
  assert.match(generator, /export function buildDailyIntentions/);
  assert.match(generator, /signals\.personalizationEnabled/);
  assert.match(generator, /recentUserTexts \?\? \[\]\)\.slice\(0, 3\)/);
  assert.doesNotMatch(generator, /fetch\s*\(/);
  assert.doesNotMatch(generator, /sendCompanionMessage|fetchSekretBrainReply|OpenAI|Anthropic/i);
  assert.doesNotMatch(component, /fetch\s*\(|sendCompanionMessage|fetchSekretBrainReply/);
});

test('raw private content cannot enter the daily intentions table payload', () => {
  const forbiddenColumns = [
    'journal_text',
    'chat_text',
    'excerpt',
    'quote',
    'transcript',
    'companion_reply',
    'parent_summary',
    'email',
    'first_name',
    'bip_id',
  ];

  for (const column of forbiddenColumns) {
    assert.doesNotMatch(migration, new RegExp(`\\b${column}\\b`, 'i'));
    assert.doesNotMatch(repository, new RegExp(`${column}:`, 'i'));
  }

  assert.match(migration, /final intention labels and coarse source tags only/i);
  assert.match(repository, /label: item\.label\.slice\(0, 120\)/);
});

test('database access is permanent-account owner only', () => {
  const policySql = migration.slice(migration.indexOf('create policy'));

  assert.match(migration, /alter table public\.daily_intentions enable row level security/i);
  assert.match(migration, /revoke all on table public\.daily_intentions from anon/i);
  assert.match(policySql, /to authenticated/i);
  assert.match(policySql, /\(select auth\.uid\(\)\) = user_id/i);
  assert.match(policySql, /is_anonymous/i);
  assert.doesNotMatch(policySql, /\b(parent|guardian|linked_parent)\b/i);

  assert.match(repository, /if \(!user \|\| user\.is_anonymous\) return null/);
  assert.match(repository, /\.eq\('user_id', account\.userId\)/);
  assert.match(repository, /CACHE_PREFIX.*owner.*date/s);
});

test('the feature lives in the User Room and preserves explicit controls', () => {
  assert.match(roomRoute, /<DailyIntentionsCard/);
  assert.match(roomRoute, /entries=\{entries\}/);
  assert.match(roomRoute, /comfortSessions=\{comfortSessions\}/);
  assert.match(roomRoute, /voiceNotes=\{voiceNotes\}/);

  assert.match(component, /type IntentionMode = 'basic' \| 'personalized' \| 'off'/);
  assert.match(component, /Helpful, not watching you\./);
  assert.match(component, /No quotes saved/);
  assert.match(component, /Never shown to parents/);
  assert.match(component, /Turn daily intentions off/);
  assert.match(component, /clearDailyIntentions/);
});

test('the written contract forbids surveillance-style regeneration and copy', () => {
  assert.match(privacyContract, /not silently regenerated after every conversation/i);
  assert.match(privacyContract, /never copy or summarize the teen's wording/i);
  assert.match(privacyContract, /Parent and guardian relationships provide no read path/i);
  assert.match(privacyContract, /account-switch leakage/i);
});

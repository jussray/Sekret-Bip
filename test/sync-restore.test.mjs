/**
 * Sync mapping and restore behavior: storage keys, JSON serialization,
 * cloud sync contracts, column mapping, activity summary, and isolation
 * between teen and parent data.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const storageSrc  = fs.readFileSync(new URL('../src/utils/storage.ts',   import.meta.url), 'utf8');
const syncSrc     = fs.readFileSync(new URL('../src/utils/sync.ts',      import.meta.url), 'utf8');
const supabaseSrc = fs.readFileSync(new URL('../src/utils/supabase.ts',  import.meta.url), 'utf8');

// ─── Extract STORAGE_KEYS and JSON_KEYS from source ──────────────────────────
// Parse the STORAGE_KEYS object literal to get the canonical key list.
const storageKeysBlock = storageSrc.match(/const STORAGE_KEYS = \{([\s\S]*?)\};/)?.[1] ?? '';
const storageKeyValues = [...storageKeysBlock.matchAll(/\w+:\s*'(\w+)'/g)].map(m => m[1]);

const jsonKeysBlock = storageSrc.match(/const JSON_KEYS = new Set\(\[([\s\S]*?)\]\)/)?.[1] ?? '';
const jsonKeyValues = [...jsonKeysBlock.matchAll(/'(\w+)'/g)].map(m => m[1]);

// ─── Extract TABLES constant from supabase.ts ─────────────────────────────────
const tablesBlock = supabaseSrc.match(/export const TABLES = \{([\s\S]*?)\} as const/)?.[1] ?? '';
const tableEntries = Object.fromEntries(
  [...tablesBlock.matchAll(/(\w+):\s*'([\w_]+)'/g)].map(m => [m[1], m[2]]),
);

// ─── Reconstruct deriveTier for behavioral tests ─────────────────────────────
const deriveTierMatch = syncSrc.match(/function deriveTier\(sessionCount: number\): string \{([\s\S]*?)\n\}/);
assert.ok(deriveTierMatch, 'deriveTier must be defined in sync.ts');
const deriveTier = new Function('sessionCount', deriveTierMatch[1].replace(/: number/g, ''));  

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════════

test('STORAGE_KEYS exports all required teen state keys', () => {
  const required = [
    'userSide', 'theme', 'mood', 'selectedSekret', 'sekretMode',
    'entries', 'moodHistory', 'circlePosts', 'voiceNotes',
    'oracleProfile', 'oracleSessions', 'comfortSessions',
    'crewMembers', 'crewCheckIns', 'roomMemory',
  ];
  for (const key of required) {
    assert.ok(storageKeyValues.includes(key), `Missing teen storage key: ${key}`);
  }
});

test('STORAGE_KEYS exports all required parent state keys', () => {
  const required = [
    'parentMood', 'parentMoodDate', 'parentRoomStyle', 'parentPagesDraft',
    'parentCirclePosts', 'parentVoiceNotes', 'parentPagesEntries',
    'parentOracleProfile', 'parentOracleSessions',
    'parentCrewMembers', 'parentCrewCheckIns',
  ];
  for (const key of required) {
    assert.ok(storageKeyValues.includes(key), `Missing parent storage key: ${key}`);
  }
});

test('userSide key is present (determines the entire app experience on restore)', () => {
  assert.ok(storageKeyValues.includes('userSide'));
});

// ─── JSON_KEYS coverage ────────────────────────────────────────────────────────
test('all JSON_KEYS are also in STORAGE_KEYS (no orphan JSON keys)', () => {
  for (const key of jsonKeyValues) {
    assert.ok(storageKeyValues.includes(key), `JSON_KEY '${key}' not in STORAGE_KEYS`);
  }
});

test('array/object state fields are in JSON_KEYS', () => {
  const mustBeJson = [
    'entries', 'moodHistory', 'circlePosts', 'parentCirclePosts',
    'voiceNotes', 'oracleProfile', 'oracleSessions', 'comfortSessions',
    'crewMembers', 'crewCheckIns', 'roomMemory', 'periodDays',
  ];
  for (const key of mustBeJson) {
    assert.ok(jsonKeyValues.includes(key), `'${key}' must be in JSON_KEYS (it holds an object/array)`);
  }
});

test('plain string fields are NOT in JSON_KEYS', () => {
  const mustBeString = ['userSide', 'theme', 'mood', 'selectedSekret', 'sekretMode', 'streakDays'];
  for (const key of mustBeString) {
    assert.ok(!jsonKeyValues.includes(key), `'${key}' must not be JSON-parsed (it is a plain string)`);
  }
});

// ─── loadState / saveState error safety ────────────────────────────────────────
test('loadState catches errors and returns empty object (never throws)', () => {
  // The catch block must return {} not re-throw.
  const loadFn = storageSrc.slice(storageSrc.indexOf('export const loadState'));
  assert.match(loadFn, /catch.*return \{\}/s);
});

test('saveState catches errors silently (never throws)', () => {
  const saveFn = storageSrc.slice(storageSrc.indexOf('export const saveState'));
  assert.match(saveFn, /catch.*\{[\s\S]*?console\.error/s);
  assert.doesNotMatch(saveFn.slice(0, saveFn.indexOf('export const', 10)), /throw /);
});

test('loadState loads via multiGet (single round-trip for all keys)', () => {
  assert.match(storageSrc, /AsyncStorage\.multiGet/);
});

test('saveState persists via multiSet (single round-trip for all updates)', () => {
  assert.match(storageSrc, /AsyncStorage\.multiSet/);
});

test('loadState uses JSON_KEYS to decide parse vs. raw string', () => {
  assert.match(storageSrc, /JSON_KEYS\.has\(k\)/);
});

test('saveState serializes non-string values to JSON', () => {
  assert.match(storageSrc, /typeof v === 'string' \? v : JSON\.stringify\(v\)/);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SAFEUPSER / SAFEDELETE CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════

test('safeUpsert is a no-op when Supabase is not configured', () => {
  const fn = syncSrc.slice(syncSrc.indexOf('async function safeUpsert'));
  assert.match(fn, /if \(!sb\) return/);
});

test('safeUpsert is a no-op when no user session exists', () => {
  const fn = syncSrc.slice(syncSrc.indexOf('async function safeUpsert'));
  assert.match(fn, /if \(!uid\) return/);
});

test('safeUpsert always attaches user_id to every row before upsert', () => {
  assert.match(syncSrc, /\{ \.\.\.r, user_id: uid \}/);
});

test('safeUpsert catches all exceptions (never throws to caller)', () => {
  const fn = syncSrc.slice(
    syncSrc.indexOf('async function safeUpsert'),
    syncSrc.indexOf('async function safeDelete'),
  );
  assert.match(fn, /catch.*console\.warn/s);
  assert.doesNotMatch(fn, /throw /);
});

test('safeDelete matches on both id AND user_id (cannot delete another user\'s row)', () => {
  const fn = syncSrc.slice(
    syncSrc.indexOf('async function safeDelete'),
    syncSrc.indexOf('// ── Anonymous sign-in'),
  );
  assert.match(fn, /\.match\(\{ id, user_id: uid \}\)/);
});

test('safeDelete catches all exceptions (never throws to caller)', () => {
  const fn = syncSrc.slice(
    syncSrc.indexOf('async function safeDelete'),
    syncSrc.indexOf('// ── Anonymous sign-in'),
  );
  assert.match(fn, /catch.*console\.warn/s);
  assert.doesNotMatch(fn, /throw /);
});

// ─── Public sync functions are fire-and-forget ────────────────────────────────
test('syncMood calls void safeUpsert (non-blocking)', () => {
  assert.match(syncSrc, /export function syncMood[\s\S]*?void safeUpsert/);
});

test('syncJournal calls void safeUpsert (non-blocking)', () => {
  assert.match(syncSrc, /export function syncJournal[\s\S]*?void safeUpsert/);
});

test('syncVoiceNote calls void safeUpsert (non-blocking)', () => {
  assert.match(syncSrc, /export function syncVoiceNote[\s\S]*?void safeUpsert/);
});

test('syncComfortSession calls void safeUpsert (non-blocking)', () => {
  assert.match(syncSrc, /export function syncComfortSession[\s\S]*?void safeUpsert/);
});

test('deleteCrewMember calls void safeDelete (non-blocking)', () => {
  assert.match(syncSrc, /export function deleteCrewMember[\s\S]*?void safeDelete/);
});

// ═══════════════════════════════════════════════════════════════════════════════
// PULL-ALL RESTORE BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════════

test('pullAll returns null when Supabase is not configured', () => {
  const fn = syncSrc.slice(syncSrc.indexOf('export async function pullAll'));
  assert.match(fn, /if \(!sb\) return null/);
});

test('pullAll returns null when no user session exists', () => {
  const fn = syncSrc.slice(syncSrc.indexOf('export async function pullAll'));
  assert.match(fn, /if \(!uid\) return null/);
});

test('pullAll uses Promise.allSettled so a single table failure does not abort restore', () => {
  assert.match(syncSrc, /Promise\.allSettled/);
});

test('pullAll catches overall errors and returns null instead of throwing', () => {
  const fn = syncSrc.slice(syncSrc.indexOf('export async function pullAll'));
  assert.match(fn, /catch.*return null/s);
});

// ─── Column mapping: snake_case (DB) ↔ camelCase (app) ───────────────────────
test('pullAll maps sekret_reply column → sekretReply app field on restore', () => {
  assert.match(syncSrc, /sekretReply: r\.sekret_reply/);
});

test('syncJournal maps sekretReply app field → sekret_reply column on write', () => {
  assert.match(syncSrc, /sekret_reply: entry\.sekretReply/);
});

test('pullAll maps circle_tag column → circleTag app field on restore', () => {
  assert.match(syncSrc, /circleTag: r\.circle_tag/);
});

test('pullAll maps room memory columns to camelCase on restore', () => {
  assert.match(syncSrc, /lastVisit: room\.last_visit/);
  assert.match(syncSrc, /lastHotspot: room\.last_hotspot/);
  assert.match(syncSrc, /lastSummon: room\.last_summon/);
  assert.match(syncSrc, /visitCount: room\.visit_count/);
});

test('syncCrewMember maps inviteCode → invite_code on write', () => {
  assert.match(syncSrc, /invite_code: m\.inviteCode/);
});

test('pullAll maps member_id column → memberId app field on restore', () => {
  assert.match(syncSrc, /memberId: r\.member_id/);
});

// ─── pullAll returns all expected collection types ────────────────────────────
test('pullAll return shape includes all eight collection types', () => {
  const pullFn = syncSrc.slice(syncSrc.indexOf('export async function pullAll'));
  const required = [
    'moodHistory', 'journalEntries', 'circlePosts', 'voiceNotes',
    'comfortSessions', 'crewMembers', 'crewCheckIns', 'parentCirclePosts',
  ];
  for (const field of required) {
    assert.match(pullFn, new RegExp(`${field}:`), `pullAll must return ${field}`);
  }
});

test('pullAll includes roomMemory in restore payload', () => {
  assert.match(syncSrc, /roomMemory:/);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEEN ACTIVITY SUMMARY (PARENT-FACING VIEW)
// ═══════════════════════════════════════════════════════════════════════════════

test('deriveTier returns t0 for 0 sessions', () => {
  assert.equal(deriveTier(0), 't0');
});

test('deriveTier returns t0 for 1-2 sessions (below threshold)', () => {
  assert.equal(deriveTier(1), 't0');
  assert.equal(deriveTier(2), 't0');
});

test('deriveTier returns t1 at exactly 3 sessions', () => {
  assert.equal(deriveTier(3), 't1');
});

test('deriveTier returns t1 for 3-9 sessions', () => {
  assert.equal(deriveTier(9), 't1');
});

test('deriveTier returns t2 at exactly 10 sessions', () => {
  assert.equal(deriveTier(10), 't2');
});

test('deriveTier returns t2 for 10-24 sessions', () => {
  assert.equal(deriveTier(24), 't2');
});

test('deriveTier returns t3 at exactly 25 sessions', () => {
  assert.equal(deriveTier(25), 't3');
});

test('deriveTier returns t3 for 25-49 sessions', () => {
  assert.equal(deriveTier(49), 't3');
});

test('deriveTier returns t4 at exactly 50 sessions', () => {
  assert.equal(deriveTier(50), 't4');
});

test('deriveTier returns t4 for any count 50+', () => {
  assert.equal(deriveTier(100), 't4');
  assert.equal(deriveTier(999), 't4');
});

test('syncTeenActivitySummary only syncs aggregates (streak_days, session_count, points_tier)', () => {
  const start = syncSrc.indexOf('export async function syncTeenActivitySummary');
  const next  = syncSrc.indexOf('\nexport ', start + 1);
  const fn    = syncSrc.slice(start, next > 0 ? next : start + 2000);
  // Must include all three allowed aggregate fields.
  assert.match(fn, /streak_days/);
  assert.match(fn, /session_count/);
  assert.match(fn, /points_tier/);
  // Must NOT include raw journal text, mood tags, or private content fields.
  assert.doesNotMatch(fn, /entry\.text\b/);
  assert.doesNotMatch(fn, /\.text\s*[,)]/); // no column named text in the upsert payload
  assert.doesNotMatch(fn, /journal/i);
});

test('syncTeenActivitySummary derives session count from comfortSessions array length', () => {
  const fn = syncSrc.slice(syncSrc.indexOf('export async function syncTeenActivitySummary'));
  assert.match(fn, /comfortSessions\.length/);
});

test('TeenActivitySummary interface has no private content fields', () => {
  const ifaceMatch = syncSrc.match(/export interface TeenActivitySummary \{([\s\S]*?)\}/);
  assert.ok(ifaceMatch, 'TeenActivitySummary interface must be exported');
  const fields = ifaceMatch[1];
  assert.match(fields, /streak_days/);
  assert.match(fields, /session_count/);
  assert.match(fields, /points_tier/);
  assert.doesNotMatch(fields, /text/);
  assert.doesNotMatch(fields, /mood_tag/);
  assert.doesNotMatch(fields, /journal/i);
  assert.doesNotMatch(fields, /content/i);
});

test('fetchTeenActivitySummary reads from parent_teen_activity_snapshot view, not raw user table', () => {
  const fn = syncSrc.slice(syncSrc.indexOf('export async function fetchTeenActivitySummary'));
  // The parent reads a restricted view, not the underlying teen table directly.
  assert.match(fn, /parent_teen_activity_snapshot/);
  assert.doesNotMatch(fn, /from\('teen_activity_summary'\)/);
});

test('fetchTeenActivitySummary takes teenId as a parameter (parent fetches teen data by ID)', () => {
  assert.match(syncSrc, /fetchTeenActivitySummary\(\s*teenId: string/);
});

test('initTeenActivitySync syncs every 10 minutes', () => {
  assert.match(syncSrc, /10 \* 60 \* 1000/);
});

// ═══════════════════════════════════════════════════════════════════════════════
// ORACLE SESSION RESTORE
// ═══════════════════════════════════════════════════════════════════════════════

test('syncOracleSession upserts on user_id AND personality_id (one row per character)', () => {
  assert.match(syncSrc, /onConflict: 'user_id,personality_id'/);
});

test('loadOracleSession queries by both user_id and personality_id', () => {
  const fn = syncSrc.slice(syncSrc.indexOf('export async function loadOracleSession'));
  assert.match(fn, /\.eq\('user_id', uid\)/);
  assert.match(fn, /\.eq\('personality_id', personalityId\)/);
});

test('loadOracleSession returns null when Supabase is not configured', () => {
  const fn = syncSrc.slice(syncSrc.indexOf('export async function loadOracleSession'));
  assert.match(fn, /if \(!sb\) return null/);
});

test('loadOracleSession returns null (not throws) when session not found', () => {
  const fn = syncSrc.slice(syncSrc.indexOf('export async function loadOracleSession'));
  assert.match(fn, /if \(!data\) return null/);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

test('getSupabase returns null when Supabase is not configured', () => {
  assert.match(supabaseSrc, /if \(!isSupabaseConfigured\) return null/);
});

test('Supabase session is persisted via AsyncStorage (survives app restart)', () => {
  assert.match(supabaseSrc, /storage:\s*AsyncStorage/);
  assert.match(supabaseSrc, /persistSession:\s*true/);
});

test('Supabase client uses autoRefreshToken', () => {
  assert.match(supabaseSrc, /autoRefreshToken:\s*true/);
});

test('service_role key is never used in client code (comment warnings are fine)', () => {
  // Strip comment lines before checking — the file legitimately warns against it in comments.
  const nonCommentLines = supabaseSrc
    .split('\n')
    .filter(line => !line.trimStart().startsWith('//'))
    .join('\n');
  assert.doesNotMatch(nonCommentLines, /service_role/i);
  assert.doesNotMatch(nonCommentLines, /SUPABASE_SERVICE_ROLE/);
});

test('TABLES map includes all critical data tables', () => {
  const required = [
    'journalEntries', 'moodHistory', 'voiceNotes', 'circlePosts',
    'parentCirclePosts', 'comfortSessions', 'crewMembers', 'crewCheckIns',
    'roomMemory', 'periodDays', 'oracleSessions', 'parentLinks',
    'safetyAlerts', 'bipPoints',
  ];
  for (const key of required) {
    assert.ok(key in tableEntries, `TABLES must include '${key}'`);
  }
});

test('all TABLES values use snake_case (database convention)', () => {
  for (const [, value] of Object.entries(tableEntries)) {
    assert.match(value, /^[a-z_]+$/, `Table name '${value}' must be snake_case`);
  }
});

test('TABLES has a teen activity summary entry', () => {
  assert.ok(
    Object.values(tableEntries).includes('teen_activity_summary'),
    'TABLES must map to teen_activity_summary',
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANONYMOUS SESSION
// ═══════════════════════════════════════════════════════════════════════════════

test('ensureAnonymousSession returns null when Supabase is not configured', () => {
  const fn = syncSrc.slice(syncSrc.indexOf('export async function ensureAnonymousSession'));
  assert.match(fn, /if \(!sb\) return null/);
});

test('ensureAnonymousSession delegates session reuse and anonymous fallback to the session service', () => {
  const fn = syncSrc.slice(syncSrc.indexOf('export async function ensureAnonymousSession'));
  assert.match(syncSrc, /ensureAnonymousSession as startAnonymousSession/);
  assert.match(fn, /await startAnonymousSession\(\)/);
});

test('ensureAnonymousSession catches errors and returns null (never throws)', () => {
  const fn = syncSrc.slice(syncSrc.indexOf('export async function ensureAnonymousSession'));
  assert.match(fn, /catch.*return null/s);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEEN / PARENT DATA ISOLATION
// ═══════════════════════════════════════════════════════════════════════════════

test('parent circle posts use a separate table from teen circle posts', () => {
  assert.ok(tableEntries.parentCirclePosts !== tableEntries.circlePosts);
  assert.equal(tableEntries.parentCirclePosts, 'parent_circle_posts');
  assert.equal(tableEntries.circlePosts,       'circle_posts');
});

test('STORAGE_KEYS uses parent-prefixed names for all parent state', () => {
  // All parent-specific keys should start with 'parent'.
  const parentKeys = storageKeyValues.filter(k => k.startsWith('parent'));
  assert.ok(parentKeys.length >= 10, `Expected at least 10 parent-prefixed keys, found ${parentKeys.length}`);
});

test('loadParentCircleFeed queries parentCirclePosts table (not teen circle tables)', () => {
  const start = syncSrc.indexOf('export async function loadParentCircleFeed');
  const next  = syncSrc.indexOf('\nexport ', start + 1);
  const fn    = syncSrc.slice(start, next > 0 ? next : start + 2000);
  assert.match(fn, /TABLES\.parentCirclePosts/);
  assert.doesNotMatch(fn, /TABLES\.circlePosts\b(?!.*parent)/); // no bare circlePosts (teen table)
  assert.doesNotMatch(fn, /TABLES\.publicCirclePosts/);
  assert.doesNotMatch(fn, /TABLES\.friendsCirclePosts/);
});

test('syncTeenActivitySummary sync comment says never throw', () => {
  assert.match(syncSrc, /IMPORTANT: never throw/i);
});

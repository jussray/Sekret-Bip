import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../supabase/migrations/20260822060000_tc01_private_safety_boundary.sql', import.meta.url), 'utf8');
const scanner = fs.readFileSync(new URL('../supabase/functions/safety-scan/index.ts', import.meta.url), 'utf8');
const safetySheet = fs.readFileSync(new URL('../components/safety/SafetyExperienceSheet.tsx', import.meta.url), 'utf8');

test('TC-01 Barrier A removes automatic scanning from private and mixed-visibility sources', () => {
  assert.match(migration, /DROP TRIGGER IF EXISTS safety_scan_journal ON public\.journal_entries/);
  assert.match(migration, /DROP TRIGGER IF EXISTS safety_scan_circle ON public\.circle_posts/);
  assert.match(migration, /DROP TRIGGER IF EXISTS safety_scan_posts ON public\.posts/);
  assert.doesNotMatch(migration, /DROP TRIGGER IF EXISTS safety_scan_public_circle/);
});

test('database trigger function fails closed and sends metadata only', () => {
  assert.match(migration, /IF TG_TABLE_NAME::text <> 'public_circle_posts' THEN\s+RETURN NEW;/s);
  const httpBody = migration.match(/body := jsonb_build_object\([\s\S]*?\),\s+headers :=/);
  assert.ok(httpBody);
  assert.match(httpBody[0], /'record_id'/);
  assert.match(httpBody[0], /'user_id'/);
  assert.match(httpBody[0], /'source_table'/);
  assert.doesNotMatch(httpBody[0], /'content'|_content|NEW\.text|NEW\.body/);
});

test('TC-01 Barrier B uses an explicit automatic-source allowlist', () => {
  assert.match(scanner, /AUTOMATIC_SAFETY_ELIGIBLE_SOURCES = new Set\(\['public_circle_posts'\]\)/);
  assert.match(scanner, /PRIVATE_OR_MIXED_SOURCES = new Set\(\[/);
  for (const source of ['journal_entries', 'circle_posts', 'posts', 's2tell_entries']) assert.match(scanner, new RegExp(`['"]${source}['"]`));
});

test('private-source rejection precedes privileged access and processing', () => {
  const rejectIdx = scanner.indexOf("PRIVATE_OR_MIXED_SOURCES.has(metadata.source_table)");
  for (const needle of ['createClient(SUPA_URL, SUPA_SVC_KEY', 'const kw = patternScan(content)', 'const mod = await moderationScan(content)', 'await notifyParentIfLinked']) {
    assert.ok(scanner.indexOf(needle) > rejectIdx, `${needle} must occur after private rejection`);
  }
});

test('scanner ignores caller raw content and loads only canonical public source', () => {
  assert.doesNotMatch(scanner, /metadata\.content/);
  assert.match(scanner, /\.from\(sourceTable\)[\s\S]*?\.select\('id,user_id,text'\)/);
  assert.match(scanner, /\.eq\('id', metadata\.record_id\)/);
  assert.match(scanner, /\.eq\('user_id', metadata\.user_id\)/);
});

test('missing, private and non-allowlisted sources fail closed', () => {
  assert.match(scanner, /reject\('invalid_source'\)/);
  assert.match(scanner, /reject\('private_source'\)/);
  assert.match(scanner, /reject\('source_not_allowlisted'\)/);
  assert.match(scanner, /reject\('invalid_metadata'\)/);
});

test('child safety sheet states monitoring and response limits plainly', () => {
  assert.match(safetySheet, /Bip is not monitoring what you write\./);
  assert.match(safetySheet, /cannot promise they will answer\./);
  assert.match(safetySheet, /Bip has not confirmed that anyone was contacted\./);
  assert.match(safetySheet, /Bridge can help you reach them\./);
});

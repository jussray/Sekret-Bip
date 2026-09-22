import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const migrationsDir = new URL('../supabase/migrations/', import.meta.url);
const protectedRoles = new Set(['public', 'anon', 'authenticated']);

async function readMigrationCorpus() {
  const names = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
  const sources = await Promise.all(
    names.map(async (name) => `-- ${name}\n${await readFile(new URL(name, migrationsDir), 'utf8')}`),
  );
  return sources.join('\n\n');
}

function normalizeList(value) {
  return value
    .split(',')
    .map((item) => item.trim().replace(/^"|"$/g, '').toLowerCase())
    .filter(Boolean);
}

function assertNoProtectedExecuteGrant(corpus, functionName) {
  const statements = corpus.match(/grant\s+[\s\S]*?;/gi) ?? [];
  const escapedName = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const directTarget = new RegExp(`\\bon\\s+(?:function|routine)\\s+[\\s\\S]*?\\bpublic\\.${escapedName}\\s*\\(`, 'i');
  const schemaWideTarget = /\bon\s+all\s+(?:functions|routines)\s+in\s+schema\s+public\b/i;

  for (const statement of statements) {
    if (!directTarget.test(statement) && !schemaWideTarget.test(statement)) continue;

    const privilegeMatch = statement.match(/^grant\s+([\s\S]*?)\s+on\s+/i);
    const granteeMatch = statement.match(/\bto\s+([\s\S]*?)(?:\s+with\s+grant\s+option)?\s*;$/i);
    if (!privilegeMatch || !granteeMatch) continue;

    const privileges = normalizeList(privilegeMatch[1]);
    const grantsExecute = privileges.some(
      (privilege) => privilege === 'execute' || privilege === 'all' || privilege === 'all privileges',
    );
    if (!grantsExecute) continue;

    const grantees = normalizeList(granteeMatch[1]);
    const exposedRoles = grantees.filter((role) => protectedRoles.has(role));
    assert.deepEqual(
      exposedRoles,
      [],
      `no migration may grant EXECUTE on ${functionName}() to ${exposedRoles.join(', ')}`,
    );
  }
}

test('cleanup_crew_relationship_access rejects direct or schema-wide protected EXECUTE re-grants', async () => {
  assertNoProtectedExecuteGrant(await readMigrationCorpus(), 'cleanup_crew_relationship_access');
});

test('apply_point_transaction rejects direct or schema-wide protected EXECUTE re-grants', async () => {
  assertNoProtectedExecuteGrant(await readMigrationCorpus(), 'apply_point_transaction');
});

test('grant parser catches multi-privilege and multi-role re-grants', () => {
  const unsafeCorpus = `
    GRANT SELECT, EXECUTE ON FUNCTION public.cleanup_crew_relationship_access()
      TO service_role, authenticated;
    GRANT ALL PRIVILEGES ON FUNCTION public.apply_point_transaction()
      TO service_role, anon;
  `;

  assert.throws(
    () => assertNoProtectedExecuteGrant(unsafeCorpus, 'cleanup_crew_relationship_access'),
    /authenticated/,
  );
  assert.throws(
    () => assertNoProtectedExecuteGrant(unsafeCorpus, 'apply_point_transaction'),
    /anon/,
  );
});

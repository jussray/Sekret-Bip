import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const migrationsDir = new URL('../supabase/migrations/', import.meta.url);
const protectedRoles = new Set(['public', 'anon', 'authenticated']);

async function readMigrations() {
  const names = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
  return Promise.all(names.map(async (name) => ({
    name,
    source: await readFile(new URL(name, migrationsDir), 'utf8'),
  })));
}

async function readMigrationCorpus() {
  return (await readMigrations())
    .map(({ name, source }) => `-- ${name}\n${source}`)
    .join('\n\n');
}

function normalizeList(value) {
  return value
    .split(',')
    .map((item) => item.trim().replace(/^"|"$/g, '').toLowerCase())
    .filter(Boolean);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertNoProtectedExecuteGrant(corpus, functionName) {
  const statements = corpus.match(/grant\s+[\s\S]*?;/gi) ?? [];
  const escapedName = escapeRegex(functionName);
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

function aclEvents(source, functionName) {
  const escapedName = escapeRegex(functionName);
  const patterns = [
    {
      type: 'drop',
      regex: new RegExp(`\\bdrop\\s+(?:function|routine)\\s+(?:if\\s+exists\\s+)?public\\.${escapedName}\\s*\\(`, 'gi'),
    },
    {
      type: 'create',
      regex: new RegExp(`\\bcreate\\s+(?:or\\s+replace\\s+)?function\\s+public\\.${escapedName}\\s*\\(`, 'gi'),
    },
    {
      type: 'revoke',
      regex: new RegExp(
        `\\brevoke\\s+([\\s\\S]*?)\\s+on\\s+(?:function|routine)\\s+public\\.${escapedName}\\s*\\([^)]*\\)\\s+from\\s+([\\s\\S]*?);`,
        'gi',
      ),
    },
  ];

  const events = [];
  for (const { type, regex } of patterns) {
    for (const match of source.matchAll(regex)) {
      events.push({
        type,
        index: match.index ?? 0,
        privileges: type === 'revoke' ? normalizeList(match[1] ?? '') : [],
        roles: type === 'revoke' ? normalizeList(match[2] ?? '') : [],
      });
    }
  }
  return events.sort((left, right) => left.index - right.index);
}

function assertNewDefinitionsEndLocked(migrations, functionName) {
  let functionExists = false;
  let exposedAfterCreate = new Set();

  for (const migration of migrations) {
    for (const event of aclEvents(migration.source, functionName)) {
      if (event.type === 'drop') {
        functionExists = false;
        exposedAfterCreate = new Set();
        continue;
      }

      if (event.type === 'create') {
        // CREATE OR REPLACE preserves ACLs for an existing function, but a new
        // definition after DROP receives schema/default privileges. Treat a
        // first-seen definition the same way so this test never depends on
        // undocumented pre-migration ACL state.
        if (!functionExists) exposedAfterCreate = new Set(protectedRoles);
        functionExists = true;
        continue;
      }

      const revokesExecute = event.privileges.some(
        (privilege) => privilege === 'execute' || privilege === 'all' || privilege === 'all privileges',
      );
      if (!revokesExecute) continue;
      for (const role of event.roles) exposedAfterCreate.delete(role);
    }

    assert.deepEqual(
      [...exposedAfterCreate].sort(),
      [],
      `${migration.name} leaves a new/recreated ${functionName}() definition exposed through default EXECUTE privileges`,
    );
  }
}

test('cleanup_crew_relationship_access rejects explicit and implicit protected EXECUTE re-grants', async () => {
  const migrations = await readMigrations();
  assertNoProtectedExecuteGrant(await readMigrationCorpus(), 'cleanup_crew_relationship_access');
  assertNewDefinitionsEndLocked(migrations, 'cleanup_crew_relationship_access');
});

test('apply_point_transaction rejects explicit and implicit protected EXECUTE re-grants', async () => {
  const migrations = await readMigrations();
  assertNoProtectedExecuteGrant(await readMigrationCorpus(), 'apply_point_transaction');
  assertNewDefinitionsEndLocked(migrations, 'apply_point_transaction');
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

test('ACL model catches a drop/recreate that relies on default EXECUTE privileges', () => {
  const unsafeMigrations = [
    {
      name: '001_initial.sql',
      source: `
        create or replace function public.cleanup_crew_relationship_access()
        returns trigger language plpgsql as $$ begin return new; end $$;
        revoke all on function public.cleanup_crew_relationship_access()
          from public, anon, authenticated;
      `,
    },
    {
      name: '002_recreate.sql',
      source: `
        drop function public.cleanup_crew_relationship_access();
        create function public.cleanup_crew_relationship_access()
        returns trigger language plpgsql as $$ begin return new; end $$;
      `,
    },
  ];

  assert.throws(
    () => assertNewDefinitionsEndLocked(unsafeMigrations, 'cleanup_crew_relationship_access'),
    /002_recreate\.sql leaves a new\/recreated cleanup_crew_relationship_access\(\) definition exposed/,
  );
});

test('ACL model accepts a recreated function only after protected EXECUTE is revoked again', () => {
  const safeMigrations = [
    {
      name: '001_initial.sql',
      source: `
        create function public.apply_point_transaction()
        returns trigger language plpgsql as $$ begin return new; end $$;
        revoke all on function public.apply_point_transaction()
          from public, anon, authenticated;
      `,
    },
    {
      name: '002_recreate.sql',
      source: `
        drop function public.apply_point_transaction();
        create function public.apply_point_transaction()
        returns trigger language plpgsql as $$ begin return new; end $$;
        revoke execute on function public.apply_point_transaction()
          from public, anon, authenticated;
      `,
    },
  ];

  assert.doesNotThrow(
    () => assertNewDefinitionsEndLocked(safeMigrations, 'apply_point_transaction'),
  );
});

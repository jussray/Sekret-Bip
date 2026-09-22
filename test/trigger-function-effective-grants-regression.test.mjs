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

function stripSqlComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\r\n]*/g, ' ');
}

function sqlStatements(source) {
  return stripSqlComments(source)
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function assertNoProtectedExecuteGrant(corpus, functionName) {
  const escapedName = escapeRegex(functionName);
  const directTarget = new RegExp(`^(?:function|routine)\\s+public\\.${escapedName}\\s*\\(`, 'i');
  const schemaWideTarget = /^all\s+(?:functions|routines)\s+in\s+schema\s+public$/i;

  for (const statement of sqlStatements(corpus)) {
    const grant = statement.match(/^grant\s+(.+?)\s+on\s+(.+?)\s+to\s+(.+?)(?:\s+with\s+grant\s+option)?$/is);
    if (!grant) continue;

    const [, privilegeSource, target, granteeSource] = grant;
    if (!directTarget.test(target.trim()) && !schemaWideTarget.test(target.trim())) continue;

    const privileges = normalizeList(privilegeSource);
    const grantsExecute = privileges.some(
      (privilege) => privilege === 'execute' || privilege === 'all' || privilege === 'all privileges',
    );
    if (!grantsExecute) continue;

    const grantees = normalizeList(granteeSource);
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
  const dropTarget = new RegExp(`^drop\\s+(?:function|routine)\\s+(?:if\\s+exists\\s+)?public\\.${escapedName}\\s*\\(`, 'i');
  const createTarget = new RegExp(`^create\\s+(?:or\\s+replace\\s+)?function\\s+public\\.${escapedName}\\s*\\(`, 'i');
  const revokeTarget = new RegExp(
    `^revoke\\s+(.+?)\\s+on\\s+(?:function|routine)\\s+public\\.${escapedName}\\s*\\([^)]*\\)\\s+from\\s+(.+)$`,
    'is',
  );

  const events = [];
  for (const statement of sqlStatements(source)) {
    if (dropTarget.test(statement)) {
      events.push({ type: 'drop', privileges: [], roles: [] });
      continue;
    }
    if (createTarget.test(statement)) {
      events.push({ type: 'create', privileges: [], roles: [] });
      continue;
    }
    const revoke = statement.match(revokeTarget);
    if (revoke) {
      events.push({
        type: 'revoke',
        privileges: normalizeList(revoke[1]),
        roles: normalizeList(revoke[2]),
      });
    }
  }
  return events;
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

test('grant parser catches multi-privilege, multi-role, schema-wide, and comment-prefixed re-grants', () => {
  const unsafeCorpus = `
    -- never grant this directly
    GRANT SELECT, EXECUTE ON FUNCTION public.cleanup_crew_relationship_access()
      TO service_role, authenticated;
    GRANT ALL PRIVILEGES ON FUNCTION public.apply_point_transaction()
      TO service_role, anon;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role, public;
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

test('ACL model keeps unrelated REVOKEs statement-bounded and accepts a protected re-revoke', () => {
  const safeMigrations = [
    {
      name: '001_initial.sql',
      source: `
        create function public.apply_point_transaction()
        returns trigger language plpgsql as $$ begin return new; end $$;
        revoke insert, update, delete on table public.point_ledger from authenticated;
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
        -- keep this function locked after recreation
        revoke execute on function public.apply_point_transaction()
          from public, anon, authenticated;
      `,
    },
  ];

  assert.doesNotThrow(
    () => assertNewDefinitionsEndLocked(safeMigrations, 'apply_point_transaction'),
  );
});

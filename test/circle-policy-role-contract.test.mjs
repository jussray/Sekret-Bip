import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  'supabase/migrations/20260824223800_restore_circle_authenticated_policy_roles.sql',
  'utf8',
);

function maskRange(sql, start, end) {
  let masked = '';
  for (let index = start; index < end; index += 1) {
    masked += sql[index] === '\n' ? '\n' : ' ';
  }
  return masked;
}

function executableSqlOnly(sql) {
  let output = '';
  let index = 0;

  while (index < sql.length) {
    const char = sql[index];
    const next = sql[index + 1];

    if ((char === 'E' || char === 'e') && next === "'") {
      const start = index;
      index += 2;
      while (index < sql.length) {
        if (sql[index] === '\\') {
          index = Math.min(index + 2, sql.length);
          continue;
        }
        if (sql[index] === "'" && sql[index + 1] === "'") {
          index += 2;
          continue;
        }
        if (sql[index++] === "'") break;
      }
      output += maskRange(sql, start, index);
      continue;
    }

    if (char === "'") {
      const start = index++;
      while (index < sql.length) {
        if (sql[index] === "'" && sql[index + 1] === "'") {
          index += 2;
          continue;
        }
        if (sql[index++] === "'") break;
      }
      output += maskRange(sql, start, index);
      continue;
    }

    // Double quotes are identifiers in PostgreSQL, so keep them executable.
    if (char === '"') {
      const start = index++;
      while (index < sql.length) {
        if (sql[index] === '"' && sql[index + 1] === '"') {
          index += 2;
          continue;
        }
        if (sql[index++] === '"') break;
      }
      output += sql.slice(start, index);
      continue;
    }

    if (char === '$') {
      const delimiterMatch = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/u);
      if (delimiterMatch) {
        const delimiter = delimiterMatch[0];
        const start = index;
        index += delimiter.length;
        const closing = sql.indexOf(delimiter, index);
        index = closing === -1 ? sql.length : closing + delimiter.length;
        output += maskRange(sql, start, index);
        continue;
      }
    }

    if (char === '-' && next === '-') {
      const start = index;
      index += 2;
      while (index < sql.length && sql[index] !== '\n') index += 1;
      if (index < sql.length) index += 1;
      output += maskRange(sql, start, index);
      continue;
    }

    if (char === '/' && next === '*') {
      const start = index;
      index += 2;
      let depth = 1;
      while (index < sql.length && depth > 0) {
        const blockChar = sql[index];
        const blockNext = sql[index + 1];
        if (blockChar === '/' && blockNext === '*') {
          depth += 1;
          index += 2;
          continue;
        }
        if (blockChar === '*' && blockNext === '/') {
          depth -= 1;
          index += 2;
          continue;
        }
        index += 1;
      }
      output += maskRange(sql, start, index);
      continue;
    }

    output += char;
    index += 1;
  }

  return output;
}

function readPolicyRoles(sql) {
  const rolesByPolicy = new Map();
  const executable = executableSqlOnly(sql);
  const statementPattern = /\b(create|alter)\s+policy\s+(?:(?:U&)?"((?:[^"]|"")*)"|([A-Za-z_][A-Za-z0-9_$]*))\s+on\s+([A-Za-z0-9_.$"]+)([\s\S]*?);/giu;

  for (const match of executable.matchAll(statementPattern)) {
    const verb = match[1].toLowerCase();
    const policy = (match[2] ?? match[3]).replaceAll('""', '"').toLowerCase();
    const table = match[4].replaceAll('"', '').toLowerCase();
    const options = match[5];
    const toMatch = options.match(/\bto\s+([\s\S]*?)(?=\s+(?:using|with\s+check)\b|$)/iu);

    let roles;
    if (toMatch) {
      roles = toMatch[1]
        .split(',')
        .map((role) => role.trim().replaceAll('"', '').toLowerCase())
        .filter(Boolean);
    } else if (verb === 'create') {
      // PostgreSQL CREATE POLICY defaults to PUBLIC when TO is omitted.
      roles = ['public'];
    } else {
      // ALTER POLICY without TO leaves the existing role list unchanged. Keep
      // an explicit empty value so required role-changing ALTERs cannot pass.
      roles = [];
    }

    rolesByPolicy.set(`${table}::${policy}`, roles);
  }

  return rolesByPolicy;
}

const requiredPolicies = [
  ['circles select owner or member', 'public.circles'],
  ['circles insert own', 'public.circles'],
  ['posts select by circle visibility', 'public.posts'],
  ['posts insert by author', 'public.posts'],
];

test('Circle policies are explicitly restored to authenticated only', () => {
  const rolesByPolicy = readPolicyRoles(migration);

  for (const [policy, table] of requiredPolicies) {
    assert.deepEqual(
      rolesByPolicy.get(`${table}::${policy}`),
      ['authenticated'],
      `${policy} must be scoped only to authenticated`,
    );
  }
});

test('the repair does not add anon or public anywhere in a policy role list', () => {
  for (const roles of readPolicyRoles(migration).values()) {
    assert.equal(roles.includes('anon'), false);
    assert.equal(roles.includes('public'), false);
  }
});

test('role guard ignores SQL comments and quoted literal bodies', () => {
  const sample = [
    "select 'alter policy \"circles select owner or member\" on public.circles to authenticated';",
    "select E'kept \\'-- alter policy \"circles insert own\" on public.circles to authenticated';",
    '/* alter policy "posts select by circle visibility" on public.posts to authenticated; */',
    '$body$ alter policy "posts insert by author" on public.posts to authenticated; $body$;',
    'alter policy "real" on public.circles to authenticated;',
  ].join('\n');

  const rolesByPolicy = readPolicyRoles(sample);
  assert.equal(rolesByPolicy.has('public.circles::circles select owner or member'), false);
  assert.equal(rolesByPolicy.has('public.circles::circles insert own'), false);
  assert.equal(rolesByPolicy.has('public.posts::posts select by circle visibility'), false);
  assert.equal(rolesByPolicy.has('public.posts::posts insert by author'), false);
  assert.deepEqual(rolesByPolicy.get('public.circles::real'), ['authenticated']);
});

test('role guard tracks nested PostgreSQL block comments before executable policy roles', () => {
  const sample = [
    '/* outer /* inner */ -- still outer */',
    'alter policy "unsafe-after-nested-comment" on public.circles to public;',
  ].join('\n');

  assert.deepEqual(
    readPolicyRoles(sample).get('public.circles::unsafe-after-nested-comment'),
    ['public'],
  );
});

test('role guard reads every role in a PostgreSQL policy role list', () => {
  const sample = 'alter policy "unsafe-list" on public.circles to authenticated, public;';
  assert.deepEqual(
    readPolicyRoles(sample).get('public.circles::unsafe-list'),
    ['authenticated', 'public'],
  );
});

test('role guard inspects CREATE POLICY role lists after AS and FOR options', () => {
  const sample = 'create policy "unsafe-create" on public.circles as restrictive for select to authenticated, public using (true);';
  assert.deepEqual(
    readPolicyRoles(sample).get('public.circles::unsafe-create'),
    ['authenticated', 'public'],
  );
});

test('role guard treats CREATE POLICY without TO as implicit PUBLIC', () => {
  const sample = 'create policy "implicit-public" on public.circles for select using (true);';
  assert.deepEqual(
    readPolicyRoles(sample).get('public.circles::implicit-public'),
    ['public'],
  );
});

test('role guard detects unquoted policy identifiers', () => {
  const sample = 'create policy unsafe_unquoted on public.circles for select to public using (true);';
  assert.deepEqual(
    readPolicyRoles(sample).get('public.circles::unsafe_unquoted'),
    ['public'],
  );
});

test('role guard detects Unicode-escaped quoted policy identifiers', () => {
  const sample = 'alter policy U&"circles select owner or member" on public.circles to public;';
  assert.deepEqual(
    readPolicyRoles(sample).get('public.circles::circles select owner or member'),
    ['public'],
  );
});

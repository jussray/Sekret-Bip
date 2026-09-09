import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationsRoot = path.join(root, 'supabase', 'migrations');
const baselinePath = path.join(root, 'security', 'supabase-trigger-baseline.json');
const sprintPath = path.join(root, 'SPRINT.md');

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const sprint = fs.readFileSync(sprintPath, 'utf8');
const migrations = fs
  .readdirSync(migrationsRoot)
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((file) => ({
    file,
    sql: fs.readFileSync(path.join(migrationsRoot, file), 'utf8'),
  }));

function unquoteIdentifier(value) {
  return value
    .trim()
    .replace(/^"|"$/g, '')
    .replace(/^'|'$/g, '')
    .replace(/""/g, '');
}

function normalizeQualifiedName(value, defaultSchema = 'public') {
  const parts = value.split('.').map(unquoteIdentifier);
  if (parts.length === 1) parts.unshift(defaultSchema);
  return parts.map((part) => part.toLowerCase()).join('.');
}

function normalizeArguments(value) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function functionSignature(name, args = '') {
  return `${normalizeQualifiedName(name)}(${normalizeArguments(args)})`;
}

function normalizeSearchPath(value) {
  return value
    .split(',')
    .map((part) => unquoteIdentifier(part).trim().toLowerCase())
    .filter(Boolean)
    .join(', ');
}

function triggerKey(table, trigger) {
  return `${table}::${trigger}`;
}

const tc01RetiredSafetyTriggerKeys = new Set([
  triggerKey('public.circle_posts', 'safety_scan_circle'),
  triggerKey('public.journal_entries', 'safety_scan_journal'),
  triggerKey('public.posts', 'safety_scan_posts'),
]);

function stripSqlComments(source) {
  let result = '';
  let index = 0;
  let state = 'normal';
  let dollarTag = null;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (state === 'line-comment') {
      if (char === '\n') {
        result += '\n';
        state = 'normal';
      } else {
        result += ' ';
      }
      index += 1;
      continue;
    }

    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        result += '  ';
        index += 2;
        state = 'normal';
      } else {
        result += char === '\n' ? '\n' : ' ';
        index += 1;
      }
      continue;
    }

    if (state === 'single-quote') {
      result += char;
      if (char === "'" && next === "'") {
        result += next;
        index += 2;
        continue;
      }
      if (char === "'") state = 'normal';
      index += 1;
      continue;
    }

    if (state === 'double-quote') {
      result += char;
      if (char === '"' && next === '"') {
        result += next;
        index += 2;
        continue;
      }
      if (char === '"') state = 'normal';
      index += 1;
      continue;
    }

    if (state === 'dollar-quote') {
      if (source.startsWith(dollarTag, index)) {
        result += dollarTag;
        index += dollarTag.length;
        dollarTag = null;
        state = 'normal';
      } else {
        result += char;
        index += 1;
      }
      continue;
    }

    if (char === '-' && next === '-') {
      result += '  ';
      index += 2;
      state = 'line-comment';
      continue;
    }
    if (char === '/' && next === '*') {
      result += '  ';
      index += 2;
      state = 'block-comment';
      continue;
    }
    if (char === "'") {
      result += char;
      index += 1;
      state = 'single-quote';
      continue;
    }
    if (char === '"') {
      result += char;
      index += 1;
      state = 'double-quote';
      continue;
    }
    if (char === '$') {
      const match = source.slice(index).match(/^\$[a-z_][a-z0-9_]*\$|^\$\$/i);
      if (match) {
        dollarTag = match[0];
        result += dollarTag;
        index += dollarTag.length;
        state = 'dollar-quote';
        continue;
      }
    }

    result += char;
    index += 1;
  }

  return result;
}

function parseRoles(value) {
  return value
    .split(',')
    .map((role) => unquoteIdentifier(role).trim().toLowerCase())
    .filter(Boolean);
}

function collectEvents(file, rawSql) {
  const sql = stripSqlComments(rawSql);
  const events = [];

  const createFunction = /\bcreate\s+(or\s+replace\s+)?function\s+((?:"?[a-z_][\w$]*"?\.)?"?[a-z_][\w$]*"?)\s*\(([^)]*)\)\s*([\s\S]*?)\bas\s+(\$[a-z_][a-z0-9_]*\$|\$\$)/gi;
  for (const match of sql.matchAll(createFunction)) {
    const [, replaceToken, name, args, header] = match;
    if (!/\breturns\s+trigger\b/i.test(header)) continue;
    const searchPath = header.match(/\bset\s+search_path\s*(?:=|to)\s*([^;\r\n]+)/i);
    events.push({
      kind: 'function-create',
      index: match.index,
      file,
      signature: functionSignature(name, args),
      replace: Boolean(replaceToken),
      securityDefiner: /\bsecurity\s+definer\b/i.test(header),
      searchPath: searchPath ? normalizeSearchPath(searchPath[1]) : null,
    });
  }

  const alterFunction = /\balter\s+function\s+((?:"?[a-z_][\w$]*"?\.)?"?[a-z_][\w$]*"?)\s*\(([^)]*)\)\s+([\s\S]*?);/gi;
  for (const match of sql.matchAll(alterFunction)) {
    const clause = match[3];
    const searchPath = clause.match(/\bset\s+search_path\s*(?:=|to)\s*([^;\r\n]+)/i);
    const resetSearchPath = /\breset\s+search_path\b/i.test(clause);
    const securityMode = clause.match(/\bsecurity\s+(definer|invoker)\b/i);
    if (!searchPath && !resetSearchPath && !securityMode) continue;

    events.push({
      kind: 'function-alter',
      index: match.index,
      file,
      signature: functionSignature(match[1], match[2]),
      hasSearchPathChange: Boolean(searchPath || resetSearchPath),
      searchPath: searchPath ? normalizeSearchPath(searchPath[1]) : null,
      securityDefiner: securityMode
        ? securityMode[1].toLowerCase() === 'definer'
        : undefined,
    });
  }

  const dropFunction = /\bdrop\s+function\s+(?:if\s+exists\s+)?((?:"?[a-z_][\w$]*"?\.)?"?[a-z_][\w$]*"?)\s*\(([^)]*)\)[^;]*;/gi;
  for (const match of sql.matchAll(dropFunction)) {
    events.push({
      kind: 'function-drop',
      index: match.index,
      file,
      signature: functionSignature(match[1], match[2]),
    });
  }

  const privilege = /\b(grant|revoke)\s+(?:all(?:\s+privileges)?|execute)\s+on\s+function\s+((?:"?[a-z_][\w$]*"?\.)?"?[a-z_][\w$]*"?)\s*\(([^)]*)\)\s+(?:to|from)\s+([^;]+);/gi;
  for (const match of sql.matchAll(privilege)) {
    events.push({
      kind: 'privilege',
      index: match.index,
      file,
      action: match[1].toLowerCase(),
      signature: functionSignature(match[2], match[3]),
      roles: parseRoles(match[4]),
    });
  }

  const createTrigger = /\bcreate\s+(?:constraint\s+)?trigger\s+("?[a-z_][\w$]*"?)\s+([\s\S]*?)\bon\s+((?:"?[a-z_][\w$]*"?\.)?"?[a-z_][\w$]*"?)\s+([\s\S]*?)\bexecute\s+(?:function|procedure)\s+((?:"?[a-z_][\w$]*"?\.)?"?[a-z_][\w$]*"?)\s*\(([^;]*)\)\s*;/gi;
  for (const match of sql.matchAll(createTrigger)) {
    const [, triggerName, beforeOn, tableName, afterOn, functionName] = match;
    const timing = beforeOn.match(/\b(before|after|instead\s+of)\b/i)?.[1]
      ?.replace(/\s+/g, ' ')
      .toUpperCase() ?? null;
    const triggerEvents = [...beforeOn.matchAll(/\b(insert|update|delete|truncate)\b/gi)]
      .map((eventMatch) => eventMatch[1].toUpperCase());

    events.push({
      kind: 'trigger-create',
      index: match.index,
      file,
      trigger: unquoteIdentifier(triggerName).toLowerCase(),
      table: normalizeQualifiedName(tableName),
      function: functionSignature(functionName),
      timing,
      events: [...new Set(triggerEvents)],
      rowLevel: /\bfor\s+each\s+row\b/i.test(afterOn),
    });
  }

  const dropTrigger = /\bdrop\s+trigger\s+(?:if\s+exists\s+)?("?[a-z_][\w$]*"?)\s+on\s+((?:"?[a-z_][\w$]*"?\.)?"?[a-z_][\w$]*"?)[^;]*;/gi;
  for (const match of sql.matchAll(dropTrigger)) {
    events.push({
      kind: 'trigger-drop',
      index: match.index,
      file,
      trigger: unquoteIdentifier(match[1]).toLowerCase(),
      table: normalizeQualifiedName(match[2]),
    });
  }

  return events.sort((left, right) => left.index - right.index);
}

function buildEffectiveState(inputMigrations) {
  const functions = new Map();
  const privileges = new Map();
  const triggers = new Map();

  for (const migration of inputMigrations) {
    for (const event of collectEvents(migration.file, migration.sql)) {
      if (event.kind === 'function-create') {
        functions.set(event.signature, event);
        if (!privileges.has(event.signature)) {
          privileges.set(event.signature, {
            public: true,
            anon: false,
            authenticated: false,
            evidenceFiles: new Set(),
          });
        }
        continue;
      }

      if (event.kind === 'function-alter') {
        const existing = functions.get(event.signature);
        if (!existing) continue;
        functions.set(event.signature, {
          ...existing,
          file: event.file,
          searchPath: event.hasSearchPathChange ? event.searchPath : existing.searchPath,
          securityDefiner: event.securityDefiner ?? existing.securityDefiner,
        });
        continue;
      }

      if (event.kind === 'function-drop') {
        functions.delete(event.signature);
        privileges.delete(event.signature);
        continue;
      }

      if (event.kind === 'privilege') {
        const existing = privileges.get(event.signature) ?? {
          public: true,
          anon: false,
          authenticated: false,
          evidenceFiles: new Set(),
        };
        const enabled = event.action === 'grant';
        for (const role of event.roles) {
          if (role === 'public' || role === 'anon' || role === 'authenticated') {
            existing[role] = enabled;
          }
        }
        existing.evidenceFiles.add(event.file);
        privileges.set(event.signature, existing);
        continue;
      }

      if (event.kind === 'trigger-drop') {
        triggers.delete(triggerKey(event.table, event.trigger));
        continue;
      }

      if (event.kind === 'trigger-create') {
        triggers.set(triggerKey(event.table, event.trigger), event);
      }
    }
  }

  return { functions, privileges, triggers };
}

const state = buildEffectiveState(migrations);
const repositoryFunctions = new Map(
  baseline.functions
    .filter((item) => item.repositoryExpected !== false)
    .map((item) => [item.signature.toLowerCase(), item]),
);
const repositoryAttachments = new Map(
  baseline.attachments
    .filter((item) => item.repositoryExpected !== false)
    .filter((item) => !tc01RetiredSafetyTriggerKeys.has(
      triggerKey(item.table.toLowerCase(), item.trigger.toLowerCase()),
    ))
    .map((item) => [
      triggerKey(item.table.toLowerCase(), item.trigger.toLowerCase()),
      item,
    ]),
);

test('parser applies comments, ALTER FUNCTION hardening, privilege changes, and drops in order', () => {
  const fixture = buildEffectiveState([
    {
      file: '001.sql',
      sql: `
        -- create function public.fake() returns trigger language plpgsql security definer as $$ begin return new; end $$;
        create function public.example()
          returns trigger language plpgsql security definer set search_path = public
        as $$ begin return new; end $$;
        create trigger example_trigger after insert on public.examples
          for each row execute function public.example();
      `,
    },
    {
      file: '002.sql',
      sql: `
        alter function public.example() set search_path = pg_catalog, pg_temp;
        drop trigger if exists example_trigger on public.examples;
        revoke all on function public.example() from public, anon, authenticated;
      `,
    },
  ]);

  assert.equal(fixture.functions.has('public.fake()'), false);
  assert.equal(fixture.functions.get('public.example()').searchPath, 'pg_catalog, pg_temp');
  assert.equal(fixture.triggers.size, 0);
  assert.deepEqual(
    {
      public: fixture.privileges.get('public.example()').public,
      anon: fixture.privileges.get('public.example()').anon,
      authenticated: fixture.privileges.get('public.example()').authenticated,
    },
    { public: false, anon: false, authenticated: false },
  );
});

test('baseline separates repository truth, live catalog observation, and behavior proof', () => {
  assert.equal(baseline.schemaVersion, 1);
  assert.equal(baseline.status, 'structural_only');
  assert.equal(baseline.projectRef, 'tbsevonvegdnlyjgplmm');
  assert.equal(baseline.inventorySource, 'read_only_live_pg_catalog');
  assert.equal(baseline.verification.liveCatalogObserved, true);
  assert.equal(baseline.verification.liveBehaviorVerified, false);
  assert.equal(baseline.verification.externalEffectsSafelyStubbed, false);
  assert.equal(baseline.functions.length, 14);
  assert.equal(repositoryFunctions.size, 13);
  assert.equal(baseline.attachments.length, 18);
  assert.equal(repositoryAttachments.size, 14);
});

test('TC-01 retired private and mixed safety triggers stay historical-only', () => {
  const historicalKeys = new Set(
    baseline.attachments.map((item) => triggerKey(item.table.toLowerCase(), item.trigger.toLowerCase())),
  );
  const expectedRetired = [
    'public.circle_posts::safety_scan_circle',
    'public.journal_entries::safety_scan_journal',
    'public.posts::safety_scan_posts',
  ];

  assert.deepEqual([...tc01RetiredSafetyTriggerKeys].sort(), expectedRetired);
  for (const key of expectedRetired) {
    assert.equal(historicalKeys.has(key), true, `${key} must remain preserved in historical live evidence`);
    assert.equal(state.triggers.has(key), false, `${key} must stay retired from effective repository wiring`);
  }

  const currentSafetyAttachments = [...state.triggers.values()]
    .filter((attachment) => attachment.function === 'public.trigger_safety_scan()')
    .map((attachment) => triggerKey(attachment.table, attachment.trigger))
    .sort();
  assert.deepEqual(currentSafetyAttachments, [
    'public.public_circle_posts::safety_scan_public_circle',
  ]);
});

test('live-only legacy points trigger drift is explicit and remains unresolved', () => {
  assert.deepEqual(baseline.catalogDrift.map((item) => item.kind), [
    'live_only_legacy_trigger_path',
  ]);
  const drift = baseline.catalogDrift[0];
  assert.equal(drift.status, 'open');
  assert.equal(drift.liveMigration, '20260704012007_award_points_for_app_actions');
  assert.equal(drift.function, 'public.award_points_for_app_activity()');
  assert.equal(drift.trigger, 'activity_events_award_points');
  assert.match(drift.repositoryCanonicalPath, /bip_events/);
  assert.match(drift.currentClientWriter, /bip_events only/);
  assert.match(drift.requiredResolution, /Do not mutate production/i);
});

test('all repository-defined public SECURITY DEFINER trigger functions are reviewed', () => {
  const discovered = [...state.functions.values()]
    .filter((definition) => definition.signature.startsWith('public.'))
    .filter((definition) => definition.securityDefiner)
    .map((definition) => definition.signature)
    .sort();
  const reviewed = [...repositoryFunctions.keys()].sort();

  assert.deepEqual(
    discovered,
    reviewed,
    `SECURITY DEFINER trigger inventory changed.\nDiscovered: ${discovered.join(', ')}\nReviewed: ${reviewed.join(', ')}`,
  );
});

test('reviewed repository trigger functions pin search_path and revoke client EXECUTE', () => {
  for (const [signature, reviewed] of repositoryFunctions) {
    const definition = state.functions.get(signature);
    assert.ok(definition, `missing migration definition for ${signature}`);
    assert.equal(definition.securityDefiner, true, `${signature} must remain SECURITY DEFINER`);
    assert.ok(definition.searchPath, `${signature} must pin search_path explicitly`);
    assert.equal(
      definition.searchPath,
      normalizeSearchPath(reviewed.searchPath),
      `${signature} search_path changed without baseline review`,
    );
    if (reviewed.deployedLive === false) {
      assert.equal(
        reviewed.clientExecuteRevokedLive,
        false,
        `${signature} is not deployed live; clientExecuteRevokedLive must not claim live verification`,
      );
      assert.ok(
        typeof reviewed.deploymentStatus === 'string' && reviewed.deploymentStatus.length > 0,
        `${signature} must document why it is not yet deployed live`,
      );
    } else {
      assert.equal(reviewed.clientExecuteRevokedLive, true);
    }

    const privilege = state.privileges.get(signature);
    assert.ok(privilege, `missing privilege state for ${signature}`);
    assert.equal(privilege.public, false, `${signature} is executable through PUBLIC`);
    assert.equal(privilege.anon, false, `${signature} is executable by anon`);
    assert.equal(privilege.authenticated, false, `${signature} is executable by authenticated`);
    assert.ok(privilege.evidenceFiles.size > 0, `${signature} lacks explicit privilege evidence`);
  }
});

test('reviewed repository trigger attachments match effective migration wiring', () => {
  for (const [key, reviewed] of repositoryAttachments) {
    const attachment = state.triggers.get(key);
    assert.ok(attachment, `missing effective trigger attachment ${key}`);
    assert.equal(attachment.function, reviewed.function.toLowerCase());
    assert.equal(attachment.timing, reviewed.timing);
    assert.deepEqual(attachment.events, reviewed.events);
    assert.equal(attachment.rowLevel, true, `${key} must remain FOR EACH ROW`);
  }

  for (const signature of repositoryFunctions.keys()) {
    const effective = [...state.triggers.values()]
      .filter((attachment) => attachment.function === signature)
      .map((attachment) => triggerKey(attachment.table, attachment.trigger))
      .sort();
    const reviewed = [...repositoryAttachments.entries()]
      .filter(([, attachment]) => attachment.function.toLowerCase() === signature)
      .map(([key]) => key)
      .sort();
    assert.deepEqual(effective, reviewed, `${signature} attachment set changed`);
  }
});

test('repository trigger wiring contains no duplicate effective side-effect path', () => {
  const tuples = new Map();
  for (const attachment of state.triggers.values()) {
    if (!repositoryFunctions.has(attachment.function)) continue;
    const tuple = [
      attachment.table,
      attachment.function,
      attachment.timing,
      [...attachment.events].sort().join('|'),
    ].join('::');
    const names = tuples.get(tuple) ?? [];
    names.push(attachment.trigger);
    tuples.set(tuple, names);
  }

  const duplicates = [...tuples.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([tuple, names]) => `${tuple} => ${names.sort().join(', ')}`)
    .sort();
  assert.deepEqual(duplicates, []);
});

test('the safety scanner retains the dynamic NEW-row regression fix', () => {
  const safetyFix = fs.readFileSync(
    path.join(migrationsRoot, '20260701030000_fix_trigger_safety_scan_dynamic_field_access.sql'),
    'utf8',
  );
  assert.match(safetyFix, /_row\s*:=\s*to_jsonb\(NEW\)/i);
  assert.match(safetyFix, /_content\s*:=\s*_row\s*->>\s*_col_name/i);
  assert.match(
    safetyFix,
    /coalesce\(_row\s*->>\s*'user_id',\s*_row\s*->>\s*'author_user_id'\)/i,
  );
  assert.doesNotMatch(safetyFix, /when\s+'text'\s+then\s+NEW\.text/i);
  assert.doesNotMatch(safetyFix, /when\s+'body'\s+then\s+NEW\.body/i);
});

test('SPRINT tracks structural, catalog, drift, and behavioral gates separately', () => {
  assert.match(sprint, /SECURITY DEFINER trigger assurance/i);
  assert.match(sprint, /structural migration-history coverage/i);
  assert.match(sprint, /read-only live catalog parity/i);
  assert.match(sprint, /external-effect-safe behavioral harness/i);
  assert.match(sprint, /zero retained synthetic rows/i);
  assert.match(sprint, /Do not mark trigger assurance verified/i);
});

test('trigger behavior phase 1 proves apply_point_transaction, handle_bip_event_points, enforce_circle_anonymity, and auto_resolve_issue_on_event_resolve', () => {
  const phase = baseline.behaviorProbePhases.find((entry) => entry.phase === 'trigger_behavior_phase1');
  assert.ok(phase, 'trigger_behavior_phase1 evidence is missing from the baseline');
  assert.equal(phase.transactionOutcome, 'rolled_back');
  assert.equal(phase.syntheticRowsRetained, 0);
  assert.equal(phase.failedChecks, 0);
  assert.ok(phase.passedChecks > 0);
  assert.ok(fs.existsSync(path.join(root, phase.probePath)), `${phase.probePath} must exist`);

  for (const signature of phase.coveredFunctions) {
    const reviewed = repositoryFunctions.get(signature.toLowerCase());
    assert.ok(reviewed, `${signature} must be a reviewed baseline function`);
    assert.equal(reviewed.behaviorVerified, true, `${signature} must be marked behaviorVerified`);
    assert.equal(reviewed.behaviorEvidence, 'trigger_behavior_phase1');
  }
});

test('trigger behavior phase 2 proves cleanup_crew_relationship_access and record_bridge_signal_activity', () => {
  const phase = baseline.behaviorProbePhases.find((entry) => entry.phase === 'trigger_behavior_phase2');
  assert.ok(phase, 'trigger_behavior_phase2 evidence is missing from the baseline');
  assert.equal(phase.transactionOutcome, 'rolled_back');
  assert.equal(phase.syntheticRowsRetained, 0);
  assert.equal(phase.failedChecks, 0);
  assert.ok(phase.passedChecks > 0);
  assert.ok(fs.existsSync(path.join(root, phase.probePath)), `${phase.probePath} must exist`);

  for (const signature of phase.coveredFunctions) {
    const reviewed = repositoryFunctions.get(signature.toLowerCase());
    assert.ok(reviewed, `${signature} must be a reviewed baseline function`);
    assert.equal(reviewed.behaviorVerified, true, `${signature} must be marked behaviorVerified`);
    assert.equal(reviewed.behaviorEvidence, 'trigger_behavior_phase2');
  }
});

test.todo(
  'run external-effect-safe rollback-contained behavior probes for the remaining safety and auth-profile triggers listed in trigger_behavior_phase2.notCoveredThisPhase',
);

import fs from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const findings = [];
const verifiedExceptions = [];

const SERVICE_ROLE_ONLY_TABLES = new Map([
  [
    'notification_deliveries',
    'Server-owned push delivery ledger. RLS is enabled and all table privileges are revoked from anon and authenticated in 20260704030000_harden_push_notifications.sql.',
  ],
]);

if (!fs.existsSync(migrationsDir)) {
  findings.push({
    source: 'rls_scan',
    severity: 'critical',
    event_type: 'rls_migrations_missing',
    screen: 'supabase/migrations',
    message: 'Supabase migrations directory is missing.',
    metadata: {},
  });
} else {
  const sql = fs.readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => fs.readFileSync(path.join(migrationsDir, name), 'utf8'))
    .join('\n');

  const tableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi;
  const tables = new Set();
  let match;
  while ((match = tableRegex.exec(sql))) tables.add(match[1]);

  const dynamicRlsLoop = /execute\s+format\(\s*'alter table public\.%I enable row level security;'/i.test(sql);
  const dynamicPolicyLoop = /execute\s+format\([\s\S]*?'create policy[\s\S]*?on public\.%I/i.test(sql);
  const dynamicTableNames = new Set();
  const arrayRegex = /select\s+unnest\s*\(\s*array\s*\[([\s\S]*?)\]\s*\)/gi;
  while ((match = arrayRegex.exec(sql))) {
    const quotedNames = match[1].match(/'([a-zA-Z0-9_]+)'/g) ?? [];
    for (const quotedName of quotedNames) dynamicTableNames.add(quotedName.slice(1, -1));
  }

  for (const table of tables) {
    const enablePattern = new RegExp(`alter\\s+table\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`, 'i');
    const policyPattern = new RegExp(`create\\s+policy[^;]*?on\\s+(?:public\\.)?${table}\\b`, 'i');
    const revokeClientPattern = new RegExp(
      `revoke\\s+all\\s+on\\s+table\\s+(?:public\\.)?${table}\\s+from\\s+anon\\s*,\\s*authenticated`,
      'i',
    );
    const coveredByDynamicLoop = dynamicTableNames.has(table);
    const rlsEnabled = enablePattern.test(sql) || (dynamicRlsLoop && coveredByDynamicLoop);
    const policyExists = policyPattern.test(sql) || (dynamicPolicyLoop && coveredByDynamicLoop);
    const exceptionRationale = SERVICE_ROLE_ONLY_TABLES.get(table);
    const verifiedServiceRoleOnly = Boolean(exceptionRationale && rlsEnabled && revokeClientPattern.test(sql));

    if (!rlsEnabled) {
      findings.push({
        source: 'rls_scan',
        severity: 'error',
        event_type: 'rls_not_enabled',
        screen: table,
        message: `Row-level security is not enabled for ${table}.`,
        metadata: { table },
      });
    } else if (!policyExists && verifiedServiceRoleOnly) {
      verifiedExceptions.push({
        table,
        classification: 'service_role_only',
        rationale: exceptionRationale,
      });
    } else if (!policyExists) {
      findings.push({
        source: 'rls_scan',
        severity: 'warning',
        event_type: 'rls_policy_missing',
        screen: table,
        message: `No RLS policy was found for ${table}.`,
        metadata: { table },
      });
    }
  }
}

const result = {
  scanner: 'control-room-rls-scan',
  scanned_at: new Date().toISOString(),
  ok: findings.every((item) => !['critical', 'error'].includes(item.severity)),
  finding_count: findings.length,
  findings,
  verified_exception_count: verifiedExceptions.length,
  verified_exceptions: verifiedExceptions,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;

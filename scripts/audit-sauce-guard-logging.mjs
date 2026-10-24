// Privacy egress guard for NEW logger sinks in trusted Bip code.
// The founder-owned Sauce Guard skill governs public communication; this
// deliberately narrow mechanical companion protects application / CI logs.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCOPED_FILE = /^(?:scripts|src|worker|app|supabase\/functions)\/.*\.(?:[cm]?js|tsx?)$/;
const SINK = /\b(?:console\.(?:log|info|warn|error|debug)|(?:logger|log)\.(?:log|info|warn|error|debug)|process\.(?:stdout|stderr)\.write)\s*\(/;
const FIXED_EVENT = /^\s*(?:console\.(?:log|info|warn|error|debug)|(?:logger|log)\.(?:log|info|warn|error|debug)|process\.(?:stdout|stderr)\.write)\s*\(\s*(['"])([A-Z][A-Z0-9_]{2,100})\1\s*\)\s*;?\s*$/;

export function auditAddedDiff(diff) {
  const findings = [];
  let file = null;
  let line = 0;
  for (const row of String(diff).split('\n')) {
    const source = row.match(/^\+\+\+ b\/(.+)$/);
    if (source) { file = source[1]; continue; }
    const hunk = row.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) { line = Number(hunk[1]); continue; }
    if (!file || !SCOPED_FILE.test(file) || !row.startsWith('+') || row.startsWith('+++')) continue;
    const added = row.slice(1);
    if (SINK.test(added) && !FIXED_EVENT.test(added)) {
      findings.push({ file, line, code: 'SAUCE_GUARD_DYNAMIC_LOG_SINK' });
    }
    line += 1;
  }
  return findings;
}

export function auditChangedLogging({ base, root = ROOT } = {}) {
  if (typeof base !== 'string' || !/^[a-f0-9]{40}$/i.test(base)) throw new Error('SAUCE_GUARD_BASE_INVALID');
  const diff = execFileSync('git', [
    'diff', '--unified=0', '--no-ext-diff', '--diff-filter=ACMRT',
    base, 'HEAD', '--', 'scripts', 'src', 'worker', 'app', 'supabase/functions',
  ], { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return auditAddedDiff(diff);
}

if (import.meta.main) {
  const arg = process.argv.slice(2).find((part) => part.startsWith('--base='));
  try {
    const findings = auditChangedLogging({ base: arg?.slice('--base='.length) });
    if (findings.length) {
      // Paths/line locations only. NEVER echo matching source lines or values.
      for (const finding of findings) process.exitCode = 1;
      console.error('SAUCE_GUARD_DYNAMIC_LOG_SINK_BLOCKED');
    } else {
      console.log('SAUCE_GUARD_CHANGED_LOGS_VERIFIED');
    }
  } catch {
    // Fail closed, and do not echo raw subprocess errors or potentially sensitive paths.
    console.error('SAUCE_GUARD_AUDIT_UNAVAILABLE');
    process.exitCode = 1;
  }
}

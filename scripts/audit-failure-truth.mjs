#!/usr/bin/env node
/**
 * audit-failure-truth.mjs
 *
 * Audits TypeScript/JavaScript source for catch blocks that signal success.
 * CLAUDE.md contract: "Do not show a success message or set a success flag
 * inside a catch block."
 *
 * Usage:
 *   node scripts/audit-failure-truth.mjs            # report only
 *   node scripts/audit-failure-truth.mjs --strict   # exit 1 on any violation
 *
 * Exceptions: register narrow, reasoned entries in config/failure-truth-allowlist.json.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, relative } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const STRICT = process.argv.includes('--strict');

// ── Load allowlist ────────────────────────────────────────────────────────────
let allowlist = [];
const allowlistPath = join(ROOT, 'config/failure-truth-allowlist.json');
if (existsSync(allowlistPath)) {
  try {
    allowlist = JSON.parse(readFileSync(allowlistPath, 'utf8')).exceptions ?? [];
  } catch (e) {
    console.error('audit-failure-truth: failed to parse allowlist:', e.message);
    process.exit(1);
  }
}

// ── Source file walker ────────────────────────────────────────────────────────
const SKIP = new Set(['node_modules', '.git', '.expo', 'dist', 'build', 'coverage']);
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function walk(dir, results = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, results);
    else if (EXTS.has(extname(name))) results.push(full);
  }
  return results;
}

// ── Violation detector ────────────────────────────────────────────────────────
// Scans line-by-line. Tracks catch-block depth.
// Flags any success signal emitted while inside a catch block.

const SUCCESS_LINE_PATTERNS = [
  { key: 'set-success-flag',   re: /\bsetSuccess\s*\(\s*true/,                   desc: 'setSuccess(true) inside catch' },
  { key: 'success-state-true', re: /\bisSuccess\s*=\s*true/,                     desc: 'isSuccess = true inside catch' },
  { key: 'success-prop-true',  re: /\bsuccess\s*:\s*true/,                       desc: 'success: true inside catch' },
  { key: 'status-success',     re: /\bstatus\s*[=:]\s*['"`]success['"`]/,        desc: 'status = "success" inside catch' },
  { key: 'show-success-toast', re: /\bshowSuccess\b|\btoastSuccess\b|\bsuccessToast\b/, desc: 'success toast/notification inside catch' },
  { key: 'result-ok-true',     re: /\{[^}]*ok\s*:\s*true[^}]*\}/,               desc: '{ ok: true } result inside catch' },
];

function detectViolations(file, src) {
  const lines = src.split('\n');
  const violations = [];
  let catchDepth = 0;
  let braceDepth = 0;
  let catchStartLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track entering a catch block
    if (/\bcatch\s*\(/.test(line)) {
      catchStartLine = i + 1;
    }

    // Count braces
    for (const ch of line) {
      if (ch === '{') {
        braceDepth++;
        if (catchStartLine === i + 1) catchDepth = braceDepth;
      } else if (ch === '}') {
        if (catchDepth > 0 && braceDepth === catchDepth) {
          catchDepth = 0;
          catchStartLine = -1;
        }
        braceDepth = Math.max(0, braceDepth - 1);
      }
    }

    // Only check lines inside a catch block
    if (catchDepth === 0) continue;

    for (const { key, re, desc } of SUCCESS_LINE_PATTERNS) {
      if (re.test(line)) {
        violations.push({ line: i + 1, key, desc, text: line.trim() });
      }
    }
  }

  return violations;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const files = walk(ROOT);
let totalViolations = 0;

for (const file of files) {
  const rel = relative(ROOT, file);
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }

  const violations = detectViolations(file, src);
  for (const v of violations) {
    const allowed = allowlist.some(e =>
      e.file === rel && e.line === v.line && e.key === v.key
    );
    if (allowed) continue;
    console.error(`VIOLATION ${rel}:${v.line} — ${v.desc}`);
    console.error(`  > ${v.text}`);
    totalViolations++;
  }
}

if (totalViolations === 0) {
  console.log('audit-failure-truth: PASS — no failure-truth violations found');
} else {
  console.error(`\naudit-failure-truth: FAIL — ${totalViolations} violation(s)`);
  console.error('Register narrow exceptions in config/failure-truth-allowlist.json');
}

process.exit(STRICT && totalViolations > 0 ? 1 : 0);

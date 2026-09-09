import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOTS = ['app', 'src', 'screens', 'hooks', 'services', 'worker', 'components'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.expo']);

const SUSPICIOUS_RULES = [
  {
    id: 'success-flag-in-catch',
    pattern: /\bset[A-Za-z0-9_]*(?:Success|Succeeded)\s*\(\s*true\s*\)/,
  },
  {
    id: 'success-status-in-catch',
    pattern: /\bset(?:Status|State)\s*\(\s*['"`](?:success|succeeded|saved|scheduled|done|complete|completed)['"`]\s*\)/i,
  },
  {
    id: 'success-object-in-catch',
    pattern: /\bsuccess\s*:\s*true\b/,
  },
  {
    id: 'success-message-in-catch',
    pattern: /\b(?:toast|showToast|notify|showMessage|Alert\.alert)\s*\([\s\S]{0,240}?['"`][^'"`]*(?:success|saved|scheduled|completed|reminder set|all set)[^'"`]*['"`]/i,
  },
];

const CLASSIFIERS = [
  ['failure', /\bthrow\b|\bset[A-Za-z0-9_]*Error\s*\(|\bset(?:Status|State)\s*\(\s*['"`](?:error|failed|failure)['"`]/i],
  ['truthful-fallback', /\breturn\s+(?:fallback|fallbackReply|createNaturalFallbackResponse|null|false|undefined)\b|\breplySource\s*:\s*['"`]fallback['"`]|\breportFallbackUsage\s*\(/i],
  ['verified-recovery', /\b(?:retry|recover|resume|reconnect|refresh)\w*\s*\(|\bawait\s+[^;]*(?:retry|recover|resume|reconnect|refresh)/i],
  ['telemetry-only', /\bconsole\.(?:warn|error)\s*\(|\blog[A-Za-z0-9_]*(?:Failure|Error|Fallback)\s*\(/i],
  ['explicit-result-failure', /\breturn\s+\{[\s\S]{0,180}?\bok\s*:\s*false\b/i],
];

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function findClosingBrace(source, openingIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openingIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function catchesIn(source) {
  const matches = [];
  const pattern = /\bcatch\s*(?:\([^)]*\))?\s*\{/g;
  let match;
  while ((match = pattern.exec(source))) {
    const openingIndex = source.indexOf('{', match.index);
    const closingIndex = findClosingBrace(source, openingIndex);
    if (closingIndex < 0) break;
    matches.push({
      start: match.index,
      line: lineNumber(source, match.index),
      endLine: lineNumber(source, closingIndex),
      body: source.slice(openingIndex + 1, closingIndex),
    });
    pattern.lastIndex = closingIndex + 1;
  }
  return matches;
}

function loadAllowlist(rootDir) {
  const file = path.join(rootDir, 'config', 'failure-truth-allowlist.json');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.entries)) {
    throw new Error('config/failure-truth-allowlist.json must use schemaVersion 1 with an entries array.');
  }
  for (const entry of parsed.entries) {
    if (!entry.path || !entry.contains || !entry.classification || !entry.reason) {
      throw new Error('Every failure-truth allowlist entry requires path, contains, classification, and reason.');
    }
  }
  return parsed.entries;
}

function matchingAllowlist(entries, relativePath, body) {
  return entries.find((entry) => entry.path === relativePath && body.includes(entry.contains));
}

function changedLineRanges(rootDir, changedSince) {
  // Compare commit trees directly so exact-head shallow checkouts do not need a merge base.
  const output = execFileSync(
    'git',
    [
      'diff',
      '--unified=0',
      '--no-ext-diff',
      '--no-renames',
      '--diff-filter=ACMR',
      changedSince,
      'HEAD',
      '--',
      ...ROOTS,
    ],
    {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  const rangesByPath = new Map();
  let currentPath = null;

  for (const line of output.split('\n')) {
    if (line.startsWith('+++ ')) {
      const marker = line.slice(4);
      currentPath = marker === '/dev/null'
        ? null
        : marker.startsWith('b/')
          ? marker.slice(2)
          : marker;
      continue;
    }

    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (!currentPath || !hunk) continue;

    const start = Math.max(1, Number(hunk[1]));
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    const end = count === 0 ? start : start + count - 1;
    const ranges = rangesByPath.get(currentPath) ?? [];
    ranges.push({ start, end });
    rangesByPath.set(currentPath, ranges);
  }

  return rangesByPath;
}

export function scopeFailureTruthFindings({
  rootDir = process.cwd(),
  findings,
  changedSince = null,
} = {}) {
  if (!Array.isArray(findings)) {
    throw new Error('scopeFailureTruthFindings requires a findings array.');
  }
  if (!changedSince) return findings;

  const rangesByPath = changedLineRanges(rootDir, changedSince);
  return findings.filter((finding) => {
    const ranges = rangesByPath.get(finding.path) ?? [];
    return ranges.some((range) => finding.line <= range.end && finding.endLine >= range.start);
  });
}

export function auditFailureTruth({ rootDir = process.cwd() } = {}) {
  const allowlist = loadAllowlist(rootDir);
  const findings = [];

  for (const root of ROOTS) {
    for (const absolutePath of walk(path.join(rootDir, root))) {
      const relativePath = path.relative(rootDir, absolutePath).replaceAll('\\', '/');
      const source = fs.readFileSync(absolutePath, 'utf8');
      const blocks = catchesIn(source);

      blocks.forEach((block, catchIndex) => {
        const suspiciousRules = SUSPICIOUS_RULES.filter((rule) => rule.pattern.test(block.body)).map((rule) => rule.id);
        const allowlisted = matchingAllowlist(allowlist, relativePath, block.body);
        const classifier = CLASSIFIERS.find(([, pattern]) => pattern.test(block.body));
        const classification = suspiciousRules.length > 0
          ? 'suspicious-success'
          : allowlisted?.classification ?? classifier?.[0] ?? 'needs-review';

        findings.push({
          path: relativePath,
          line: block.line,
          endLine: block.endLine,
          catchIndex,
          classification,
          suspiciousRules,
          allowlisted: Boolean(allowlisted),
          reason: allowlisted?.reason ?? null,
        });
      });
    }
  }

  return findings.sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line);
}

function parseArgs(argv) {
  return {
    strict: argv.includes('--strict'),
    changedSince: argv.find((value) => value.startsWith('--changed-since='))?.slice('--changed-since='.length)
      ?? null,
    report: argv.find((value) => value.startsWith('--report='))?.slice('--report='.length)
      ?? 'artifacts/failure-truth-report.json',
  };
}

function summarize(findings) {
  const suspicious = findings.filter((finding) => finding.classification === 'suspicious-success');
  const needsReview = findings.filter((finding) => finding.classification === 'needs-review');
  return {
    catchCount: findings.length,
    suspiciousSuccessCount: suspicious.length,
    needsReviewCount: needsReview.length,
    classifiedCount: findings.length - suspicious.length - needsReview.length,
    suspicious,
    needsReview,
  };
}

function main() {
  const rootDir = process.cwd();
  const { strict, changedSince, report } = parseArgs(process.argv.slice(2));
  const findings = auditFailureTruth({ rootDir });
  const gateFindings = scopeFailureTruthFindings({ rootDir, findings, changedSince });
  const inventory = summarize(findings);
  const gate = summarize(gateFindings);
  const reportPath = path.resolve(rootDir, report);

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      catchCount: inventory.catchCount,
      suspiciousSuccessCount: inventory.suspiciousSuccessCount,
      needsReviewCount: inventory.needsReviewCount,
      classifiedCount: inventory.classifiedCount,
    },
    gate: {
      mode: changedSince ? 'changed-lines' : 'full-repository',
      changedSince,
      catchCount: gate.catchCount,
      suspiciousSuccessCount: gate.suspiciousSuccessCount,
      needsReviewCount: gate.needsReviewCount,
      classifiedCount: gate.classifiedCount,
    },
    findings,
  }, null, 2)}\n`);

  if (gate.suspicious.length > 0 || (strict && gate.needsReview.length > 0)) {
    console.error('FAILURE_TRUTH_GATE_FAILED');
    for (const finding of [...gate.suspicious, ...(strict ? gate.needsReview : [])]) {
      console.error(`- ${finding.path}:${finding.line} ${finding.classification}${finding.suspiciousRules.length ? ` (${finding.suspiciousRules.join(', ')})` : ''}`);
    }
    console.error(`Report: ${path.relative(rootDir, reportPath)}`);
    process.exit(1);
  }

  console.log(
    `FAILURE_TRUTH_GATE_PASSED mode=${changedSince ? 'changed-lines' : 'full-repository'} `
      + `evaluated=${gate.catchCount} gate_needs_review=${gate.needsReviewCount} `
      + `inventory_catches=${inventory.catchCount} inventory_needs_review=${inventory.needsReviewCount}`,
  );
  console.log(`Report: ${path.relative(rootDir, reportPath)}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) main();

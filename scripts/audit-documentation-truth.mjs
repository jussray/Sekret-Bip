import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CONTRACTS = [
  { path: 'README.md', mode: 'durable' },
  { path: 'docs/CURRENT_STATUS.md', mode: 'durable' },
  { path: 'docs/DOCUMENTATION_MAP.md', mode: 'durable' },
  { path: 'docs/TRUTH_AUTHORITY.md', mode: 'durable' },
  { path: 'docs/LAUNCH_ROADMAP.md', mode: 'durable' },
  { path: 'docs/ISSUE_AUTHORITY.md', mode: 'durable' },
  { path: 'DEPLOYMENT.md', mode: 'durable' },
  { path: '.control-room/README_SYNC_POLICY.md', mode: 'durable' },
  { path: 'docs/WIRING_STATUS.md', mode: 'historical' },
  { path: 'SPRINT.md', mode: 'historical' },
];

const SHA_RE = /\b[0-9a-f]{40}\b/i;
const ISSUE_STATE_RE = /#\d+[^\n]{0,100}\b(?:is|remains|was)\s+(?:open|closed|completed|reopened)\b/i;
const VOLATILE_RUN_RE = /\b(?:current|latest|fresh)\b[^\n]{0,120}\b(?:run|attempt)\s*[#:]?\s*\d{6,}\b/i;
const VOLATILE_PROVIDER_RE = /\b(?:current|latest|fresh)\b[^\n]{0,160}\b(?:HTTP\s+\d{3}|provider code\s+\d+|intercepted|failed|passed|successful)\b/i;
const DATED_CURRENT_RE = /^#{1,4}\s+Current\b[^\n]*\b20\d{2}-\d{2}-\d{2}\b/i;

function markerFor(mode) {
  return `<!-- truth-mode: ${mode} -->`;
}

function linesOf(source) {
  return source.replaceAll('\r\n', '\n').split('\n');
}

function isHistoricalHeading(line) {
  return /^#{1,6}\s+Historical\b/i.test(line.trim());
}

function isSameOrHigherHeading(line, level) {
  const match = line.match(/^(#{1,6})\s+/);
  return Boolean(match) && match[1].length <= level;
}

function scanDurable(pathname, source) {
  const findings = [];
  const lines = linesOf(source);
  let historicalLevel = null;
  let inFence = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    const heading = trimmed.match(/^(#{1,6})\s+/);
    if (heading && historicalLevel !== null && isSameOrHigherHeading(trimmed, historicalLevel)) {
      historicalLevel = null;
    }
    if (isHistoricalHeading(trimmed)) {
      historicalLevel = heading?.[1]?.length ?? 2;
      return;
    }
    if (historicalLevel !== null) return;

    const lineNumber = index + 1;
    if (SHA_RE.test(line)) findings.push({ path: pathname, line: lineNumber, rule: 'durable-exact-sha' });
    if (ISSUE_STATE_RE.test(line)) findings.push({ path: pathname, line: lineNumber, rule: 'durable-issue-state' });
    if (VOLATILE_RUN_RE.test(line)) findings.push({ path: pathname, line: lineNumber, rule: 'durable-current-run' });
    if (VOLATILE_PROVIDER_RE.test(line)) findings.push({ path: pathname, line: lineNumber, rule: 'durable-current-provider-result' });
    if (DATED_CURRENT_RE.test(line)) findings.push({ path: pathname, line: lineNumber, rule: 'dated-current-heading' });
  });

  return findings;
}

export function auditDocumentationTruth({ rootDir = process.cwd(), contracts = CONTRACTS } = {}) {
  const findings = [];
  for (const contract of contracts) {
    const absolute = path.join(rootDir, contract.path);
    if (!fs.existsSync(absolute)) {
      findings.push({ path: contract.path, line: 0, rule: 'contract-file-missing' });
      continue;
    }
    const source = fs.readFileSync(absolute, 'utf8');
    const firstLines = linesOf(source).slice(0, 12).join('\n');
    if (!firstLines.includes(markerFor(contract.mode))) {
      findings.push({ path: contract.path, line: 1, rule: `missing-truth-mode-${contract.mode}` });
    }
    if (contract.mode === 'durable') {
      if (!/Live truth boundary/i.test(source)) {
        findings.push({ path: contract.path, line: 1, rule: 'missing-live-truth-boundary' });
      }
      findings.push(...scanDurable(contract.path, source));
    } else if (!/Historical snapshot/i.test(firstLines)) {
      findings.push({ path: contract.path, line: 1, rule: 'missing-historical-snapshot-banner' });
    }
  }
  return findings;
}

function parseArgs(argv) {
  return {
    report: argv.find((value) => value.startsWith('--report='))?.slice('--report='.length)
      ?? 'artifacts/documentation-truth-report.json',
  };
}

function main() {
  const rootDir = process.cwd();
  const { report } = parseArgs(process.argv.slice(2));
  const findings = auditDocumentationTruth({ rootDir });
  const reportPath = path.resolve(rootDir, report);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    contract: {
      durableDocsCarryInvariantsNotLiveStatus: true,
      exactHeadClaimsExpireWhenMainMoves: true,
      contradictoryNewEvidenceRevokesCurrentUse: true,
      liveIssueStateComesFromGitHubStateNotBodyCopy: true,
    },
    summary: { findingCount: findings.length },
    findings,
  }, null, 2)}\n`);

  if (findings.length > 0) {
    console.error('DOCUMENTATION_TRUTH_GATE_FAILED');
    for (const finding of findings) console.error(`- ${finding.path}:${finding.line} ${finding.rule}`);
    console.error(`Report: ${path.relative(rootDir, reportPath)}`);
    process.exit(1);
  }

  console.log('DOCUMENTATION_TRUTH_GATE_PASSED findings=0');
  console.log(`Report: ${path.relative(rootDir, reportPath)}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) main();

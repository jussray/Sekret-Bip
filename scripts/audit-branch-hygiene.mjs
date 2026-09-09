import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PROHIBITED_BRANCH = /(?:^|[-/])(?:v\d+|current-main|copy|backup|duplicate)(?:$|[-/])/i;
const DEFAULT_STALE_DAYS = 30;

function git(args, { rootDir, allowFailure = false } = {}) {
  const result = spawnSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  }
  return { status: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

function parseRemoteBranches(output) {
  return output.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [ref, committedAt, sha] = line.split('|');
      return { ref, committedAt, sha };
    })
    .filter((branch) => branch.ref && branch.ref !== 'origin/HEAD');
}

function ageDays(value, now = Date.now()) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.floor((now - timestamp) / 86_400_000) : null;
}

function isMergedIntoMain(rootDir, ref) {
  return git(['merge-base', '--is-ancestor', ref, 'origin/main'], { rootDir, allowFailure: true }).status === 0;
}

function currentHeadBranch(rootDir) {
  const fromEnvironment = process.env.GITHUB_HEAD_REF?.trim();
  if (fromEnvironment) return fromEnvironment;
  return git(['branch', '--show-current'], { rootDir }).stdout;
}

export function auditBranchHygiene({ rootDir = process.cwd(), staleDays = DEFAULT_STALE_DAYS } = {}) {
  const refs = git([
    'for-each-ref',
    '--format=%(refname:short)|%(committerdate:iso8601-strict)|%(objectname)',
    'refs/remotes/origin',
  ], { rootDir }).stdout;

  const headBranch = currentHeadBranch(rootDir);
  const branches = parseRemoteBranches(refs)
    .filter((branch) => branch.ref !== 'origin/main')
    .map((branch) => {
      const name = branch.ref.replace(/^origin\//, '');
      const merged = isMergedIntoMain(rootDir, branch.ref);
      const daysOld = ageDays(branch.committedAt);
      const prohibited = PROHIBITED_BRANCH.test(name);
      let classification = 'active-branch';

      if (name === headBranch) classification = 'current-mission-branch';
      else if (prohibited) classification = 'prohibited-versioned-or-duplicate';
      else if (merged) classification = 'merged-awaiting-cleanup';
      else if (daysOld !== null && daysOld >= staleDays) classification = 'stale-unmerged-review-required';

      return {
        name,
        ref: branch.ref,
        sha: branch.sha,
        committedAt: branch.committedAt,
        ageDays: daysOld,
        mergedIntoMain: merged,
        prohibitedName: prohibited,
        classification,
        deletionAuthorized: false,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  return { headBranch, branches };
}

function parseArgs(argv) {
  const staleValue = argv.find((value) => value.startsWith('--stale-days='));
  return {
    staleDays: staleValue ? Number(staleValue.slice('--stale-days='.length)) : DEFAULT_STALE_DAYS,
    strictHistory: argv.includes('--strict-history'),
    report: argv.find((value) => value.startsWith('--report='))?.slice('--report='.length)
      ?? 'artifacts/branch-hygiene-report.json',
  };
}

function main() {
  const rootDir = process.cwd();
  const { staleDays, strictHistory, report } = parseArgs(process.argv.slice(2));
  const audit = auditBranchHygiene({ rootDir, staleDays });
  const currentProhibited = PROHIBITED_BRANCH.test(audit.headBranch);
  const historicalDebt = audit.branches.filter((branch) =>
    branch.classification === 'prohibited-versioned-or-duplicate'
    || branch.classification === 'merged-awaiting-cleanup'
    || branch.classification === 'stale-unmerged-review-required');
  const reportPath = path.resolve(rootDir, report);

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    defaultBranch: 'main',
    currentBranch: audit.headBranch,
    policy: {
      oneLogicalChangeOneBranchOnePr: true,
      prohibitedPattern: PROHIBITED_BRANCH.source,
      staleDays,
      automaticDeletion: false,
    },
    summary: {
      branchCount: audit.branches.length,
      historicalDebtCount: historicalDebt.length,
      prohibitedNameCount: audit.branches.filter((branch) => branch.prohibitedName).length,
      mergedAwaitingCleanupCount: audit.branches.filter((branch) => branch.classification === 'merged-awaiting-cleanup').length,
      staleUnmergedCount: audit.branches.filter((branch) => branch.classification === 'stale-unmerged-review-required').length,
    },
    branches: audit.branches,
  }, null, 2)}\n`);

  if (currentProhibited || (strictHistory && historicalDebt.length > 0)) {
    console.error('BRANCH_HYGIENE_GATE_FAILED');
    if (currentProhibited) console.error(`- current branch uses a prohibited duplicate/version pattern: ${audit.headBranch}`);
    if (strictHistory) {
      for (const branch of historicalDebt) console.error(`- ${branch.name}: ${branch.classification}`);
    }
    console.error('No branch was deleted. Historical cleanup requires explicit review and founder approval.');
    process.exit(1);
  }

  console.log(`BRANCH_HYGIENE_GATE_PASSED current=${audit.headBranch} historical_debt=${historicalDebt.length}`);
  console.log(`Report: ${path.relative(rootDir, reportPath)}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) main();

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  auditFailureTruth,
  scopeFailureTruthFindings,
} from '../scripts/audit-failure-truth.mjs';
import { auditBranchHygiene } from '../scripts/audit-branch-hygiene.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function temporaryDirectory(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function initialiseRepository(root) {
  git(root, 'init', '-b', 'main');
  git(root, 'config', 'user.email', 'test@example.com');
  git(root, 'config', 'user.name', 'Repository Truth Test');
}

function commitAll(root, message) {
  git(root, 'add', '-A');
  git(root, 'commit', '-m', message);
}

function recordOriginMain(root) {
  const mainSha = git(root, 'rev-parse', 'HEAD');
  git(root, 'update-ref', 'refs/remotes/origin/main', mainSha);
  return mainSha;
}

test('failure truth flags a success state inside catch', () => {
  const root = temporaryDirectory('failure-truth-success');
  write(root, 'config/failure-truth-allowlist.json', '{"schemaVersion":1,"entries":[]}\n');
  write(root, 'src/reminder.ts', `
    export async function saveReminder() {
      try { await scheduleReminder(); }
      catch { setReminderSuccess(true); }
    }
  `);

  const findings = auditFailureTruth({ rootDir: root });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].classification, 'suspicious-success');
  assert.deepEqual(findings[0].suspiciousRules, ['success-flag-in-catch']);
});

test('failure truth accepts a truthful fallback Result path', () => {
  const root = temporaryDirectory('failure-truth-fallback');
  write(root, 'config/failure-truth-allowlist.json', '{"schemaVersion":1,"entries":[]}\n');
  write(root, 'src/reply.ts', `
    export async function reply() {
      try { return await sendReply(); }
      catch (error) {
        console.warn('reply failed', error);
        return fallbackReply();
      }
    }
  `);

  const findings = auditFailureTruth({ rootDir: root });
  assert.equal(findings.length, 1);
  assert.notEqual(findings[0].classification, 'suspicious-success');
  assert.ok(['truthful-fallback', 'telemetry-only'].includes(findings[0].classification));
});

test('allowlist entries require a concrete reason and marker', () => {
  const root = temporaryDirectory('failure-truth-allowlist');
  write(root, 'config/failure-truth-allowlist.json', '{"schemaVersion":1,"entries":[{"path":"src/a.ts"}]}\n');
  write(root, 'src/a.ts', 'try { run(); } catch { cleanup(); }\n');
  assert.throws(() => auditFailureTruth({ rootDir: root }), /requires path, contains, classification, and reason/);
});

test('changed-line scope ignores inherited needs-review debt outside the PR diff', () => {
  const root = temporaryDirectory('failure-truth-inherited');
  initialiseRepository(root);
  write(root, 'config/failure-truth-allowlist.json', '{"schemaVersion":1,"entries":[]}\n');
  write(root, 'src/inherited.ts', `
    export function inherited() {
      try { run(); }
      catch { cleanup(); }
    }
  `);
  write(root, 'README.md', '# fixture\n');
  commitAll(root, 'main fixture');
  recordOriginMain(root);

  git(root, 'checkout', '-b', 'fix/scoped-truth');
  write(root, 'README.md', '# fixture updated\n');
  commitAll(root, 'unrelated branch change');

  const findings = auditFailureTruth({ rootDir: root });
  const scoped = scopeFailureTruthFindings({
    rootDir: root,
    findings,
    changedSince: 'origin/main',
  });

  assert.equal(findings.filter((finding) => finding.classification === 'needs-review').length, 1);
  assert.deepEqual(scoped, []);
});

test('changed-line scope still catches suspicious success introduced inside an existing catch', () => {
  const root = temporaryDirectory('failure-truth-changed-catch');
  initialiseRepository(root);
  write(root, 'config/failure-truth-allowlist.json', '{"schemaVersion":1,"entries":[]}\n');
  write(root, 'src/reminder.ts', `
    export async function saveReminder() {
      try { await scheduleReminder(); }
      catch (error) {
        console.warn('schedule failed', error);
      }
    }
  `);
  commitAll(root, 'truthful main fixture');
  recordOriginMain(root);

  git(root, 'checkout', '-b', 'fix/introduce-false-success');
  write(root, 'src/reminder.ts', `
    export async function saveReminder() {
      try { await scheduleReminder(); }
      catch {
        setReminderSuccess(true);
      }
    }
  `);
  commitAll(root, 'introduce false success');

  const findings = auditFailureTruth({ rootDir: root });
  const scoped = scopeFailureTruthFindings({
    rootDir: root,
    findings,
    changedSince: 'origin/main',
  });

  assert.equal(scoped.length, 1);
  assert.equal(scoped[0].classification, 'suspicious-success');
});

test('changed-line scope works when exact head and main are fetched as shallow tips', () => {
  const source = temporaryDirectory('failure-truth-shallow-source');
  initialiseRepository(source);
  write(source, 'config/failure-truth-allowlist.json', '{"schemaVersion":1,"entries":[]}\n');
  write(source, 'src/reminder.ts', `
    export async function saveReminder() {
      try { await scheduleReminder(); }
      catch (error) {
        console.warn('schedule failed', error);
      }
    }
  `);
  commitAll(source, 'main fixture');

  git(source, 'checkout', '-b', 'fix/shallow-truth');
  write(source, 'src/reminder.ts', `
    export async function saveReminder() {
      try { await scheduleReminder(); }
      catch {
        setReminderSuccess(true);
      }
    }
  `);
  commitAll(source, 'branch fixture');

  const checkoutParent = temporaryDirectory('failure-truth-shallow-checkout');
  const checkout = path.join(checkoutParent, 'repo');
  execFileSync(
    'git',
    ['clone', '--depth=1', '--branch', 'fix/shallow-truth', `file://${source}`, checkout],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  git(checkout, 'fetch', '--depth=1', 'origin', 'main:refs/remotes/origin/main');
  assert.throws(
    () => git(checkout, 'merge-base', 'origin/main', 'HEAD'),
    /Command failed/,
  );

  const findings = auditFailureTruth({ rootDir: checkout });
  const scoped = scopeFailureTruthFindings({
    rootDir: checkout,
    findings,
    changedSince: 'origin/main',
  });

  assert.equal(scoped.length, 1);
  assert.equal(scoped[0].classification, 'suspicious-success');
});

test('repository truth workflow verifies PR and post-merge heads against the event base', () => {
  const workflow = fs.readFileSync(
    path.join(repositoryRoot, '.github/workflows/repository-truth-gate.yml'),
    'utf8',
  );

  assert.match(workflow, /pull_request:\n\s+branches: \[main\]/);
  assert.match(workflow, /push:\n\s+branches: \[main\]/);
  assert.match(
    workflow,
    /DIFF_BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \|\| github\.event\.before \|\| '' \}\}/,
  );
  assert.match(workflow, /BASE_SHA="\$DIFF_BASE_SHA"/);
  assert.match(workflow, /BASE_SHA="\$\(git rev-parse HEAD\^\)"/);
  assert.match(workflow, /node --check scripts\/audit-failure-truth\.mjs/);
  assert.match(
    workflow,
    /audit-failure-truth\.mjs --strict --changed-since=\$\{\{ steps\.verification_base\.outputs\.base_sha \}\} --report=/,
  );
  assert.match(
    workflow,
    /verify-implementation-ledger\.mjs --changed-since=\$\{\{ steps\.verification_base\.outputs\.base_sha \}\}/,
  );
});

test('branch hygiene classifies prohibited duplicate naming without deleting refs', () => {
  const root = temporaryDirectory('branch-hygiene');
  initialiseRepository(root);
  write(root, 'README.md', '# test\n');
  commitAll(root, 'initial');
  const mainSha = recordOriginMain(root);

  git(root, 'checkout', '-b', 'fix/reminder-v2');
  write(root, 'fix.txt', 'fix\n');
  commitAll(root, 'duplicate branch fixture');
  const branchSha = git(root, 'rev-parse', 'HEAD');
  git(root, 'update-ref', 'refs/remotes/origin/fix/reminder-v2', branchSha);

  const previousHeadRef = process.env.GITHUB_HEAD_REF;
  delete process.env.GITHUB_HEAD_REF;
  try {
    const audit = auditBranchHygiene({ rootDir: root, staleDays: 30 });
    assert.equal(audit.headBranch, 'fix/reminder-v2');
    const branch = audit.branches.find((entry) => entry.name === 'fix/reminder-v2');
    assert.ok(branch);
    assert.equal(branch.prohibitedName, true);
    assert.equal(branch.classification, 'current-mission-branch');
    assert.equal(branch.deletionAuthorized, false);
    assert.equal(git(root, 'rev-parse', 'refs/remotes/origin/fix/reminder-v2'), branchSha);
    assert.equal(git(root, 'rev-parse', 'refs/remotes/origin/main'), mainSha);
  } finally {
    if (previousHeadRef === undefined) delete process.env.GITHUB_HEAD_REF;
    else process.env.GITHUB_HEAD_REF = previousHeadRef;
  }
});

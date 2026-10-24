import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { auditAddedDiff } from '../scripts/audit-sauce-guard-logging.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const skill = 'founder-control-room/.agents/skills/sauce-guard/SKILL.md';

test('every active agent entry point binds founder Sauce Guard and current-you approval', () => {
  for (const path of ['AGENTS.md', 'AGENTS_FOUNDER_INTELLIGENCE.md', 'GLOBAL_AI.md', 'CLAUDE.md', 'CHATGPT.md', 'PERPLEXITY.md']) {
    const content = read(path);
    assert.ok(content.includes(skill), `${path} must reference canonical skill`);
    assert.ok(content.includes('Current You'), `${path} must preserve approval authority`);
    assert.ok(content.includes('provider readback'), `${path} must preserve publication proof`);
  }
});

test('CI runs Sauce Guard scanner over changed lines and holds errors', () => {
  const workflow = read('.github/workflows/repository-truth-gate.yml');
  assert.match(workflow, /scripts\/audit-sauce-guard-logging\.mjs --base=/);
  assert.match(workflow, /test\/sauce-guard-logging\.test\.mjs/);
  assert.doesNotMatch(workflow, /continue-on-error: true\s*\n\s*run: node scripts\/audit-sauce-guard-logging/);
});

test('fixed event log is allowed but arbitrary user, provider and secret content is blocked', () => {
  const mk = (line) => `diff --git a/scripts/example.mjs b/scripts/example.mjs\n+++ b/scripts/example.mjs\n@@ -1 +1 @@\n+${line}\n`;
  assert.equal(auditAddedDiff(mk("console.error('SAUCE_GUARD_REQUEST_FAILED');")).length, 0);
  for (const line of [
    'console.log(requestId);',
    'console.error(error.message);',
    'console.info(JSON.stringify(responseBody));',
    'logger.warn(userEmail);',
    'process.stderr.write(secretToken);',
    'console.log(`user=${userId}`);',
    'console.error(',
  ]) {
    assert.equal(auditAddedDiff(mk(line)).length, 1, line);
  }
});

test('rejects non-fixed literal logs; ignores unchanged and unrelated diffs', () => {
  const diff = "diff --git a/worker/auth.ts b/worker/auth.ts\n+++ b/worker/auth.ts\n@@ -11,2 +11,2 @@\n-console.log(userId);\n+console.log('request ok');\n";
  assert.equal(auditAddedDiff(diff).length, 1);
  const diffDocs = "diff --git a/docs/CHANGELOG.md b/docs/CHANGELOG.md\n+++ b/docs/CHANGELOG.md\n@@ -1 +1 @@\n+console.log(token)\n";
  assert.equal(auditAddedDiff(diffDocs).length, 0);
});

test('privileged scheduled deletion route prints only approved fixed event codes', () => {
  const source = read('scripts/sweep-account-deletions.mjs');
  for (const row of source.split('\n')) {
    if (/\bconsole\.(?:log|info|warn|error|debug)\s*\(/.test(row)) {
      assert.match(row, /console\.(?:log|error)\('SAUCE_GUARD_[A-Z0-9_]+'\)/);
    }
  }
  assert.doesNotMatch(source, /console\.[a-z]+\([^\n]*(?:requestId|result\.body|error\.message|response\.text)/);
});

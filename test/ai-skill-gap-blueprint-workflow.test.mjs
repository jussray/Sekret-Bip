import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, '..');
const workflowPath = path.join(
  repositoryRoot,
  '.ai-skills',
  'skills',
  'gap-blueprint-implement-review.md',
);

const workflow = fs.readFileSync(workflowPath, 'utf8');
const workflowAuthorityPaths = [
  'CLAUDE.md',
  'CHATGPT.md',
  'PERPLEXITY.md',
  '.cursor/rules',
  '.ai-skills/README.md',
  '.ai-skills/CLAUDE.md',
  '.ai-skills/chatgpt-custom-instructions.md',
  '.ai-skills/claude-project-instructions.md',
  '.ai-skills/custom-gpt-system-prompt.md',
  '.ai-skills/universal-commands.md',
  '.ai-skills/gpts/capability-mode-router.md',
  '.ai-skills/skills/capability-mode-router.md',
];

function assertInOrder(source, headings) {
  let previous = -1;

  for (const heading of headings) {
    const index = source.indexOf(heading);
    assert.notEqual(index, -1, `Missing workflow phase: ${heading}`);
    assert.ok(index > previous, `Workflow phase is out of order: ${heading}`);
    previous = index;
  }
}

test('gap workflow preserves the complete governed repair loop', () => {
  assertInOrder(workflow, [
    '## 1. GAPS',
    '## 2. BLUEPRINT',
    '## 3. RENT',
    '## 4. IMPLEMENT',
    '## 5. VERIFY',
    '## 6. REVIEW',
    '## 7. MERGE GATE',
    '## 8. CONTINUE',
  ]);

  for (const label of ['VERIFIED', 'INFERRED', 'UNKNOWN', 'BLOCKED']) {
    assert.match(workflow, new RegExp(`\\b${label}\\b`));
  }

  for (const classification of [
    'runner_startup_failure',
    'workflow_no_jobs',
    'workflow_step_failure',
  ]) {
    assert.match(workflow, new RegExp(classification));
  }
});

test('every workflow authority routes the governed repair stack to the canonical skill', () => {
  for (const relativePath of workflowAuthorityPaths) {
    const absolutePath = path.join(repositoryRoot, relativePath);
    assert.equal(fs.existsSync(absolutePath), true, `Missing workflow authority: ${relativePath}`);

    const authority = fs.readFileSync(absolutePath, 'utf8');
    assert.match(
      authority,
      /\.ai-skills\/skills\/gap-blueprint-implement-review\.md/,
      `${relativePath} does not reference the canonical governed workflow`,
    );
    assert.match(
      authority,
      /GAPS\s*→\s*BLUEPRINT\s*→\s*RENT\s*→\s*IMPLEMENT\s*→\s*VERIFY\s*→\s*REVIEW\s*→\s*MERGE GATE\s*→\s*CONTINUE/,
      `${relativePath} does not preserve the governed phase order`,
    );
  }
});

test('gap workflow fails closed on missing evidence and unsafe authority jumps', () => {
  assert.match(workflow, /failed lookup is `UNKNOWN`, never verified absence/i);
  assert.match(workflow, /Missing workflow runs are `UNKNOWN`, not `workflow_no_jobs`/i);
  assert.match(workflow, /Never claim a code regression without an executed failing step and logs/i);
  assert.match(workflow, /Playwright or device proof/i);
  assert.match(workflow, /Do not mutate production unless the exact authority layer explicitly permits it/i);
  assert.match(workflow, /Never merge merely because GitHub reports `mergeable: true`/i);
  assert.match(workflow, /the final head changes after verification and before merge/i);
});

test('gap workflow keeps rent and rollback evidence explicit', () => {
  assert.match(workflow, /Rent the mechanic, not its branding/i);
  assert.match(workflow, /compatible license and threat model/i);
  assert.match(workflow, /ROLLBACK/);
  assert.match(workflow, /NEXT GATE/);
  assert.match(workflow, /smallest reversible/i);
});

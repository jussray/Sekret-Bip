import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const contract = JSON.parse(readFileSync('config/founder-visual-authority.json', 'utf8'));

const authority = contract.visualAuthority;

test('founder remains the non-delegable visual authority', () => {
  assert.equal(contract.project, 'sekret-bip');
  assert.equal(authority.finalDecisionOwner, 'founder');
  assert.equal(authority.nonDelegable, true);
  assert.equal(
    authority.directionSource,
    'explicit founder-approved vision, prompt, or specification',
  );
});

test('Canva is reference-only and cannot override founder direction', () => {
  assert.equal(
    authority.canvaRole,
    'visual communication and editable reference only',
  );
  assert.match(authority.conflictRule, /lower layer must be corrected/i);
  assert.match(authority.conflictRule, /cannot override founder intent/i);
});

test('visual proof chain preserves founder precedence through runtime evidence', () => {
  assert.deepEqual(authority.precedence, [
    'founder',
    'founder-approved-direction',
    'canva-reference',
    'github-implementation',
    'playwright-runtime-proof',
  ]);
  assert.match(authority.githubRole, /machine-verifiable product contracts/i);
  assert.match(authority.runtimeProofRole, /exact-head browser evidence/i);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifySupabaseAssociation,
  selectLatestSupabaseCheck,
} from '../scripts/verify-supabase-check-association.mjs';

const SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const BIP_SUPABASE = 'tbsevonvegdnlyjgplmm';
const FOREIGN_SUPABASE = 'jvmbhralyktmdlvglrxk';

function supabaseCheck(overrides = {}) {
  return {
    id: 1,
    name: 'Supabase Preview',
    status: 'completed',
    conclusion: 'success',
    head_sha: SHA,
    started_at: '2026-09-13T23:00:00Z',
    completed_at: '2026-09-13T23:01:00Z',
    details_url: `https://supabase.com/dashboard/project/${BIP_SUPABASE}/branches`,
    output: {summary: ''},
    app: {slug: 'supabase', name: 'Supabase'},
    ...overrides,
  };
}

test('selects the latest exact-head Supabase Preview check', () => {
  const selected = selectLatestSupabaseCheck([
    supabaseCheck({id: 1, completed_at: '2026-09-13T23:01:00Z'}),
    supabaseCheck({id: 2, completed_at: '2026-09-13T23:02:00Z'}),
    supabaseCheck({id: 3, head_sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'}),
  ], SHA);
  assert.equal(selected.id, 2);
});

test('accepts canonical Supabase target when no disconnect is evidenced', () => {
  const receipt = classifySupabaseAssociation({run: supabaseCheck(), branch: 'main'});
  assert.equal(receipt.projectRef, BIP_SUPABASE);
  assert.equal(receipt.isProductionBranch, true);
  assert.equal(receipt.associationState, 'associated-or-not-explicitly-disconnected');
  assert.equal(receipt.disposition, 'verified');
  assert.equal(receipt.blockReason, null);
});

test('blocks a foreign Supabase project on every branch', () => {
  const receipt = classifySupabaseAssociation({
    run: supabaseCheck({details_url: `https://supabase.com/dashboard/project/${FOREIGN_SUPABASE}/branches`}),
    branch: 'feature/test',
  });
  assert.equal(receipt.projectRef, FOREIGN_SUPABASE);
  assert.equal(receipt.disposition, 'blocked');
  assert.equal(receipt.blockReason, 'supabase_project_mismatch');
});

test('blocks canonical production branch when provider says the git branch is unassociated', () => {
  const receipt = classifySupabaseAssociation({
    run: supabaseCheck({
      conclusion: 'skipped',
      output: {summary: 'This git branch is not associated with any Supabase Branch. You can open a PR to create a new branch.'},
    }),
    branch: 'main',
  });
  assert.equal(receipt.projectRef, BIP_SUPABASE);
  assert.equal(receipt.associationState, 'unassociated');
  assert.equal(receipt.disposition, 'blocked');
  assert.equal(receipt.blockReason, 'supabase_git_branch_unassociated');
});

test('records an unassociated feature preview separately without donating production authority', () => {
  const receipt = classifySupabaseAssociation({
    run: supabaseCheck({
      conclusion: 'skipped',
      output: {summary: 'This git branch is not associated with any Supabase Branch. You can open a PR to create a new branch.'},
    }),
    branch: 'fix/supabase-proof',
  });
  assert.equal(receipt.associationState, 'unassociated');
  assert.equal(receipt.disposition, 'informational');
  assert.equal(receipt.blockReason, null);
});

test('fails closed when the production Supabase check is missing', () => {
  const receipt = classifySupabaseAssociation({run: null, branch: 'main'});
  assert.equal(receipt.checkState, 'missing');
  assert.equal(receipt.disposition, 'blocked');
  assert.equal(receipt.blockReason, 'supabase_check_missing_on_main');
});

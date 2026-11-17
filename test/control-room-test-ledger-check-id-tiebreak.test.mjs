import assert from 'node:assert/strict';
import test from 'node:test';

import {selectLatestChecks} from '../scripts/control-room-test-ledger.mjs';

const SHA = '941b2b275c287de7a3c2c01a1cdbf9dcc6085051';
const BIP_SUPABASE = 'tbsevonvegdnlyjgplmm';
const FOREIGN_SUPABASE = 'jvmbhralyktmdlvglrxk';

function supabaseCheck(id, projectRef) {
  return {
    id,
    name: 'Supabase Preview',
    status: 'completed',
    conclusion: 'skipped',
    head_sha: SHA,
    started_at: '2026-09-13T17:12:58Z',
    completed_at: '2026-09-13T17:12:58Z',
    details_url: `https://supabase.com/dashboard/project/${projectRef}/branches`,
    app: {slug: 'supabase', name: 'Supabase'},
  };
}

test('breaks identical timestamp check-run ties by newer GitHub check id', () => {
  const checks = selectLatestChecks([
    supabaseCheck(103760224025, BIP_SUPABASE),
    supabaseCheck(103760221613, FOREIGN_SUPABASE),
  ], SHA);

  assert.equal(checks.length, 1);
  assert.equal(checks[0].id, '103760224025');
  assert.equal(checks[0].providerAuthority, 'canonical-target');
  assert.equal(checks[0].providerTarget, BIP_SUPABASE);
});

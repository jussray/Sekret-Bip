import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/isolated-supabase-worker-reply.yml', 'utf8');
const contract = readFileSync('integration/supabase-worker-ai-reply-contract.test.mjs', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const manifest = readFileSync('.control-room/repository.manifest.json', 'utf8');

test('integration reply contract has a real, independent always-on PR check', () => {
  assert.match(workflow, /^  pull_request:\s*$/m, 'must run on every PR to main');
  assert.match(workflow, /node --test integration\/supabase-worker-ai-reply-contract\.test\.mjs/);
  assert.match(workflow, /image: postgres:16/);
  assert.match(workflow, /postgrest\/postgrest@sha256:/);
  assert.match(workflow, /wrangler dev/);
  assert.match(workflow, /AI_REPLY_CONTRACT_ISOLATED_TEST_TARGET: "true"/);
  assert.doesNotMatch(workflow, /api\.sekretbip\.net|tbsevonvegdnlyjgplmm/);
  assert.equal(pkg.scripts['test:contract:supabase-worker'],
    'node --test integration/supabase-worker-ai-reply-contract.test.mjs');
  assert.match(manifest, /integration\/supabase-worker-ai-reply-contract\.test\.mjs/);
});

test('worker contract cannot skip or target production to obtain false green', () => {
  assert.match(contract, /Isolated Supabase\/Worker integration prerequisites are mandatory/);
  assert.match(contract, /local integration target must use HTTP on loopback/);
  assert.match(contract, /write-back must record reply-shape result/);
  assert.match(contract, /finally \{/);
  assert.doesNotMatch(contract, /\bt\.skip\s*\(|\btest\.skip\s*\(|\btest\.todo\s*\(/);
});

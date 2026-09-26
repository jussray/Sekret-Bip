import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECKOUT_SHA = '11d5960a326750d5838078e36cf38b85af677262';
const SETUP_NODE_SHA = '49933ea5288caeca8642d1e84afbd3f7d6820020';
const UPLOAD_ARTIFACT_SHA = 'ea165f8d65b6e75b540449e92b4886f43607fa02';
const SUPABASE_SETUP_SHA = 'ab058987d8d6c725971f6cf9d0b5c98467e30bd1';

function workflow(name) {
  return fs.readFileSync(path.join(repositoryRoot, '.github/workflows', name), 'utf8');
}

function occurrences(text, needle) {
  return text.split(needle).length - 1;
}

test('Repository Truth permanently enforces Supabase migration lineage with pinned actions', () => {
  const content = workflow('repository-truth-gate.yml');

  assert.match(content, new RegExp(`actions/checkout@${CHECKOUT_SHA}`));
  assert.match(content, /persist-credentials: false/);
  assert.match(content, new RegExp(`actions/setup-node@${SETUP_NODE_SHA}`));
  assert.match(content, new RegExp(`actions/upload-artifact@${UPLOAD_ARTIFACT_SHA}`));
  assert.match(content, /verify-supabase-migration-lineage\.mjs --base=\$\{\{ steps\.verification_base\.outputs\.base_sha \}\}/);
  assert.match(content, /MIGRATION_LINEAGE_OUTCOME: \$\{\{ steps\.migration_lineage\.outcome \}\}/);
  assert.match(content, /test "\$MIGRATION_LINEAGE_OUTCOME" = success/);
  assert.match(content, /supabase-migration-lineage\.json/);
  assert.doesNotMatch(content, /actions\/(?:checkout|setup-node|upload-artifact)@v\d+/);
});

test('Product Design proof treats migration changes as user-journey changes', () => {
  const content = workflow('product-design-playwright-proof.yml');

  assert.equal(occurrences(content, "- 'supabase/migrations/**'"), 1);
  assert.match(content, new RegExp(`actions/checkout@${CHECKOUT_SHA}`));
  assert.match(content, /persist-credentials: false/);
  assert.match(content, new RegExp(`actions/setup-node@${SETUP_NODE_SHA}`));
  assert.match(content, new RegExp(`actions/upload-artifact@${UPLOAD_ARTIFACT_SHA}`));
  assert.doesNotMatch(content, /actions\/(?:checkout|setup-node|upload-artifact)@v\d+/);
});

test('Supabase fresh replay uses immutable workflow dependencies and no checkout credential', () => {
  const content = workflow('supabase-fresh-replay.yml');

  assert.match(content, new RegExp(`actions/checkout@${CHECKOUT_SHA}`));
  assert.match(content, /persist-credentials: false/);
  assert.match(content, new RegExp(`supabase/setup-cli@${SUPABASE_SETUP_SHA}`));
  assert.match(content, /version: 2\.113\.0/);
  assert.doesNotMatch(content, /(?:actions\/checkout|supabase\/setup-cli)@v\d+/);
});

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { verifyCloudflareCredentialMigrationLineage } from '../scripts/verify-cloudflare-credential-migration-lineage.mjs';

function git(root, ...args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function writeJson(root, relativePath, value) {
  write(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function init() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudflare-credential-lineage-'));
  git(root, 'init', '-b', 'main');
  git(root, 'config', 'user.email', 'credential-lineage@example.com');
  git(root, 'config', 'user.name', 'Credential Lineage Test');
  return root;
}

function commit(root, message) {
  git(root, 'add', '-A');
  git(root, 'commit', '-m', message);
  return git(root, 'rev-parse', 'HEAD');
}

function workflow(...secrets) {
  return `name: fixture\njobs:\n  read:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo read-only\n        env:\n${secrets.map((secret) => `          ${secret}: \${{ secrets.${secret} }}`).join('\n')}\n`;
}

function bracketWorkflow(newSecret, previousSecret) {
  return `name: fixture\njobs:\n  read:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo read-only\n        env:\n          ${newSecret}: \${{ secrets['${newSecret}'] }}\n          ${previousSecret}: \${{ secrets.${previousSecret} }}\n`;
}

function stageReceipt(newSecret, previousSecrets = ['CLOUDFLARE_API_TOKEN']) {
  return {
    schema: 'juss/cloudflare-credential-migration@v1',
    newSecret,
    previousSecrets,
    phase: 'stage',
    secretStoreScope: 'GitHub Production',
    providerEvidence: null,
  };
}

function cutoverReceipt(newSecret, previousSecrets = ['CLOUDFLARE_API_TOKEN']) {
  return {
    schema: 'juss/cloudflare-credential-migration@v1',
    newSecret,
    previousSecrets,
    phase: 'cutover',
    secretStoreScope: 'GitHub Production',
    providerEvidence: {
      ref: 'https://github.com/jussray/Sekret-Bip/actions/runs/123456789',
      observedAt: '2026-10-01T08:30:00.000Z',
      providerAccepted: true,
      secretValueExposed: false,
    },
  };
}

function codes(result) {
  return result.violations.map((violation) => violation.code);
}

test('stage may introduce a dedicated credential only while previous authority remains', () => {
  const root = init();
  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_API_TOKEN'));
  const base = commit(root, 'base');

  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_PAGES_READ_API_TOKEN', 'CLOUDFLARE_API_TOKEN'));
  writeJson(root, '.github/credential-migrations/CLOUDFLARE_PAGES_READ_API_TOKEN.json', stageReceipt('CLOUDFLARE_PAGES_READ_API_TOKEN'));
  const head = commit(root, 'stage dedicated credential');

  const result = verifyCloudflareCredentialMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, true);
  assert.equal(result.workflowTransitionCount, 1);
});

test('bracket-style GitHub secret references cannot bypass the migration guard', () => {
  const root = init();
  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_API_TOKEN'));
  const base = commit(root, 'base');

  write(root, '.github/workflows/provider.yml', bracketWorkflow('CLOUDFLARE_ACCESS_API_TOKEN', 'CLOUDFLARE_API_TOKEN'));
  writeJson(root, '.github/credential-migrations/CLOUDFLARE_ACCESS_API_TOKEN.json', stageReceipt('CLOUDFLARE_ACCESS_API_TOKEN'));
  const head = commit(root, 'stage bracket credential');

  const result = verifyCloudflareCredentialMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, true);
  assert.equal(result.workflowTransitionCount, 1);
});

test('one-phase replacement fails even when a cutover receipt claims provider evidence', () => {
  const root = init();
  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_API_TOKEN'));
  const base = commit(root, 'base');

  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_PAGES_READ_API_TOKEN'));
  writeJson(root, '.github/credential-migrations/CLOUDFLARE_PAGES_READ_API_TOKEN.json', cutoverReceipt('CLOUDFLARE_PAGES_READ_API_TOKEN'));
  const head = commit(root, 'unsafe one phase replacement');

  const result = verifyCloudflareCredentialMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, false);
  assert.ok(codes(result).includes('credential-migration-cutover-not-staged-on-base'));
});

test('cutover passes only after the dedicated consumer already exists on the base and provider proof is retained', () => {
  const root = init();
  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_PAGES_READ_API_TOKEN', 'CLOUDFLARE_API_TOKEN'));
  writeJson(root, '.github/credential-migrations/CLOUDFLARE_PAGES_READ_API_TOKEN.json', stageReceipt('CLOUDFLARE_PAGES_READ_API_TOKEN'));
  const base = commit(root, 'staged base');

  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_PAGES_READ_API_TOKEN'));
  writeJson(root, '.github/credential-migrations/CLOUDFLARE_PAGES_READ_API_TOKEN.json', cutoverReceipt('CLOUDFLARE_PAGES_READ_API_TOKEN'));
  const head = commit(root, 'provider proven cutover');

  const result = verifyCloudflareCredentialMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, true);
});

test('stage fails if it removes the previous credential in the same candidate', () => {
  const root = init();
  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_API_TOKEN'));
  const base = commit(root, 'base');

  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_ACCESS_API_TOKEN'));
  writeJson(root, '.github/credential-migrations/CLOUDFLARE_ACCESS_API_TOKEN.json', stageReceipt('CLOUDFLARE_ACCESS_API_TOKEN'));
  const head = commit(root, 'unsafe stage');

  const result = verifyCloudflareCredentialMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, false);
  assert.ok(codes(result).includes('credential-migration-one-phase-removal'));
});

test('cutover without provider-backed acceptance fails closed', () => {
  const root = init();
  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_APP_BINDING_READ_API_TOKEN', 'CLOUDFLARE_API_TOKEN'));
  writeJson(root, '.github/credential-migrations/CLOUDFLARE_APP_BINDING_READ_API_TOKEN.json', stageReceipt('CLOUDFLARE_APP_BINDING_READ_API_TOKEN'));
  const base = commit(root, 'staged base');

  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_APP_BINDING_READ_API_TOKEN'));
  const invalid = cutoverReceipt('CLOUDFLARE_APP_BINDING_READ_API_TOKEN');
  invalid.providerEvidence.providerAccepted = false;
  writeJson(root, '.github/credential-migrations/CLOUDFLARE_APP_BINDING_READ_API_TOKEN.json', invalid);
  const head = commit(root, 'unproven cutover');

  const result = verifyCloudflareCredentialMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, false);
  assert.ok(codes(result).includes('credential-migration-provider-not-accepted'));
  assert.ok(codes(result).includes('credential-migration-cutover-receipt-missing'));
});

test('invalid inherited cutover metadata cannot authorize reuse on a later workflow', () => {
  const root = init();
  write(root, '.github/workflows/primary.yml', workflow('CLOUDFLARE_PAGES_READ_API_TOKEN'));
  write(root, '.github/workflows/secondary.yml', 'name: secondary\n');
  const invalid = cutoverReceipt('CLOUDFLARE_PAGES_READ_API_TOKEN');
  invalid.secretValue = 'must-never-authorize-reuse';
  writeJson(root, '.github/credential-migrations/CLOUDFLARE_PAGES_READ_API_TOKEN.json', invalid);
  const base = commit(root, 'invalid inherited receipt');

  write(root, '.github/workflows/secondary.yml', workflow('CLOUDFLARE_PAGES_READ_API_TOKEN'));
  const head = commit(root, 'attempt reuse from invalid receipt');

  const result = verifyCloudflareCredentialMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, false);
  assert.ok(codes(result).includes('credential-migration-receipt-unexpected-fields'));
  assert.ok(codes(result).includes('credential-migration-receipt-missing'));
});

test('removing a Cloudflare credential without a matching cutover receipt fails closed', () => {
  const root = init();
  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_PAGES_READ_API_TOKEN', 'CLOUDFLARE_API_TOKEN'));
  const base = commit(root, 'base');

  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_PAGES_READ_API_TOKEN'));
  const head = commit(root, 'remove old credential without receipt');

  const result = verifyCloudflareCredentialMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, false);
  assert.ok(codes(result).includes('credential-migration-cutover-receipt-missing'));
});

test('a previously provider-proven dedicated credential may be added to another workflow without fabricating a new migration', () => {
  const root = init();
  write(root, '.github/workflows/primary.yml', workflow('CLOUDFLARE_PAGES_READ_API_TOKEN'));
  write(root, '.github/workflows/secondary.yml', 'name: secondary\n');
  writeJson(root, '.github/credential-migrations/CLOUDFLARE_PAGES_READ_API_TOKEN.json', cutoverReceipt('CLOUDFLARE_PAGES_READ_API_TOKEN'));
  const base = commit(root, 'proven base');

  write(root, '.github/workflows/secondary.yml', workflow('CLOUDFLARE_PAGES_READ_API_TOKEN'));
  const head = commit(root, 'reuse proven credential');

  const result = verifyCloudflareCredentialMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, true);
});

test('receipt schema rejects arbitrary fields that could smuggle a secret value into source', () => {
  const root = init();
  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_API_TOKEN'));
  const base = commit(root, 'base');

  write(root, '.github/workflows/provider.yml', workflow('CLOUDFLARE_ACCESS_API_TOKEN', 'CLOUDFLARE_API_TOKEN'));
  const receipt = stageReceipt('CLOUDFLARE_ACCESS_API_TOKEN');
  receipt.secretValue = 'must-never-be-committed';
  writeJson(root, '.github/credential-migrations/CLOUDFLARE_ACCESS_API_TOKEN.json', receipt);
  const head = commit(root, 'unsafe receipt');

  const result = verifyCloudflareCredentialMigrationLineage({ rootDir: root, baseRef: base, headRef: head });
  assert.equal(result.verified, false);
  assert.ok(codes(result).includes('credential-migration-receipt-unexpected-fields'));
});

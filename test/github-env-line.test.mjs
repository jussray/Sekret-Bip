import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { githubEnvLine } from '../scripts/github-env-line.mjs';

test('single-line values format as NAME=value', () => {
  assert.equal(githubEnvLine('LIVE_ONBOARDING_EMAIL', 'teen@example.test'), 'LIVE_ONBOARDING_EMAIL=teen@example.test\n');
  assert.equal(githubEnvLine('LIVE_MAILTM_ACCOUNT_ID', 42), 'LIVE_MAILTM_ACCOUNT_ID=42\n');
});

test('provider values with CR or LF cannot inject extra GITHUB_ENV variables', () => {
  assert.throws(() => githubEnvLine('LIVE_ONBOARDING_EMAIL', 'a@x.test\nNODE_OPTIONS=--require=/tmp/x'), /multi-line/);
  assert.throws(() => githubEnvLine('LIVE_MAILTM_TOKEN', 'tok\r\nEVIL=1'), /multi-line/);
});

test('variable names are restricted to upper-case identifiers', () => {
  assert.throws(() => githubEnvLine('bad name', 'x'), /Invalid GITHUB_ENV name/);
  assert.throws(() => githubEnvLine('A=B', 'x'), /Invalid GITHUB_ENV name/);
});

test('live signup mailbox routes every GITHUB_ENV write through the guard', () => {
  const source = fs.readFileSync(new URL('../scripts/live-signup-mailbox.mjs', import.meta.url), 'utf8');
  assert.match(source, /import \{ githubEnvLine \} from '\.\/github-env-line\.mjs';/);
  assert.match(source, /fs\.appendFileSync\(envFile, githubEnvLine\(name, value\), 'utf8'\)/);
  assert.equal((source.match(/appendFileSync/g) || []).length, 1, 'no unguarded GITHUB_ENV append may exist');
});

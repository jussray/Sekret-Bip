import assert from 'node:assert/strict';
import {chmodSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

const script = 'scripts/configure-codex-cloudflare-mcp.mjs';

function fakeCodex(source) {
  const directory = mkdtempSync(join(tmpdir(), 'bip-codex-mcp-'));
  const executable = join(directory, 'codex');
  writeFileSync(executable, source);
  chmodSync(executable, 0o755);
  return {directory, executable};
}

test('adds every missing Cloudflare server without placing a token value in arguments', () => {
  const {directory, executable} = fakeCodex(`#!/bin/sh
echo "$*" >> "$CALL_LOG"
[ "$1" = "--version" ] && exit 0
[ "$1 $2" = "mcp get" ] && exit 1
[ "$1 $2" = "mcp add" ] && exit 0
exit 2
`);
  const callLog = join(directory, 'calls');
  const result = spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: {...process.env, CODEX_BIN: executable, CALL_LOG: callLog},
  });

  assert.equal(result.status, 0, result.stderr);
  const calls = readFileSync(callLog, 'utf8');
  assert.match(calls, /mcp add cloudflare --url https:\/\/mcp\.cloudflare\.com\/mcp --bearer-token-env-var CLOUDFLARE_API_TOKEN/);
  assert.match(calls, /mcp add cloudflare-observability --url https:\/\/observability\.mcp\.cloudflare\.com\/mcp/);
  assert.equal((calls.match(/^mcp add /gm) ?? []).length, 5);
  assert.doesNotMatch(calls, /Bearer\s+|cfpat-|token=/i);
});

test('does not overwrite an existing mismatched server', () => {
  const {directory, executable} = fakeCodex(`#!/bin/sh
echo "$*" >> "$CALL_LOG"
[ "$1" = "--version" ] && exit 0
if [ "$1 $2 $3" = "mcp get cloudflare" ]; then
  echo "url: https://unexpected.example/mcp"
  echo "bearer_token_env_var: -"
  exit 0
fi
[ "$1 $2" = "mcp get" ] && exit 1
[ "$1 $2" = "mcp add" ] && exit 0
exit 2
`);
  const callLog = join(directory, 'calls');
  const result = spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: {...process.env, CODEX_BIN: executable, CALL_LOG: callLog},
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /already exists with different settings/);
  assert.doesNotMatch(readFileSync(callLog, 'utf8'), /mcp add cloudflare --/);
});

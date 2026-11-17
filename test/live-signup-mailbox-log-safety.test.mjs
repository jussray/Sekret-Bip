import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../scripts/live-signup-mailbox.mjs', import.meta.url), 'utf8');
// CI log lines and thrown error messages both surface in workflow logs.
const outputLines = source.split('\n').filter((line) => line.includes('console.log(') || line.includes('Error('));

test('live signup mailbox never prints signup identifiers to CI logs', () => {
  for (const identifier of ['${address}', '${username}', '${confirmationHost}', '${redirectHost', '${OWNED_BIP_ADDRESS}']) {
    const offending = outputLines.filter((line) => line.includes(identifier));
    assert.deepEqual(offending, [], `log or error output must not interpolate ${identifier}`);
  }
});

test('live signup mailbox still records identifiers in its proof artifacts', () => {
  assert.match(source, /writeJson\('live-signup-proof-account\.json'/);
  assert.match(source, /writeJson\('live-signup-confirmation\.json'/);
});

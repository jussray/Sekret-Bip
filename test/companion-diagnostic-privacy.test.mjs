import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

for (const [path, count] of [
  ['src/utils/sekretReply.ts', 6],
  ['src/services/ai/chat.ts', 5],
]) {
  test(path + ' emits only fixed diagnostic event codes', () => {
    const source = fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    const logs = source.split('\n').filter(line => /console\.(log|warn|error)\(/.test(line));
    assert.equal(logs.length, count);
    for (const line of logs) {
      assert.match(line, /^\s*console\.(log|warn|error)\('[A-Z][A-Z0-9_]{2,100}'\);\s*$/);
    }
  });
}

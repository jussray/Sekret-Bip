import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const targets = [
  ['src/services/accountDeletion.ts', 3],
  ['src/services/pushAlerts.ts', 1],
  ['src/components/shared/NotificationBootstrap.tsx', 4],
];

for (const [path, expected] of targets) {
  test(path + ' emits only fixed diagnostic messages without provider or device data', () => {
    const source = fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    const logs = source.split('\n').filter((line) => line.includes('console.info('));
    assert.equal(logs.length, expected, 'preserve diagnostic events');
    for (const log of logs) {
      assert.match(log, /^\s*(?:if \(__DEV__\) )?console\.info\('[A-Z][A-Z0-9_]{2,100}'\);\s*$/);
    }
  });
}

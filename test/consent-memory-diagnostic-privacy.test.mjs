import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const targets = [
  [
    "services/sekretMemory.ts",
    2
  ],
  [
    "src/features/consent/consentLayer.ts",
    2
  ],
  [
    "services/consentService.ts",
    1
  ],
  [
    "src/services/consentService.ts",
    1
  ],
  [
    "supabase/functions/parent-link-create/index.ts",
    2
  ],
  [
    "supabase/functions/parent-link-revoke/index.ts",
    1
  ],
  [
    "src/services/userReports.ts",
    1
  ]
];

for (const [path, count] of targets) {
  test(path + ' uses privacy-safe fixed diagnostic events', () => {
    const source = fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    const logs = source.split('\n').filter(line => /console\.(?:warn|error)\(/.test(line));
    assert.equal(logs.length, count);
    for (const line of logs) {
      assert.match(line, /^\s*(?:if \(__DEV__\) )?console\.(?:warn|error)\((?:'[A-Z][A-Z0-9_]{2,100}'|"[A-Z][A-Z0-9_]{2,100}")\);\s*$/);
    }
  });
}

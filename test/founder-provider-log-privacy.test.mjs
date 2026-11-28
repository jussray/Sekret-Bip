import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const targets = [
  ['src/services/issueNormalizer.ts', 'ISSUE_NORMALIZER_', 8],
  ['src/services/founderIdeas.ts', 'FOUNDER_IDEAS_', 6],
];

for (const [path, prefix, count] of targets) {
  test(path + ' logs fixed events without raw provider errors or user input', () => {
    const source = fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    const warnings = source.split('\n').filter(line => line.includes('console.warn('));
    assert.equal(warnings.filter(line => line.includes("'" + prefix)).length, count);
    for (const line of warnings) {
      assert.match(line, /^\s*console\.warn\('[^']+'\);\s*$/);
      if (line.includes("'" + prefix)) assert.match(line, /^\s*console\.warn\('[A-Z][A-Z0-9_]{2,100}'\);\s*$/);
    }
  });
}

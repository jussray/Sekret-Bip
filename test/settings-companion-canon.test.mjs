import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const teen = fs.readFileSync(new URL('../app/(teen)/settings.tsx', import.meta.url), 'utf8');
const parent = fs.readFileSync(new URL('../app/(parent)/settings.tsx', import.meta.url), 'utf8');

for (const [surface, source] of [['teen', teen], ['parent', parent]]) {
  test(`${surface} settings show canonical companion names`, () => {
    assert.match(source, /key: 'soft', name: 'Suhana'/);
    assert.match(source, /key: 'rylane', name: 'Sy'/);
    assert.doesNotMatch(source, /name: 'Raylene'|name: 'Rylane'/);
  });

  test(`${surface} settings preserve compatibility keys and accessible selection state`, () => {
    assert.match(source, /key: 'soft'/);
    assert.match(source, /key: 'rylane'/);
    assert.match(source, /accessibilityLabel=\{`Choose \$\{companion\.name\}, \$\{companion\.title\}`\}/);
    assert.match(source, /accessibilityState=\{\{ selected: selectedSekret === companion\.key \}\}/);
  });
}

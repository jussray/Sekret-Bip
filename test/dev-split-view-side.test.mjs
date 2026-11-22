import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/utils/devSplitViewSide.ts', 'utf8');
const fnBody = source.slice(source.indexOf('export function getDevSplitViewSideOverride'));

test('dev split-view side override is only read in dev builds, before the URL', () => {
  const devGate = fnBody.indexOf('!__DEV__');
  assert.notEqual(devGate, -1, 'override must be gated on __DEV__');
  assert.ok(devGate < fnBody.indexOf('window.location'), '__DEV__ gate must run before reading the URL');
});

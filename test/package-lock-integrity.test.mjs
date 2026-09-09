import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

const dependencyGroups = [
  ['dependencies', manifest.dependencies ?? {}],
  ['devDependencies', manifest.devDependencies ?? {}],
  ['optionalDependencies', manifest.optionalDependencies ?? {}],
];

test('package lock root matches every direct manifest dependency', () => {
  const lockRoot = lock.packages?.[''];
  assert.ok(lockRoot, 'package-lock.json must contain the root package entry');

  for (const [groupName, dependencies] of dependencyGroups) {
    const lockedGroup = lockRoot[groupName] ?? {};
    for (const [name, version] of Object.entries(dependencies)) {
      assert.equal(
        lockedGroup[name],
        version,
        `${groupName}.${name} must match package.json`,
      );
    }
  }
});

test('every direct dependency has a concrete installed-package lock entry', () => {
  for (const [groupName, dependencies] of dependencyGroups) {
    for (const name of Object.keys(dependencies)) {
      const packagePath = `node_modules/${name}`;
      assert.ok(
        lock.packages?.[packagePath],
        `${groupName}.${name} is declared but ${packagePath} is missing from package-lock.json`,
      );
    }
  }
});

test('React Native URL polyfill remains installable in clean Expo builds', () => {
  assert.equal(manifest.dependencies?.['react-native-url-polyfill'], '^2.0.0');
  assert.equal(lock.packages?.['node_modules/react-native-url-polyfill']?.version, '2.0.0');
  assert.equal(
    lock.packages?.['node_modules/react-native-url-polyfill']?.dependencies?.['whatwg-url-without-unicode'],
    '8.0.0-3',
  );
  assert.ok(lock.packages?.['node_modules/whatwg-url-without-unicode']);
});

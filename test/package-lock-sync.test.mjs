import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [packageJson, packageLock] = await Promise.all([
  readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../package-lock.json', import.meta.url), 'utf8').then(JSON.parse),
]);

const lockRoot = packageLock.packages?.[''];

function declared(section, source) {
  return source?.[section] ?? {};
}

test('package-lock root dependency declarations stay aligned with package.json', () => {
  assert.ok(lockRoot, 'package-lock.json must contain a root packages[""] entry');

  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    assert.deepStrictEqual(
      declared(section, lockRoot),
      declared(section, packageJson),
      `${section} drifted between package.json and package-lock.json; regenerate the lockfile before merging`,
    );
  }
});

test('package-lock root identity stays aligned with package.json', () => {
  assert.equal(packageLock.name, packageJson.name);
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(lockRoot.name, packageJson.name);
  assert.equal(lockRoot.version, packageJson.version);
});

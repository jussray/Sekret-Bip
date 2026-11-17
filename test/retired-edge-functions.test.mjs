import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = path.join(root, 'supabase', 'functions', 'retirement-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const executableRoots = [
  '.github',
  'app',
  'components',
  'screens',
  'scripts',
  'src',
  'worker',
  'supabase/functions',
].map((relativePath) => path.join(root, relativePath));

const executableFiles = executableRoots
  .flatMap(walk)
  .filter((filePath) => /\.(?:ts|tsx|js|mjs|cjs|yml|yaml|json)$/.test(filePath));

test('retirement manifest requires JWT and HTTP 410 for all obsolete functions', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(
    manifest.functions.map((item) => item.slug).sort(),
    ['bridge-e2e-probe', 'github-workflow-status', 'release-health'],
  );

  for (const item of manifest.functions) {
    assert.equal(item.verifyJwt, true, `${item.slug} must require platform JWT verification`);
    assert.equal(item.expectedStatus, 410, `${item.slug} must remain retired`);
    assert.equal(typeof item.replacement, 'string');
    assert.equal(item.replacement.length > 0, true);
    assert.equal(fs.existsSync(path.join(root, item.sourcePath)), true);
  }
});

for (const item of manifest.functions) {
  test(`${item.slug} is a side-effect-free retirement response`, () => {
    const source = fs.readFileSync(path.join(root, item.sourcePath), 'utf8');
    assert.match(source, /function_retired/);
    assert.match(source, new RegExp(`function:\\s*['\"]${item.slug}['\"]`));
    assert.match(source, /status:\s*410/);
    assert.match(source, /cache-control['"]?:\s*['"]no-store['"]/i);
    assert.doesNotMatch(source, /createClient|SUPABASE_SERVICE_ROLE_KEY|Deno\.env|get\s*\(|fetch\s*\(/);
    assert.doesNotMatch(source, /\.from\s*\(|\.rpc\s*\(|insert\s*\(|update\s*\(|delete\s*\(/);
  });
}

test('no executable caller references retired function slugs', () => {
  const allowedSources = new Set(
    manifest.functions.map((item) => path.normalize(path.join(root, item.sourcePath))),
  );
  const violations = [];

  for (const filePath of executableFiles) {
    if (allowedSources.has(path.normalize(filePath))) continue;
    if (path.normalize(filePath) === path.normalize(manifestPath)) continue;
    if (filePath.endsWith('test/retired-edge-functions.test.mjs')) continue;

    const source = fs.readFileSync(filePath, 'utf8');
    for (const item of manifest.functions) {
      if (source.includes(item.slug)) {
        violations.push(`${path.relative(root, filePath)} references ${item.slug}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

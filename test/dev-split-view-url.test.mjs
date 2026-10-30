import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Test the real pure TypeScript helper with no Node-specific type-stripping flags.
const source = readFileSync(new URL('../src/utils/devSplitViewUrl.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
runInNewContext(compiled, { exports, URL });
const { withDevSide } = exports;

test('split-view panes preserve internal routes and pin the assigned side', () => {
  assert.equal(withDevSide('/', 'teen'), '/?bipDevSide=teen');
  assert.equal(withDevSide('/dashboard', 'parent'), '/dashboard?bipDevSide=parent');
  assert.equal(
    withDevSide('/dashboard?tab=one#reports', 'parent'),
    '/dashboard?tab=one&bipDevSide=parent#reports',
  );
});

test('caller-supplied side parameters cannot replace the assigned pane', () => {
  const href = withDevSide('/bridge?bipDevSide=teen&x=1&bipDevSide=teen', 'parent');
  const url = new URL(href, 'https://split-view.invalid');
  assert.equal(url.pathname, '/bridge');
  assert.deepEqual(url.searchParams.getAll('bipDevSide'), ['parent']);
  assert.equal(url.searchParams.get('x'), '1');
});

test('external and script-like destinations are replaced with a safe internal fallback', () => {
  for (const unsafe of [
    'https://another.example/path',
    'javascript:alert(1)',
    '//another.example',
    '///another.example',
    '/\\another.example',
    'https:%2f%2fanother.example',
    '/dashboard\n<script>',
    'relative/path',
    '',
  ]) {
    assert.equal(withDevSide(unsafe, 'parent'), '/dashboard?bipDevSide=parent', unsafe);
  }
  assert.equal(withDevSide('//another.example', 'teen'), '/?bipDevSide=teen');
});

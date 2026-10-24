import assert from 'node:assert/strict';
import test from 'node:test';

import { withDevSide } from '../src/utils/devSplitViewUrl.ts';

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

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const layout = readFileSync('app/(teen)/_layout.tsx', 'utf8');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('Teen bottom navigation exposes exactly the five founder-approved destinations', () => {
  const visible = [...layout.matchAll(/<Tabs\.Screen name="([^"]+)" options=\{\{ title:/g)]
    .map(match => match[1]);

  assert.deepEqual(
    visible,
    ['room', 'pages', 'calm', 'circle', 'more'],
    `unexpected visible Teen tabs: ${visible.join(', ')}`,
  );
});

test('Circle child routes stay reachable without leaking into the Teen tab bar', () => {
  const childRoutes = readdirSync('app/(teen)/circle')
    .filter(name => name.endsWith('.tsx') && name !== 'index.tsx')
    .map(name => `circle/${name.replace(/\.tsx$/, '')}`)
    .sort();

  for (const route of childRoutes) {
    const hiddenRegistration = new RegExp(
      `<Tabs\\.Screen name="${escapeRegExp(route)}" options=\\{\\{ href: null \\}\\} \\/>`,
    );

    assert.match(
      layout,
      hiddenRegistration,
      `${route} must remain hidden from the five-item Teen tab bar`,
    );
  }
});

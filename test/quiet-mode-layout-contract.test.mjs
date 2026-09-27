import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const layout = fs.readFileSync(path.join(root, 'app/(teen)/_layout.tsx'), 'utf8');
const hook = fs.readFileSync(path.join(root, 'hooks/useSleepGuard.ts'), 'utf8');
const quietScreen = fs.readFileSync(path.join(root, 'app/(teen)/quiet.tsx'), 'utf8');

test('teen layout centrally enforces Quiet Bip and hides engagement navigation', () => {
  assert.match(layout, /useSleepGuard\(\)/);
  assert.match(layout, /isQuietRouteAllowed\(\{ pathname, companion \}\)/);
  assert.match(layout, /sleepActive && !quietRouteAllowed[\s\S]*Redirect href="\/\(teen\)\/quiet"/);
  assert.match(layout, /tabBarStyle: quietActive[\s\S]*display: 'none'/);
  assert.match(layout, /!quietActive && <SideSafeBackButton/);
  assert.match(layout, /!quietActive && <GlobalMoodButton/);
  assert.match(layout, /Tabs\.Screen name="quiet" options=\{\{ href: null \}\}/);
});

test('Quiet surfaces import Sleep Guard from a path that actually resolves', () => {
  // Regression guard: both files shipped importing '@/hooks/useSleepGuard',
  // but the '@/' alias maps to src/ and the hook lives in root hooks/, so
  // main type-checked red. Assert the specifier resolves to a real file.
  for (const [name, source] of [['app/(teen)/_layout.tsx', layout], ['app/(teen)/quiet.tsx', quietScreen]]) {
    const match = /import \{[^}]*useSleepGuard[^}]*\} from '([^']+)'/.exec(source);
    assert.ok(match, `${name} must import useSleepGuard`);

    const specifier = match[1];
    const resolved = specifier.startsWith('.')
      ? path.resolve(path.dirname(path.join(root, name)), specifier)
      : path.join(root, specifier.replace(/^@\//, 'src/'));

    assert.ok(
      fs.existsSync(`${resolved}.ts`) || fs.existsSync(`${resolved}.tsx`),
      `${name} imports useSleepGuard from '${specifier}', which does not resolve to a file`,
    );
  }
});

test('Sleep Guard remains schedule authority and re-evaluates without remount', () => {
  assert.match(hook, /const SLEEP_KEY = 'sleepWindow'/);
  assert.match(hook, /resolveDailyQuietMode/);
  assert.match(hook, /setInterval\(refresh, RECHECK_MS\)/);
  assert.match(hook, /AppState\.addEventListener\('change'/);
  assert.match(hook, /publishSleepWindow\(window\)/);
  assert.match(hook, /reopensAt/);
});

test('Quiet shell exposes only Night, Pages, Bridge and private future-self capture', () => {
  assert.match(quietScreen, /quiet-open-night/);
  assert.match(quietScreen, /companion: 'night'/);
  assert.match(quietScreen, /quiet-open-pages/);
  assert.match(quietScreen, /\/(teen)\/pages|\/\(teen\)\/pages/);
  assert.match(quietScreen, /quiet-open-bridge/);
  assert.match(quietScreen, /createReopenReminder\(label, reopensAt\)/);
  assert.match(quietScreen, /HOLD THIS FOR FUTURE ME/);
  assert.doesNotMatch(quietScreen, /circle|points|streak|reward/i);
});

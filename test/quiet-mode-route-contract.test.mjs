import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const sourcePath = path.join(process.cwd(), 'src/features/quiet/quietMode.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const runtimeModule = { exports: {} };
new Function('exports', 'module', compiled)(runtimeModule.exports, runtimeModule);
const quiet = runtimeModule.exports;

const {
  QUIET_PRIMARY_DESTINATIONS,
  isQuietRouteAllowed,
  resolveDailyQuietMode,
  resolveQuietMode,
} = quiet;

test('quiet state activates only inside an explicit valid window', () => {
  const window = {
    enabled: true,
    startsAt: '2026-09-01T01:00:00.000Z',
    reopensAt: '2026-09-01T11:00:00.000Z',
  };

  assert.equal(resolveQuietMode(window, Date.parse('2026-09-01T00:59:59.000Z')).status, 'open');
  assert.deepEqual(resolveQuietMode(window, Date.parse('2026-09-01T05:00:00.000Z')), {
    status: 'quiet',
    reopensAt: window.reopensAt,
    reason: 'active_window',
  });
  assert.equal(resolveQuietMode(window, Date.parse(window.reopensAt)).status, 'open');
});

test('recurring Sleep Guard schedule resolves a cross-midnight reopen', () => {
  const schedule = { start: '22:00', end: '07:00' };

  for (const hour of [23, 1, 6]) {
    const state = resolveDailyQuietMode(schedule, new Date(2026, 8, 1, hour, 15, 0, 0));
    assert.equal(state.status, 'quiet', `expected quiet at ${hour}:15`);
    assert.ok(state.reopensAt);
    const reopen = new Date(state.reopensAt);
    assert.equal(reopen.getHours(), 7);
    assert.equal(reopen.getMinutes(), 0);
  }

  assert.equal(resolveDailyQuietMode(schedule, new Date(2026, 8, 1, 8, 0, 0, 0)).status, 'open');
});

test('same-day daily schedules and malformed schedules fail safely', () => {
  assert.equal(
    resolveDailyQuietMode({ start: '01:00', end: '06:00' }, new Date(2026, 8, 1, 3, 0, 0, 0)).status,
    'quiet',
  );
  assert.equal(
    resolveDailyQuietMode({ start: '01:00', end: '06:00' }, new Date(2026, 8, 1, 8, 0, 0, 0)).status,
    'open',
  );
  assert.equal(resolveDailyQuietMode({ start: 'bad', end: '07:00' }, new Date()).reason, 'invalid_window');
  assert.equal(resolveDailyQuietMode({ start: '22:00', end: '22:00' }, new Date()).reason, 'invalid_window');
});

test('missing, disabled, or malformed concrete scheduling fails open', () => {
  assert.equal(resolveQuietMode(null, Date.now()).reason, 'disabled');
  assert.equal(resolveQuietMode({ enabled: false, startsAt: '', reopensAt: '' }, Date.now()).status, 'open');
  assert.deepEqual(
    resolveQuietMode({ enabled: true, startsAt: 'bad', reopensAt: 'also-bad' }, Date.now()),
    { status: 'open', reopensAt: null, reason: 'invalid_window' },
  );
});

test('quiet primary destinations are Pages, Bridge, and Night', () => {
  assert.deepEqual(QUIET_PRIMARY_DESTINATIONS, {
    pages: '/(teen)/pages',
    bridge: '/(teen)/bridge',
    night: '/(teen)/companion-chat?companion=night',
  });
});

test('quiet shell, Pages subtree and Bridge are allowed in quiet mode', () => {
  assert.equal(isQuietRouteAllowed({ pathname: '/quiet' }), true);
  for (const pathname of ['/(teen)/pages', '/pages', '/pages/new', '/(teen)/pages/history']) {
    assert.equal(isQuietRouteAllowed({ pathname }), true, pathname);
  }
  assert.equal(isQuietRouteAllowed({ pathname: '/bridge' }), true);
  assert.equal(isQuietRouteAllowed({ pathname: '/(teen)/bridge?compose=true' }), true);
});

test('companion chat is allowed only for Night', () => {
  assert.equal(isQuietRouteAllowed({ pathname: '/companion-chat', companion: 'night' }), true);
  assert.equal(isQuietRouteAllowed({ pathname: '/(teen)/companion-chat', companion: ['night'] }), true);

  for (const companion of ['raylene', 'rylane', 'suhana', 'sy', 'cloud', 'oracle', '', null]) {
    assert.equal(
      isQuietRouteAllowed({ pathname: '/companion-chat', companion }),
      false,
      `unexpected quiet companion access: ${String(companion)}`,
    );
  }
});

test('engagement surfaces remain closed during quiet mode', () => {
  for (const pathname of ['/room', '/circle', '/discover', '/voicebip', '/crew', '/points', '/growth', '/comfort', '/calm']) {
    assert.equal(isQuietRouteAllowed({ pathname }), false, pathname);
  }
});

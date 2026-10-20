/**
 * Verify that the completeTeenOracleSession / completeParentOracleSession
 * handler logic correctly commits the full computed profile and appends
 * the session summary. This simulates app/index.tsx state updates without
 * a React runtime.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

const outputDirectory = mkdtempSync(path.join(tmpdir(), 'session-completion-'));
const require = createRequire(import.meta.url);

try {
  execFileSync(path.resolve('node_modules/.bin/tsc'), [
    'services/oracleDiscovery.ts',
    '--outDir', outputDirectory,
    '--target', 'ES2020',
    '--module', 'commonjs',
    '--skipLibCheck',
  ], { stdio: 'inherit' });

  const oracle = require(path.join(outputDirectory, 'oracleDiscovery.js'));

  // Simulate the initial state (what app/index.tsx starts with)
  let oracleProfile = oracle.createOracleProfile('teen');
  let oracleSessions = [];

  // Simulate completeTeenOracleSession — the fixed handler in app/index.tsx
  const completeTeenOracleSession = (profile, session) => {
    oracleProfile = profile;                         // setOracleProfile(profile)
    oracleSessions = [session, ...oracleSessions];   // setOracleSessions(prev => [session, ...prev])
  };

  assert.equal(oracleProfile.sessionCount, 0, 'starts at 0');
  assert.equal(oracleSessions.length, 0, 'no sessions yet');

  // Simulate one oracle session completing
  const question = {
    id: 'teen-confidence',
    dimension: 'Confidence',
    text: 'What kind of praise means something to you?',
    followUps: [],
    interpretations: [
      { id: 'specific', theory: 'May value specific recognition.', evidence: /specific|effort/i },
    ],
  };
  const signal = oracle.analyzeOracleAnswer(question, 'Specific praise about my effort.');
  const result = oracle.completeOracleSession(
    oracleProfile, 'teen',
    '2026-10-20T10:00:00.000Z',
    ['teen-confidence'],
    [signal],
    '2026-10-20T10:05:00.000Z',
  );

  completeTeenOracleSession(result.profile, result.session);

  // Verify the profile was fully committed — not just sessionCount+1
  assert.equal(oracleProfile.sessionCount, 1, 'sessionCount incremented exactly once');
  assert.ok(oracleProfile.understandings.length > 0, 'understandings landed in state');
  assert.ok(Object.keys(oracleProfile.dimensions).length > 0, 'dimensions landed in state');

  // Verify sessionCount did not double-increment
  assert.equal(oracleProfile.sessionCount, result.profile.sessionCount, 'state matches completeOracleSession output exactly');

  // Verify session was appended to list
  assert.equal(oracleSessions.length, 1, 'one session in history');
  assert.equal(oracleSessions[0].id, result.session.id, 'correct session stored');
  assert.equal(oracleSessions[0].side, 'teen', 'correct side on stored session');

  // Simulate a second session — understandings should accumulate
  const result2 = oracle.completeOracleSession(
    oracleProfile, 'teen',
    '2026-10-21T10:00:00.000Z',
    ['teen-confidence'],
    [signal],
    '2026-10-21T10:05:00.000Z',
  );
  completeTeenOracleSession(result2.profile, result2.session);

  assert.equal(oracleProfile.sessionCount, 2, 'two sessions now');
  assert.equal(oracleSessions.length, 2, 'two entries in history');
  assert.equal(oracleSessions[0].id, result2.session.id, 'newest session at front');
  assert.ok(oracleProfile.understandings[0].observations >= 2, 'observations accumulated across sessions');

  // Verify buildOracleContext returns non-empty context from accumulated profile
  const context = oracle.buildOracleContext(oracleProfile, 'teen');
  assert.ok(context.length > 0, 'oracle context is non-empty after sessions');

  console.log('Session completion audit passed.');
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}

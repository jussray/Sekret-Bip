import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

const outputDirectory = mkdtempSync(path.join(tmpdir(), 'oracle-discovery-'));
const require = createRequire(import.meta.url);

try {
  execFileSync(path.resolve('node_modules/.bin/tsc'), [
    '--project', 'tsconfig.oracle-discovery.json',
    '--outDir', outputDirectory,
    '--target', 'ES2020',
    '--module', 'commonjs',
    '--skipLibCheck',
  ], { stdio: 'inherit' });

  const oracle = require(path.join(outputDirectory, 'services', 'oracleDiscovery.js'));
  const voice = require(path.join(outputDirectory, 'services', 'sekretVoice.js'));
  const startedAt = '2026-06-12T00:00:00.000Z';
  const completedAt = '2026-06-12T00:05:00.000Z';
  const teenProfile = oracle.createOracleProfile('teen', startedAt);
  const question = {
    id: 'teen-confidence',
    dimension: 'Confidence',
    text: 'What kind of praise actually means something to you?',
    followUps: [],
    interpretations: [
      { id: 'specific', theory: 'May value specific recognition more than broad approval.', evidence: /specific|noticed|effort/i },
      { id: 'earned', theory: 'May trust praise most when it feels earned and personally true.', evidence: /earned|real|true/i },
    ],
  };

  const supported = oracle.analyzeOracleAnswer(question, 'Specific praise about my effort feels real to me.');
  assert.equal(supported.theories.length, 2);
  assert.deepEqual(oracle.analyzeOracleAnswer(question, 'The weather was warm at lunch.').theories, []);
  assert.deepEqual(oracle.analyzeOracleAnswer(question, 'Specific praise does not matter to me.').theories, []);

  assert.equal(oracle.shouldCompleteOracleSession(2, 'idk', 0), false);
  assert.equal(oracle.shouldCompleteOracleSession(3, 'idk', 0), true);
  assert.equal(oracle.shouldCompleteOracleSession(3, 'Specific praise matters because it shows real attention.', 1), true);
  assert.equal(oracle.shouldCompleteOracleSession(5, 'short', 1), true);

  const first = oracle.completeOracleSession(
    teenProfile,
    'teen',
    startedAt,
    ['q1', 'q2', 'q3'],
    [supported, supported, supported],
    completedAt,
  );
  assert.equal(first.profile.understandings[0].observations, 1, 'one interview is one observation');
  assert.equal(first.profile.dimensions.Confidence, 'Emerging');
  assert.ok(!JSON.stringify(first.session).includes('Specific praise about my effort'), 'raw answers must not persist');

  const second = oracle.completeOracleSession(
    first.profile,
    'teen',
    '2026-06-13T00:00:00.000Z',
    ['q4', 'q5', 'q6'],
    [supported],
    '2026-06-13T00:05:00.000Z',
  );
  assert.equal(second.profile.understandings[0].observations, 2);
  assert.equal(second.profile.dimensions.Confidence, 'Growing');
  const context = oracle.buildOracleContext(second.profile, 'teen');
  assert.ok(context.length > 0);

  const adaptation = voice.buildSekretAdaptationInstruction(context);
  assert.ok(adaptation.includes('May value specific recognition more than broad approval.'));
  assert.ok(!adaptation.includes('Confidence:'), 'response guidance must not expose dimension labels');
  assert.equal(voice.keepSekretReply('My analysis says you need reassurance.', 'quiet fallback'), 'quiet fallback');
  assert.equal(voice.keepSekretReply('That sounds like a lot. Take your time.', 'quiet fallback'), 'That sounds like a lot. Take your time.');

  const contaminated = {
    ...second.profile,
    understandings: [
      ...second.profile.understandings,
      { id: 'wrong-side', dimension: 'Caregiver Stress', theory: 'Parent-only.', state: 'Strong', observations: 4, updatedAt: completedAt },
    ],
  };
  assert.equal(oracle.normalizeOracleProfile(contaminated, 'teen').understandings.some(item => item.id === 'wrong-side'), false);

  const sessions = oracle.normalizeOracleSessions([
    second.session,
    { ...second.session, id: 'parent-session', side: 'parent' },
  ], 'teen');
  assert.deepEqual(sessions.map(session => session.id), [second.session.id]);

  console.log('Oracle Discovery audit passed.');
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}

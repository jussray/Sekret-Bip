/**
 * Companion pre-flight crisis coverage.
 *
 * checkTextBeforePost (src/features/safety/safetyCoordinator.ts) runs before
 * every companion send. Its immediate_danger rule must match the same
 * high-risk phrasings the server reply gate matches.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const coordinator = fs.readFileSync(
  new URL('../src/features/safety/safetyCoordinator.ts', import.meta.url),
  'utf8',
);
const rule = coordinator.match(/re:\s*(\/.*\/i),\s*\n\s*tier:\s*'immediate_danger'/);
assert.ok(rule, 'immediate_danger pre-flight rule must be present');
const IMMEDIATE_RE = new Function(`return ${rule[1]}`)();

test('pre-flight immediate_danger rule matches suicide noun and gerund self-harm forms', () => {
  assert.ok(IMMEDIATE_RE.test('I keep thinking about suicide'),  'suicide');
  assert.ok(IMMEDIATE_RE.test('killing myself'),                 'killing myself');
  assert.ok(IMMEDIATE_RE.test('cutting myself'),                 'cutting myself');
  assert.ok(IMMEDIATE_RE.test('hurting myself'),                 'hurting myself');
});

test('pre-flight immediate_danger rule keeps base-form matches', () => {
  assert.ok(IMMEDIATE_RE.test('I want to kill myself'),          'kill myself');
  assert.ok(IMMEDIATE_RE.test('I am suicidal'),                  'suicidal');
  assert.ok(IMMEDIATE_RE.test('I cut myself'),                   'cut myself');
});

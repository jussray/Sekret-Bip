import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const activeDefense = readFileSync(new URL('../worker/active-defense.ts', import.meta.url), 'utf8');
const entry = readFileSync(new URL('../worker/voice-entry.ts', import.meta.url), 'utf8');

const requiredFlows = [
  'attack10',
  'attack20',
  'attack30',
  'attack3000',
  'attack5000',
  'attack6000',
  'attack48000',
  'redteamI',
  'redteamII',
  'redteamTwin',
  'devil',
  'lindymode',
  'l99',
  'ooda',
  'truthmode',
  'confess',
  'goalfix',
  'proofMode',
  'continuity',
  'rollback',
];

test('active-defense source carries the full attack unit', () => {
  for (const flow of requiredFlows) {
    assert.match(activeDefense, new RegExp(`['\"]${flow}['\"]`), `missing ${flow}`);
  }
});

test('hallway expansion is fixed 48000 plus bounded secret-derived random expansion', () => {
  assert.match(activeDefense, /HALLWAY_BASE_EXPANSION\s*=\s*48_000/);
  assert.match(activeDefense, /HALLWAY_RANDOM_EXPANSION_MAX\s*=\s*48_000/);
  assert.match(activeDefense, /ACTIVE_DEFENSE_HMAC_KEY/);
  assert.match(activeDefense, /deriveKey\(rootSecret, 'hallway-expansion'\)/);
  assert.match(activeDefense, /fixedExpansion \+ randomExpansionValue/);
});

test('active defense is defensive-only and synthetic by contract', () => {
  assert.match(activeDefense, /outboundProbe:\s*false/);
  assert.match(activeDefense, /productionExposure:\s*0/);
  assert.match(activeDefense, /realCredentialsExposed:\s*0/);
  assert.match(activeDefense, /customerDataExposed:\s*0/);
  assert.match(activeDefense, /Array\.from\(\{ length: 8 \}/);
  assert.doesNotMatch(activeDefense, /fetch\(decision\.sourceIp/);
});

test('signed continuity keeps every touched hallway successor inside the unit', () => {
  assert.match(activeDefense, /__Host-juss_hallway/);
  assert.match(activeDefense, /HALLWAY_PATH/);
  assert.match(activeDefense, /hallwayContinuation/);
  assert.match(activeDefense, /SameSite=Strict/);
  assert.match(activeDefense, /HttpOnly/);
});

test('canonical Worker entry invokes active defense before auth', () => {
  const activeIndex = entry.indexOf('enforceActiveDefense(request, env, ctx, started)');
  const authIndex = entry.indexOf('authenticate(request, env)');
  assert.ok(activeIndex > 0, 'active-defense call missing from voice-entry');
  assert.ok(authIndex > activeIndex, 'active defense must observe ingress before auth');
});

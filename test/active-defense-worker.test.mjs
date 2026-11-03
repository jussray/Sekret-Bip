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

test('inactive hallway mode defaults off and generates no telemetry side effects', () => {
  assert.match(activeDefense, /function normalizedMode\(value: unknown\): ActiveDefenseMode \{\s*return value === 'contain' \|\| value === 'observe' \? value : 'off';/);
  assert.match(activeDefense, /if \(normalizedMode\(env\.ACTIVE_DEFENSE_MODE\) !== 'off'\) observeDecision\(/);
  assert.match(activeDefense, /mode === 'contain'\s*&& rootSecret\s*&& !verifiedBot/);
});

test('retained hallway logs omit raw IP and claimed User-Agent', () => {
  const start = activeDefense.indexOf("  console.info(JSON.stringify({");
  assert.ok(start >= 0, 'bounded logger must exist');
  const logged = activeDefense.slice(start, activeDefense.indexOf("\n  }));", start) + 7);
  assert.doesNotMatch(logged, /source_ip:|decision\.sourceIp/);
  assert.doesNotMatch(logged, /claimed_user_agent:|decision\.claimedUserAgent/);
  assert.match(logged, /incident_fingerprint:/);
  assert.match(logged, /actor_fingerprint:/);
});

test('all 20 hallway checks carry evidence-only Art of War maneuvers', () => {
  const names = [
    'HOLD_GROUND',
    'REACQUIRE_GROUND',
    'PROBE_CHEAPEST_UNKNOWN',
    'EXPLOIT_VERIFIED_ASYMMETRY',
    'ADVANCE_REVERSIBLY',
    'AVOID_SIEGE',
  ];
  assert.ok(activeDefense.includes("ART_OF_WAR_STAGE_CONTRACT = 'juss/art-of-war-hallway-strategy@v1'"));
  for (const name of names) assert.ok(activeDefense.includes(name), 'missing Art of War maneuver: ' + name);
  assert.ok(activeDefense.includes('attackUnit: attackUnit.map((item) => ({'));
  assert.ok(activeDefense.includes('artOfWar: artOfWarStage(item, verdict, suspiciousPath)'));
  assert.match(activeDefense, /authorizing: false/);
  assert.match(activeDefense, /verifiedSyntheticOpportunity = contained && suspiciousPath/);
  assert.doesNotMatch(activeDefense, /externalActionAllowed: true/);
});

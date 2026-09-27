import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACTIVE_ATTACK_FLOWS,
  HALLWAY_BASE_EXPANSION,
  HALLWAY_RANDOM_EXPANSION_MAX,
  HALLWAY_COOKIE,
  enforceActiveDefense,
  evaluateActiveDefenseRequest,
} from '../worker/active-defense.ts';

const SECRET = 'bip-active-defense-test-secret-abcdefghijklmnopqrstuvwxyz';

function requestWithCf(url, init = {}, cf = {}) {
  const request = new Request(url, init);
  Object.defineProperty(request, 'cf', { value: cf, configurable: true });
  return request;
}

function context() {
  return { waitUntil() {} };
}

test('verified bot remains allowed and every attack lens still runs', () => {
  const request = requestWithCf('https://api.sekretbip.net/health', {
    headers: {
      'CF-Connecting-IP': '203.0.113.20',
      'CF-Ray': 'bip-ray-verified',
      'User-Agent': 'ExampleBot/1.0',
    },
  }, {
    asn: 64500,
    asOrganization: 'Example Network',
    verifiedBotCategory: 'SearchEngine',
    botManagement: { score: 99, verifiedBot: true, ja4: 'ja4-example' },
  });

  const decision = evaluateActiveDefenseRequest(request, {
    ACTIVE_DEFENSE_MODE: 'contain',
    ACTIVE_DEFENSE_HMAC_KEY: SECRET,
  });

  assert.equal(decision.verdict, 'VERIFIED_BOT');
  assert.equal(decision.logicalExpansion, 0);
  assert.deepEqual(decision.attackUnit.map((entry) => entry.flow), ACTIVE_ATTACK_FLOWS);
});

test('high-risk unknown automation receives 48000 plus bounded random logical expansion', () => {
  const request = requestWithCf('https://api.sekretbip.net/.env', {
    headers: {
      'CF-Connecting-IP': '198.51.100.21',
      'CF-Ray': 'bip-ray-probe',
      'User-Agent': 'ExampleCrawler/7.2',
    },
  }, {
    asn: 64501,
    asOrganization: 'Example Automation Network',
    botManagement: { score: 2, verifiedBot: false, ja3Hash: 'ja3-example', ja4: 'ja4-example' },
  });

  const { decision, response } = enforceActiveDefense(request, {
    ACTIVE_DEFENSE_MODE: 'contain',
    ACTIVE_DEFENSE_HMAC_KEY: SECRET,
  }, context());

  assert.equal(decision.verdict, 'HALLWAY');
  assert.equal(decision.fixedExpansion, HALLWAY_BASE_EXPANSION);
  assert.ok(decision.randomExpansion >= 1);
  assert.ok(decision.randomExpansion <= HALLWAY_RANDOM_EXPANSION_MAX);
  assert.equal(decision.logicalExpansion, HALLWAY_BASE_EXPANSION + decision.randomExpansion);
  assert.equal(decision.controls.outboundProbe, false);
  assert.equal(decision.controls.productionExposure, 0);
  assert.ok(response);
});

test('every touched hallway continuation becomes a successor step with another expansion', async () => {
  const firstRequest = requestWithCf('https://api.sekretbip.net/.git/config', {
    headers: {
      'CF-Connecting-IP': '198.51.100.22',
      'CF-Ray': 'bip-ray-first',
      'User-Agent': 'scanner/1.0',
    },
  }, { botManagement: { score: 1, verifiedBot: false } });

  const first = enforceActiveDefense(firstRequest, {
    ACTIVE_DEFENSE_MODE: 'contain',
    ACTIVE_DEFENSE_HMAC_KEY: SECRET,
  }, context());
  assert.ok(first.response);
  const firstBody = await first.response.json();
  const cookie = first.response.headers.get('Set-Cookie');
  assert.ok(cookie?.startsWith(`${HALLWAY_COOKIE}=`));
  const cookiePair = cookie.split(';', 1)[0];

  const successorRequest = requestWithCf(firstBody.continuation[0], {
    headers: {
      'CF-Connecting-IP': '198.51.100.22',
      'CF-Ray': 'bip-ray-second',
      'User-Agent': 'scanner/1.0',
      Cookie: cookiePair,
    },
  }, { botManagement: { score: 1, verifiedBot: false } });

  const successor = enforceActiveDefense(successorRequest, {
    ACTIVE_DEFENSE_MODE: 'contain',
    ACTIVE_DEFENSE_HMAC_KEY: SECRET,
  }, context());

  assert.equal(successor.decision.verdict, 'HALLWAY');
  assert.equal(successor.decision.continuityParent, first.decision.incidentFingerprint.slice(0, 24));
  assert.equal(successor.decision.fixedExpansion, 48_000);
  assert.ok(successor.decision.randomExpansion >= 1);
  assert.ok(successor.response);
  assert.notEqual(successor.decision.incidentFingerprint, first.decision.incidentFingerprint);
});

test('missing dedicated key cannot silently activate the hallway', () => {
  const request = requestWithCf('https://api.sekretbip.net/.env', {
    headers: {
      'CF-Connecting-IP': '198.51.100.23',
      'CF-Ray': 'bip-ray-no-key',
      'User-Agent': 'scanner/2.0',
    },
  }, { botManagement: { score: 1, verifiedBot: false } });

  const { decision, response } = enforceActiveDefense(request, {
    ACTIVE_DEFENSE_MODE: 'contain',
  }, context());

  assert.equal(decision.verdict, 'OBSERVE_AUTOMATION');
  assert.equal(decision.logicalExpansion, 0);
  assert.equal(response, null);
});

test('hallway response stays synthetic and never contains the HMAC secret', async () => {
  const request = requestWithCf('https://api.sekretbip.net/wp-admin/', {
    headers: {
      'CF-Connecting-IP': '198.51.100.24',
      'CF-Ray': 'bip-ray-synthetic',
      'User-Agent': 'scanner/3.0',
    },
  }, { botManagement: { score: 1, verifiedBot: false } });

  const { response } = enforceActiveDefense(request, {
    ACTIVE_DEFENSE_MODE: 'contain',
    ACTIVE_DEFENSE_HMAC_KEY: SECRET,
  }, context());

  assert.ok(response);
  const body = await response.text();
  assert.equal(body.includes(SECRET), false);
  const parsed = JSON.parse(body);
  assert.equal(parsed.continuation.length, 8);
  assert.equal(parsed.continuation.every((value) => value.startsWith('https://api.sekretbip.net/')), true);
});

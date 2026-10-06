import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('canonical Bip front door owns the founder-only provider lane', () => {
  const wrangler = read('wrangler.toml');
  const frontDoor = read('worker/voice-entry.ts');
  const route = read('worker/provider-route.ts');
  assert.match(wrangler, /^main = "worker\/voice-entry\.ts"$/m);
  assert.match(frontDoor, /handleBipProviderRequest/);
  assert.match(frontDoor, /const founderPaused = enforceFounderOperationKillSwitch/);
  assert.ok(frontDoor.indexOf('founderPaused') < frontDoor.indexOf('providerResponse'));
  assert.match(route, /BIP_AI_OPERATOR_KEY/);
  assert.match(route, /userContentForwarding: false/);
});

test('Bip provider runtime forbids teen or sensitive context by construction', () => {
  const runtime = read('worker/provider-runtime.ts');
  assert.match(runtime, /OPENAI_API_KEY/);
  assert.match(runtime, /ANTHROPIC_API_KEY/);
  assert.match(runtime, /MODEL_API_KEY/);
  assert.match(runtime, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(runtime, /https:\/\/api\.anthropic\.com\/v1\/messages/);
  assert.match(runtime, /https:\/\/api\.meta\.ai\/v1\/responses/);
  assert.match(runtime, /sensitive_context_not_authorized/);
  assert.match(runtime, /user_content_not_authorized/);
  assert.match(runtime, /\['founder', 'repository', 'system'\]/);
});

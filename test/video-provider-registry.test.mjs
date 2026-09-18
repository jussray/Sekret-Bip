import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = process.cwd();
const verifier = path.join(root, 'scripts/verify-video-provider-registry.mjs');
const registryPath = path.join(root, 'production/video-providers/registry.json');

function run(args = []) {
  return spawnSync(process.execPath, [verifier, ...args], {
    cwd: root,
    encoding: 'utf8'
  });
}

function withMutatedRegistry(mutator) {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  mutator(registry);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bip-video-provider-'));
  const file = path.join(dir, 'registry.json');
  fs.writeFileSync(file, `${JSON.stringify(registry, null, 2)}\n`);
  return file;
}

test('canonical video provider registry is fail-closed and valid', () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /VIDEO_PROVIDER_REGISTRY_OK/);
});

test('Gemini animation lane is registered but cannot self-promote to production', () => {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const gemini = registry.providers.find((provider) => provider.id === 'openart-gemini-omni-1-1-flash');
  assert.ok(gemini, 'Gemini provider candidate must be registered');
  assert.equal(gemini.kind, 'external-service');
  assert.equal(gemini.modelId, 'gemini-omni-1-1-flash');
  assert.equal(gemini.task, 'image-to-video');
  assert.equal(gemini.canaryEligible, true);
  assert.equal(gemini.productionEligible, false);
  assert.equal(gemini.identityCanaryPassed, false);
  assert.equal(gemini.requiresApprovedKeyframe, true);
  assert.equal(gemini.textOnlyIdentityAllowed, false);
  assert.equal(gemini.requiresIdentityQa, true);
  assert.equal(gemini.requiresPlaywrightPlayback, true);
  assert.equal(gemini.requiresCostPreflight, true);
});

test('registry rejects premature Gemini production promotion', () => {
  const file = withMutatedRegistry((registry) => {
    registry.providers.find((provider) => provider.id === 'openart-gemini-omni-1-1-flash').productionEligible = true;
  });
  const result = run(['--registry', file]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /production eligibility requires a passed identity canary/);
});

test('Hugging Face canary selection chooses the permissive I2V candidate without production authority', () => {
  const result = run(['--select-canary']);
  assert.equal(result.status, 0, result.stderr);
  const selected = JSON.parse(result.stdout.trim());
  assert.equal(selected.id, 'hf-wan22-i2v-a14b');
  assert.equal(selected.modelId, 'Wan-AI/Wan2.2-I2V-A14B-Diffusers');
  assert.equal(selected.task, 'image-to-video');
  assert.equal(selected.productionEligible, false);
  assert.equal(selected.requiresApprovedKeyframe, true);
  assert.equal(selected.requiresIdentityQa, true);
  assert.equal(selected.requiresPlaywrightPlayback, true);
});

test('registry rejects prompt-only identity authority', () => {
  const file = withMutatedRegistry((registry) => {
    registry.providers.find((provider) => provider.id === 'hf-wan22-i2v-a14b').textOnlyIdentityAllowed = true;
  });
  const result = run(['--registry', file]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /prompt-only identity must stay forbidden/);
});

test('registry rejects premature Hugging Face production promotion', () => {
  const file = withMutatedRegistry((registry) => {
    registry.providers.find((provider) => provider.id === 'hf-wan22-i2v-a14b').productionEligible = true;
  });
  const result = run(['--registry', file]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /production eligibility requires a passed identity canary/);
});

test('registry rejects a canary whose usage status still requires review', () => {
  const file = withMutatedRegistry((registry) => {
    registry.providers.find((provider) => provider.id === 'hf-ltx-098-13b-distilled').canaryEligible = true;
  });
  const result = run(['--registry', file]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /canary\/production eligibility requires an allowlisted permissive license|Hugging Face eligibility requires an explicitly permissive license status/);
});

test('registry rejects forged permissive status when the actual HF license is not allowlisted', () => {
  const file = withMutatedRegistry((registry) => {
    const provider = registry.providers.find((item) => item.id === 'hf-wan22-i2v-a14b');
    provider.license = 'other';
    provider.commercialUseStatus = 'permissive-license';
  });
  const result = run(['--registry', file]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /canary\/production eligibility requires an allowlisted permissive license/);
});

test('production eligibility cannot bypass unresolved Hugging Face usage status', () => {
  const file = withMutatedRegistry((registry) => {
    const provider = registry.providers.find((item) => item.id === 'hf-wan22-i2v-a14b');
    provider.canaryEligible = false;
    provider.productionEligible = true;
    provider.identityCanaryPassed = true;
    provider.commercialUseStatus = 'review-required';
  });
  const result = run(['--registry', file]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Hugging Face eligibility requires an explicitly permissive license status/);
});

test('registry path flag fails closed when its argument is missing', () => {
  const result = run(['--registry']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--registry requires a path argument/);
});

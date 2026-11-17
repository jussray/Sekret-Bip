import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../worker/voice-routing.ts', import.meta.url), 'utf8');

test('legacy companion ids normalize to canonical display ids', () => {
  assert.match(source, /if \(characterId === 'raylene'\) return 'suhana';/);
  assert.match(source, /if \(characterId === 'rylane'\) return 'sy';/);
});

test('precise lip sync uses ElevenLabs with a single Cloudflare fallback', () => {
  assert.match(source, /provider: 'elevenlabs-flash'/);
  assert.match(source, /fallbackProvider: 'cloudflare-aura-2'/);
});

test('normal canon speech defaults to Cloudflare and system speech stays economy', () => {
  assert.match(source, /provider: 'cloudflare-aura-2'/);
  assert.match(source, /fallbackProvider: 'cloudflare-aura-1'/);
  assert.match(source, /provider: 'cloudflare-aura-1'/);
});

test('routing contract never returns retired ids as canonical ids', () => {
  const canonicalType = source.match(/export type CanonCharacterId = ([^;]+);/)?.[1] ?? '';
  assert.doesNotMatch(canonicalType, /raylene|rylane/);
  assert.match(canonicalType, /suhana/);
  assert.match(canonicalType, /sy/);
});

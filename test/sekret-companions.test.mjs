import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync(new URL('../src/utils/api.ts', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../worker/sekret-reply.ts', import.meta.url), 'utf8');
const curriculum = fs.readFileSync(new URL('../worker/companion-curriculum.ts', import.meta.url), 'utf8');
const voiceRoute = fs.readFileSync(new URL('../app/(teen)/voicebip.tsx', import.meta.url), 'utf8');
const onboarding = fs.readFileSync(new URL('../app/(onboarding)/reflection.tsx', import.meta.url), 'utf8');

for (const id of ['raylene', 'rylane', 'cloud', 'night', 'sekret']) {
  test(`client and worker recognize ${id}`, () => {
    assert.match(api, new RegExp(`['"]${id}['"]`));
    assert.match(worker, new RegExp(`['"]${id}['"]`));
    assert.match(curriculum, new RegExp(`(?:^|\\s)${id}:`));
  });
}

test('legacy Oracle routes to visible Se\'kret identity', () => {
  assert.match(api, /raw === 'oracle'.*return 'sekret'/s);
  assert.match(worker, /raw === 'oracle'.*return 'sekret'/s);
  assert.match(worker, /replace\(\/\\bOracle\\b\/gi, "Se'kret"\)/);
});

test('Se\'kret synthesis uses uncertainty and correction language', () => {
  assert.match(curriculum, /uncertainty language/i);
  assert.match(curriculum, /invites correction/i);
  assert.match(worker, /Synthesize patterns rather than repeating answers/i);
});

test('Voice Bip persists companion selection through app context', () => {
  assert.match(voiceRoute, /setSelectedSekret/);
  assert.match(voiceRoute, /onSelectAvatar=\{setSelectedSekret\}/);
});

test('onboarding reflection stays local and is not attributed to Raylene memory', () => {
  assert.match(onboarding, /sekret_self_discovery_profile/);
  assert.doesNotMatch(onboarding, /updateSekretMemory/);
  assert.doesNotMatch(onboarding, /oracleSignals/);
});

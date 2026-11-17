import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('voice request contract supports precise timing without changing the default route', () => {
  const contract = read('src/contracts/sekretApi.ts');

  assert.match(contract, /requiresPreciseLipSync\?: boolean/);
  assert.match(contract, /includeTiming\?: boolean/);
  assert.match(contract, /lipSync\?: 'standard' \| 'precise'/);
});

test('voice response contract preserves provider, fallback, and alignment truth', () => {
  const contract = read('src/contracts/sekretApi.ts');

  assert.match(contract, /export type VoiceProvider/);
  assert.match(contract, /voiceProvider\?: VoiceProvider/);
  assert.match(contract, /primaryVoiceProvider\?: VoiceProvider/);
  assert.match(contract, /usedFallback\?: boolean/);
  assert.match(contract, /timing\?: CharacterAlignment/);
});

test('compatibility API forwards Worker voice metadata instead of discarding it', () => {
  const api = read('src/utils/api.ts');

  assert.match(api, /sekretClient\.synthesizeVoice\(input\)/);
  assert.match(api, /voiceProvider: result\.data\.voiceProvider/);
  assert.match(api, /primaryVoiceProvider: result\.data\.primaryVoiceProvider/);
  assert.match(api, /usedFallback: result\.data\.usedFallback \?\? result\.meta\.fallbackUsed/);
  assert.match(api, /timing: result\.data\.timing/);
});

test('founder-facing Worker adapter returns the complete synthesis result', () => {
  const adapter = read('src/services/ai/workerClient.ts');

  assert.match(adapter, /Promise<VoiceSynthesisData>/);
  assert.doesNotMatch(adapter, /return \{ audioBase64: data\.audioBase64 \}/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../worker/piper-tts.ts', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../services/piper-tts/server.py', import.meta.url), 'utf8');
const dockerfile = fs.readFileSync(new URL('../services/piper-tts/Dockerfile', import.meta.url), 'utf8');

test('Voice Bip has a Piper-first route and fallback path', () => {
  for (const token of ['PIPER_TTS_URL', 'synthesizeWithPiper', 'voiceSource', 'piper', 'worker.fetch']) {
    assert.equal(worker.includes(token), true);
  }
});

test('Piper client supports protected WAV synthesis with a bounded request', () => {
  for (const token of ['PIPER_TTS_TOKEN', 'Authorization', 'synthesize', 'wav', 'AbortSignal.timeout', 'PIPER_REQUEST_TIMEOUT_MS']) {
    assert.equal(client.includes(token), true);
  }
});

test('Piper service fails closed without auth unless local bypass is explicit', () => {
  for (const token of ['PIPER_API_TOKEN', 'PIPER_ALLOW_INSECURE_LOCAL', 'authentication is not configured', 'Bearer']) {
    assert.equal(service.includes(token), true);
  }
});

test('canonical Piper defaults match the voice models baked into the image', () => {
  const expected = [
    ['suhana', 'en_US-amy-medium'],
    ['sy', 'en_US-ryan-medium'],
    ['cloud', 'en_US-amy-low'],
    ['night', 'en_US-lessac-low'],
    ['sekret', 'en_US-amy-medium'],
    ['parentCoach', 'en_US-amy-medium'],
  ];

  for (const [characterId, modelStem] of expected) {
    assert.equal(client.includes(`${characterId}: '${modelStem}'`), true);
    assert.equal(dockerfile.includes(`/voices/${modelStem}.onnx`), true);
    assert.equal(dockerfile.includes(`/voices/${modelStem}.onnx.json`), true);
  }
});

test('Piper deployment documentation uses current canonical names', () => {
  assert.equal(dockerfile.includes('Raylene'), false);
  assert.equal(dockerfile.includes('Rylane'), false);
  for (const name of ['Suhana', 'Sy', 'Cloud', 'Night']) assert.equal(dockerfile.includes(name), true);
});

test('Piper service validates voice models and cleans temporary files', () => {
  for (const token of ['onnx', 'BackgroundTasks', 'missing_ok=True', 'FileResponse']) {
    assert.equal(service.includes(token), true);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Wrangler activates the voice entry and Workers AI binding', async () => {
  const wrangler = await read('wrangler.toml');
  assert.match(wrangler, /main = "worker\/voice-entry\.ts"/);
  assert.match(wrangler, /\[ai\]\s+binding = "AI"/s);
  assert.match(wrangler, /VOICE_PROVIDER_MODE = "hybrid"/);
  assert.doesNotMatch(wrangler, /ELEVENLABS_API_KEY\s*=/);
});

test('voice entry preserves auth, origin, content-type, and rate-limit boundaries', async () => {
  const source = await read('worker/voice-entry.ts');
  assert.match(source, /originRejected\(request, env, cors\)/);
  assert.match(source, /content-type must be application\/json/);
  assert.match(source, /authenticate\(request, env\)/);
  assert.match(source, /enforceRateLimit\(request, env, auth\.principal, cors\)/);
});

test('voice entry returns canonical IDs and typed provider metadata', async () => {
  const source = await read('worker/voice-entry.ts');
  assert.match(source, /characterId: route\.canonicalCharacterId/);
  assert.match(source, /actorRole: style\.role/);
  assert.match(source, /voiceProvider: result\.provider/);
  assert.match(source, /primaryVoiceProvider: result\.primaryProvider/);
  assert.match(source, /usedFallback: result\.usedFallback/);
  assert.match(source, /timing: result\.timing/);
  assert.match(source, /questionBudget: style\.maxQuestions/);
  assert.doesNotMatch(source, /characterId must be raylene/);
  assert.doesNotMatch(source, /characterId must be rylane/);
});

test('Cloudflare adapters use official Aura model IDs with raw audio responses', async () => {
  const source = await read('worker/voice-providers.ts');
  assert.match(source, /@cf\/deepgram\/aura-1/);
  assert.match(source, /@cf\/deepgram\/aura-2-en/);
  assert.match(source, /returnRawResponse: true/);
  assert.match(source, /encoding: 'mp3'/);
});

test('ElevenLabs precise timing is isolated behind the timestamp endpoint', async () => {
  const source = await read('worker/voice-providers.ts');
  assert.match(source, /\/with-timestamps\?output_format=mp3_44100_128/);
  assert.match(source, /model_id: model/);
  assert.match(source, /eleven_flash_v2_5/);
  assert.match(source, /characterStartTimesSeconds/);
  assert.match(source, /characterEndTimesSeconds/);
});

test('runtime performs at most one bounded provider fallback', async () => {
  const source = await read('worker/voice-providers.ts');
  assert.match(source, /if \(!route\.fallbackProvider\) throw primaryError/);
  assert.match(source, /synthesizeProvider\(route\.fallbackProvider/);
  assert.doesNotMatch(source, /while\s*\(/);
});

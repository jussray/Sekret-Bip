import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('shared contract defines request, visual state, and stable Worker errors', () => {
  const contract = read('src/contracts/sekretApi.ts');

  assert.match(contract, /export interface CompanionReplyRequest/);
  assert.match(contract, /export interface CompanionReplyData/);
  assert.match(contract, /avatarState\?: CompanionAvatarState/);
  assert.match(contract, /export type WorkerErrorCode/);
  assert.match(contract, /'AUTH_REQUIRED'/);
  assert.match(contract, /'RATE_LIMITED'/);
  assert.match(contract, /'TIMEOUT'/);
});

test('one typed client owns Worker routes, auth headers, and backend URL resolution', () => {
  const client = read('src/services/backend/sekretClient.ts');

  assert.match(client, /import \{ backendAuthHeaders \} from '@\/utils\/backendAuth'/);
  assert.match(client, /import \{ BACKEND_URL \} from '@\/utils\/env'/);
  assert.match(client, /'\/api\/sekret\/reply'/);
  assert.match(client, /'\/api\/sekret\/voice'/);
  assert.match(client, /'\/api\/sekret\/transcribe'/);
  assert.match(client, /'\/health'/);
  assert.match(client, /traceId/);
});

test('legacy API and main chat route through the shared client instead of direct fetch', () => {
  const api = read('src/utils/api.ts');
  const chat = read('src/services/ai/chat.ts');
  const founderAdapter = read('src/services/ai/workerClient.ts');

  for (const source of [api, chat, founderAdapter]) {
    assert.match(source, /sekretClient/);
    assert.doesNotMatch(source, /backendAuthHeaders/);
    assert.doesNotMatch(source, /fetch\(`\$\{[^}]*BASE_URL\}\/api\/sekret/);
  }
});

test('unused duplicate frontend transports stay retired', () => {
  assert.equal(fs.existsSync(path.join(root, 'src/services/worker/index.ts')), false);
  assert.equal(fs.existsSync(path.join(root, 'services/ttsService.ts')), false);

  const voiceBip = read('screens/VoiceBipScreen.tsx');
  assert.match(voiceBip, /fetchSekretReply/);
  assert.match(voiceBip, /fetchSekretVoice/);
  assert.match(voiceBip, /fetchSekretTranscribe/);
  assert.doesNotMatch(voiceBip, /EXPO_PUBLIC_PIPER_TTS_URL/);
  assert.doesNotMatch(voiceBip, /EXPO_PUBLIC_PIPER_API_TOKEN/);
});

test('Worker style enforcement always supplies an avatar state', () => {
  const runtimeStyle = read('worker/runtime-style.ts');

  assert.match(runtimeStyle, /resolveAvatarState/);
  assert.match(runtimeStyle, /avatarState: resolveAvatarState\(data\)/);
  assert.match(runtimeStyle, /data\.safetyFlag === true/);
});

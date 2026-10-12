import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const localTsc = path.resolve('node_modules/.bin/tsc');
const tsc = existsSync(localTsc) ? localTsc : 'tsc';
const out = mkdtempSync(path.join(tmpdir(), 'sekret-worker-'));
test.after(() => rmSync(out, { recursive: true, force: true }));

execFileSync(tsc, [
  path.resolve('worker/sekret-reply.ts'),
  '--rootDir', path.resolve('.'),
  '--outDir', out,
  '--target', 'ES2022',
  '--module', 'commonjs',
  '--skipLibCheck',
  '--strict',
], { stdio: 'inherit' });

const worker = require(path.join(out, 'worker', 'sekret-reply.js')).default;
const env = { OPENAI_API_KEY: '' };
const USER = '00000000-0000-4000-8000-000000000001';

async function reply(userText, bodyParentSharingEnabled, guardianSharingEnabled) {
  const request = new Request('https://worker.test/api/sekret/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userText,
      characterId: 'sekret',
      surface: 'chat',
      parentSharingEnabled: bodyParentSharingEnabled,
      history: [],
    }),
  });
  const principal = { kind: 'user', userId: USER, guardianSharingEnabled };
  const response = await worker.fetch(request, env, principal);
  return { status: response.status, body: await response.json() };
}

test('qualifying messages reach the supportive safety response', async () => {
  const { status, body } = await reply('I dont want to live anymore', false, false);
  assert.equal(status, 200);
  assert.equal(body.safetyFlag, true);
  assert.equal(body.tone, 'supportive-safety');
  assert.match(body.reply, /trusted adult/i);
  assert.match(body.reply, /988/);
});

test('ordinary location language does not escalate', async () => {
  const { body } = await reply('I want to live in Lagos', true, false);
  assert.equal(body.safetyFlag, false);
  assert.equal(body.parentShareSummary, null);
});

test('client body cannot authorize guardian sharing', async () => {
  const { body } = await reply('I dont want to live anymore', true, false);
  assert.equal(body.parentShareSummary, null);
});

test('server-authorized principal can produce only the fixed generic summary', async () => {
  const { body } = await reply('I dont want to live anymore', false, true);
  assert.equal(body.parentShareSummary, 'Safety concern: teen may need trusted adult or emergency support.');
});

test('safety reply does not echo the user message', async () => {
  const text = 'I dont want to live anymore';
  const { body } = await reply(text, false, true);
  assert.equal(body.reply.toLowerCase().includes(text.toLowerCase()), false);
  assert.equal(String(body.parentShareSummary ?? '').toLowerCase().includes(text.toLowerCase()), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const oracleDiscovery = read('services/oracleDiscovery.ts');
const companionChat = read('app/(teen)/companion-chat.tsx');
const companionEngine = read('src/features/sekret/companionEngine.ts');
const requestBuilder = read('src/services/ai/buildReplyRequest.ts');
const chatService = read('src/services/ai/chat.ts');
const worker = read('worker/sekret-reply.ts');

test('Oracle builds a bounded companion context from structured understandings', () => {
  assert.match(oracleDiscovery, /export function buildOracleContext/);
  assert.match(oracleDiscovery, /\.slice\(0, 8\)/);
  assert.match(oracleDiscovery, /item\.dimension/);
  assert.match(oracleDiscovery, /item\.theory/);
});

test('the canonical companion route uses the shared reply request path', () => {
  assert.match(companionChat, /sendCompanionMessage\(/);
  assert.match(companionEngine, /buildReplyRequest\(/);
  assert.match(companionEngine, /oracleContext:\s*input\.oracleContext/);
  assert.match(requestBuilder, /resolveOracleContext/);
  assert.match(requestBuilder, /AsyncStorage\.getItem\('oracleProfile'\)/);
  assert.match(requestBuilder, /buildOracleContext\(profile, 'teen'\)/);
});

test('explicit Oracle context is bounded and takes precedence', () => {
  assert.match(requestBuilder, /if \(explicit\?\.length\)/);
  assert.match(requestBuilder, /\.slice\(0, 8\)/);
  assert.match(requestBuilder, /resolveOracleContext\(ctx\.oracleContext\)/);
});

test('chat transport sends Oracle context only inside the Worker memory payload', () => {
  assert.match(chatService, /oracleContext\?: string\[\]/);
  assert.match(chatService, /oracleContext && oracleContext\.length > 0/);
  assert.match(chatService, /memory:\s*\{[\s\S]*oracleContext/);
});

test('Worker limits and validates Oracle context before prompt use', () => {
  assert.match(worker, /function extractOracleContext/);
  assert.match(worker, /Array\.isArray\(raw\)/);
  assert.match(worker, /typeof item === 'string'/);
  assert.match(worker, /\.slice\(0, 8\)/);
});

test('Worker removes Oracle context from generic memory serialization', () => {
  assert.match(worker, /oracleContext:\s*_/);
  assert.match(worker, /JSON\.stringify\(rest\)/);
});

test('companion prompt treats Oracle knowledge as hidden guidance, not quoted content', () => {
  assert.ok(worker.includes("WHAT SE'KRET KNOWS ABOUT THIS PERSON"));
  assert.ok(worker.includes('use subtly, never quote directly'));
  assert.match(worker, /oracleInsights\.map/);
  assert.match(worker, /oracleNote/);
});

test('Oracle context is omitted when there are no understandings', () => {
  assert.match(requestBuilder, /if \(!raw\) return \[\]/);
  assert.match(requestBuilder, /oracleContext\.length > 0 \? \{ oracleContext \} : \{\}/);
  assert.match(worker, /oracleInsights\.length > 0/);
});
